"""Command line: estimate | backup | verify. Runs on Linux, macOS and Windows (Python >= 3.10, stdlib only)."""
from __future__ import annotations

import argparse
import datetime
import os
import shutil
import sys
import time
from pathlib import Path

from . import services
from .common import (INCOMPLETE, SUMS, BackupError, Context, Docker, IS_WINDOWS, copy_by_hand_hint,
                     finalize_permissions, host_path, human, local_hostname, same_host, secure_dir,
                     verify_sums, write_sums, write_text)

DEFAULT_ROOT = Path(__file__).resolve().parents[5] / "backups"   # <project>/.claude/skills/<skill>/scripts/dtaas_backup
PROJECT_FILES = ["config/services.env", "config/.env", ".env", "config/credentials.csv", "credentials.csv",
                 "config/password.env.current", "config/gitlab_oauth.json"]


# ---------------------------------------------------------------- arguments
def parse(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="backup.py", description="Back up selected DTaaS platform services.")
    sub = p.add_subparsers(dest="cmd", required=True)

    def services_arg(sp):
        sp.add_argument("--services", required=True,
                        help=f"comma-separated list from {', '.join(services.ORDER)}, or 'all'")

    e = sub.add_parser("estimate", help="print the expected backup size per service; writes nothing")
    services_arg(e)
    e.add_argument("--backup-root", default=os.environ.get("BACKUP_ROOT", str(DEFAULT_ROOT)))

    b = sub.add_parser("backup", help="back up the listed services (online unless --stop-tb)")
    services_arg(b)
    b.add_argument("--target-host", required=True)
    b.add_argument("--source-host", default=local_hostname())
    b.add_argument("--backup-root", default=os.environ.get("BACKUP_ROOT", str(DEFAULT_ROOT)))
    b.add_argument("--stop-tb", action="store_true", help="stop ThingsBoard before any dump; leave it stopped")
    b.add_argument("--mongo-gzip", action="store_true", help="gzip the MongoDB archive")
    b.add_argument("--mongo-db", help="PARTIAL: dump only this MongoDB database")
    b.add_argument("--influx-bucket", help="PARTIAL: back up only ORG/BUCKET")

    v = sub.add_parser("verify", help="check a backup's checksums and completeness (on any computer)")
    v.add_argument("backup_dir")

    r = sub.add_parser("restore", help="restore the listed services into a dtaas-services project (on the target)")
    r.add_argument("backup_dir")
    r.add_argument("--services", required=True, help="comma-separated list, or 'all' (everything in the backup)")
    r.add_argument("--target-project", required=True, help="the dtaas-services project dir on this computer")
    r.add_argument("--target-host", required=True, help="must be this computer")
    r.add_argument("--dry-run", action="store_true", help="run every check and show the plan; change nothing")
    r.add_argument("--yes", action="store_true", help="confirm all steps (after the user approved the dry-run plan)")
    r.add_argument("--port", action="append", metavar="KEY=VALUE",
                   help="use this port instead of the source's (e.g. --port MONGODB_PORT=27017); repeatable")
    r.add_argument("--tb-image", help="ThingsBoard CE image for the upgrade (default thingsboard/tb-node:4.3.1.8; 4.4+ refused)")
    r.add_argument("--dtaas-cli", help="path to the dtaas-services command (default: found in the project's .venv or PATH)")
    return p.parse_args(argv)


def usage_error(msg: str) -> None:
    """Wrong arguments: exit code 2, like argparse."""
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(2)


def select(spec: str) -> list[str]:
    names = services.ORDER if spec.strip() == "all" else [s.strip() for s in spec.split(",") if s.strip()]
    if not names:
        usage_error("--services is empty")
    for s in names:
        if s not in services.ORDER:
            usage_error(f"unknown service '{s}' (valid: {', '.join(services.ORDER)}, all)")
    return [s for s in services.ORDER if s in names]


def containers() -> dict[str, str]:
    return {s: os.environ.get(f"{s.upper()}_CONTAINER", c) for s, c in services.DEFAULT_CONTAINERS.items()}


# ---------------------------------------------------------------- estimate
def cmd_estimate(a) -> int:
    selected = select(a.services)
    ctx = Context(Path(a.backup_root), selected, containers(), a)
    print(f"{'service':<12} {'image':<32} expected backup size")
    total = 0
    for s in selected:
        c = ctx.c(s)
        if not ctx.docker.running(c):
            print(f"{s:<12} {'-':<32} container '{c}' not running")
            continue
        n = services.load(s).estimate(ctx)
        total += n
        print(f"{s:<12} {ctx.docker.image(c):<32} {human(n)}")
    root = Path(a.backup_root)
    probe = root if root.exists() else root.parent
    print(f"TOTAL (approx.): {human(total)};  free in {probe}: {human(shutil.disk_usage(probe).free)}")
    return 0


# ---------------------------------------------------------------- backup
def service_meta(ctx: Context, s: str) -> None:
    c, dk, d = ctx.c(s), ctx.docker, ctx.dir(s)
    lab = lambda k: dk.label(c, f"com.docker.compose.{k}")
    i = dk.inspect(c, refresh=True)
    import json
    write_text(d / "service.txt", "".join(f"{k}={v}\n" for k, v in [
        ("container", c), ("image", dk.image(c)), ("status", i["State"]["Status"]),
        ("ports", json.dumps(i["HostConfig"].get("PortBindings") or {}, separators=(",", ":"))),
        ("compose_project", lab("project")), ("compose_service", lab("service")),
        ("compose_dir", lab("project.working_dir")), ("compose_files", lab("project.config_files"))]))
    write_text(d / "mounts.txt", "".join(f"{m.get('Type')} {m.get('Source')} -> {m.get('Destination')}\n"
                                         for m in dk.mounts(c)))
    (d / "docker-inspect.json").write_bytes(dk.raw("inspect", c))  # contains env passwords; dir is private
    save_project(ctx, c)


def save_project(ctx: Context, c: str) -> None:
    """Project-level config (compose files, env, credentials), saved once per install dir."""
    wd = ctx.docker.label(c, "com.docker.compose.project.working_dir")
    if not wd or wd in ctx.saved_projects:
        return
    src_dir = host_path(wd)
    if not src_dir.is_dir():
        ctx.warn(f"compose dir {wd} of {c} is not accessible from this computer; project config not saved")
        return
    ctx.saved_projects.add(wd)
    key = wd.strip("/\\").replace("/", "_").replace("\\", "_").replace(":", "")
    dst = ctx.out / "projects" / key
    dst.mkdir(parents=True, exist_ok=True)
    write_text(dst / "PROJECT_DIR", wd + "\n")
    for f in ctx.docker.label(c, "com.docker.compose.project.config_files").split(","):
        f = host_path(f.strip()) if f.strip() else None
        if f and f.is_file():
            try:
                shutil.copy2(f, dst / f.name)
            except OSError:
                ctx.warn(f"compose file {f} is not readable")
    for rel in PROJECT_FILES:
        src, out = src_dir / rel, dst / rel
        if not src.exists():
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copy2(src, out)
        except PermissionError:
            ctx.warn(f"{src} is not readable; copy it yourself, {copy_by_hand_hint(src, out)}")
    ctx.log(f"project config saved: {wd}")


def cmd_backup(a) -> int:
    selected = select(a.services)
    if a.stop_tb and "thingsboard" not in selected:
        usage_error("--stop-tb needs thingsboard in --services")
    if not same_host(a.source_host, local_hostname()):
        print(f"WARNING: --source-host '{a.source_host}' differs from hostname '{local_hostname()}'", file=sys.stderr)
    if not IS_WINDOWS:
        os.umask(0o077)

    root = Path(a.backup_root)
    root.mkdir(parents=True, exist_ok=True)
    while True:
        ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        out = root / ts
        try:
            out.mkdir()
            break
        except FileExistsError:
            time.sleep(1)
    ctx = Context(out, selected, containers(), a)
    warn_acl = secure_dir(out)
    write_text(out / INCOMPLETE, "Backup in progress or failed. Do not restore from this directory.\n")
    ctx.log_path = out / "backup.log"
    ctx.log_path.touch()
    if warn_acl:
        ctx.warn(warn_acl)

    try:
        ctx.log(f"Backup directory: {out}")
        ctx.log(f"Source host: {a.source_host} (hostname: {local_hostname()}); target host: {a.target_host}")
        ctx.log(f"Services: {' '.join(selected)}")
        dk = ctx.docker
        need = 0
        for s in selected:
            if s == "thingsboard":
                if not dk.running(ctx.c("postgres")):
                    raise BackupError(f"thingsboard needs the '{ctx.c('postgres')}' container running (its data is in Postgres)")
                if not dk.inspect(ctx.c("thingsboard")):
                    raise BackupError(f"container '{ctx.c('thingsboard')}' does not exist")
            elif not dk.running(ctx.c(s)):
                raise BackupError(f"container '{ctx.c(s)}' for {s} is not running")
            need += services.load(s).estimate(ctx)
        free = shutil.disk_usage(out).free
        ctx.log(f"Expected size: {human(need)}; free: {human(free)}")
        if free <= need + need // 10:
            raise BackupError(f"not enough free space in {root}")

        info = [f"timestamp={ts}", f"source_host={a.source_host}", f"hostname={local_hostname()}",
                f"target_host={a.target_host}", f"services={','.join(selected)}",
                f"platform={sys.platform}", f"python={sys.version.split()[0]}"]
        if a.mongo_db or a.influx_bucket:
            info.append(f"partial=mongo_db:{a.mongo_db or '-'} influx_bucket:{a.influx_bucket or '-'}")
        if a.stop_tb:
            tb = ctx.c("thingsboard")
            if dk.running(tb):
                ctx.log(f"Stopping {tb} before any dump (it will be left stopped)")
                dk.out("stop", "-t", "120", tb)
            else:
                ctx.log(f"{tb} already stopped")
            info.append("tb_stopped_for_backup=true")
        write_text(out / "info.txt", "\n".join(info) + "\n")

        for s in selected:
            ctx.log(f"=== {s}")
            service_meta(ctx, s)
            services.load(s).backup(ctx)

        (out / INCOMPLETE).unlink()
        write_sums(out)
        finalize_permissions(out)
    except (BackupError, KeyboardInterrupt) as e:
        msg = "interrupted" if isinstance(e, KeyboardInterrupt) else str(e)
        ctx.log(f"ERROR: {msg}")
        ctx.log(f"The backup at {out} is INCOMPLETE and must not be used.")
        return 1

    size = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    ctx.log(f"Done. Backup at {out} ({human(size)})")
    ctx.log(f"Copy to {a.target_host}, e.g.:  scp -r {out} {a.target_host}:<dest>/   (or rsync -a)")
    ctx.log(f"Verify there with:  python backup.py verify <dest>/{ts}")
    if a.stop_tb:
        ctx.log(f"NOTE: {ctx.c('thingsboard')} is STOPPED. 'docker start {ctx.c('thingsboard')}' if this was not the final cutover.")
    if ctx.warnings:
        ctx.log(f"----- {len(ctx.warnings)} warning(s):")
        for w in ctx.warnings:
            ctx.log(f"  {w}")
        ctx.log("Files copied by hand are not in SHA256SUMS.")
    return 0


# ---------------------------------------------------------------- verify
def cmd_verify(a) -> int:
    root = Path(a.backup_dir)
    if (root / INCOMPLETE).exists():
        print(f"FAIL: {root} is marked INCOMPLETE (the backup did not finish)")
        return 1
    if not (root / SUMS).is_file():
        print(f"FAIL: {root / SUMS} not found")
        return 1
    bad, ok, extra = verify_sums(root)
    for line in bad:
        print(line)
    for rel in extra:
        print(f"NOT IN SUMS (e.g. copied by hand)  {rel}")
    print(f"{len(ok)} file(s) OK, {len(bad)} problem(s), {len(extra)} file(s) not in {SUMS}")
    return 1 if bad else 0


def main(argv: list[str] | None = None) -> int:
    a = parse(sys.argv[1:] if argv is None else argv)
    try:
        if a.cmd == "restore":
            from .restore.run import run
            return run(a)
        return {"estimate": cmd_estimate, "backup": cmd_backup, "verify": cmd_verify}[a.cmd](a)
    except BackupError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
