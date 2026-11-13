"""`backup.py restore`: checks -> settings (credentials + ports) -> certs -> services in order -> report."""
from __future__ import annotations

import datetime
import os
import shutil
import socket
import sys
from pathlib import Path

from ..common import INCOMPLETE, SUMS, local_hostname, same_host, secure_dir, verify_sums, write_text
from . import grafana, influxdb, mongodb, postgres, rabbitmq, thingsboard
from .core import Aborted, RestoreContext, RestoreError, write_report
from .env import SOURCE_KEYS, proposed_port, read_env, risky_value, source_env, source_ports, source_project_dir, \
    source_services_env, write_env_updates

ORDER = ["postgres", "thingsboard", "rabbitmq", "grafana", "influxdb", "mongodb"]
MODULES = {"postgres": postgres, "thingsboard": thingsboard, "rabbitmq": rabbitmq, "grafana": grafana,
           "influxdb": influxdb, "mongodb": mongodb}
# per-service cert files the containers read (as created by `dtaas-services host setup`)
CERT_FILES = {"postgres": ["postgres.crt", "postgres.key"],
              "thingsboard": ["thingsboard-fullchain.pem", "thingsboard-privkey.pem"],
              "rabbitmq": ["fullchain.pem", "privkey-rabbitmq.pem"],
              "mongodb": ["combined.pem"],
              "influxdb": ["fullchain.pem", "privkey-influxdb.pem"],
              "grafana": ["fullchain.pem", "privkey.pem"]}
CERT_SCRIPT = r'''set -e
cd /c
[ -f fullchain.pem ] && [ -f privkey.pem ] || { echo "certs/fullchain.pem and certs/privkey.pem are required"; exit 1; }
install -o "$1" -g "$2" -m 644 fullchain.pem postgres.crt
install -o "$1" -g "$2" -m 600 privkey.pem postgres.key
install -o "$3" -g "$4" -m 644 fullchain.pem thingsboard-fullchain.pem
install -o "$3" -g "$4" -m 600 privkey.pem thingsboard-privkey.pem
install -o "$5" -m 600 privkey.pem privkey-rabbitmq.pem
cat privkey.pem fullchain.pem > combined.pem.tmp && chown "$6:$7" combined.pem.tmp && chmod 600 combined.pem.tmp && mv -f combined.pem.tmp combined.pem
install -o "$8" -g "$9" -m 600 privkey.pem privkey-influxdb.pem
chown "${10}:${11}" fullchain.pem privkey.pem && chmod 644 fullchain.pem && chmod 600 privkey.pem
ls -ln
'''


def select(spec: str, available: list[str]) -> list[str]:
    names = available if spec.strip() == "all" else [s.strip() for s in spec.split(",") if s.strip()]
    for s in names:
        if s not in ORDER:
            raise RestoreError(f"unknown service '{s}' (valid: {', '.join(ORDER)}, all)")
        if s not in available:
            raise RestoreError(f"'{s}' is not in this backup (it has: {', '.join(available)})")
    return [s for s in ORDER if s in names]


# ---------------------------------------------------------------- checks
def check_backup(backup: Path) -> tuple[dict, list[str]]:
    if not backup.is_dir():
        raise RestoreError(f"{backup} is not a directory")
    if (backup / INCOMPLETE).exists():
        raise RestoreError(f"{backup} is marked INCOMPLETE (the backup did not finish); refusing to restore")
    if not (backup / SUMS).is_file():
        raise RestoreError(f"{backup / SUMS} not found")
    bad, ok, _extra = verify_sums(backup)
    if bad:
        raise RestoreError(f"the backup fails verification ({len(bad)} problem(s), e.g. {bad[0]})")
    info = read_env(backup / "info.txt")
    return info, [s for s in info.get("services", "").split(",") if s]


def check_target(ctx: RestoreContext) -> list[str]:
    problems = []
    if not ctx.env_path.is_file():
        return [f"{ctx.env_path} not found: create the target with `dtaas-services project generate` first"]
    if not ctx.compose:
        return [f"no compose files in {ctx.project}"]
    for s in ctx.selected:
        try:
            ctx.svc(s)
        except RestoreError as e:
            problems.append(str(e))
            continue
        conflict = ctx.container_conflict(s)
        if conflict:
            problems.append(f"{s}: {conflict}")
        for d in ctx.data_dirs(s):
            why = ctx.unsafe_location(d)
            if why and why.startswith("warn:"):
                ctx.warn(f"{s}: data dir {d} is {why[5:]}")
            elif why:
                problems.append(f"{s}: data dir {d} is {why}")
        # thingsboard's data is in postgres; its own data dir only holds TB files, which are recreated
        if s != "thingsboard":
            full = [d for d in ctx.data_dirs(s) if not ctx.is_empty(d)]
            if full:
                problems.append(f"{s}: {', '.join(str(d) for d in full)} is not empty. The restore only writes into a "
                                f"fresh service. If the target data there may be destroyed, run "
                                f"`dtaas-services service clean -s {s}` first.")
        problems += [f"{s}: {p}" for p in MODULES[s].check(ctx)]
    if "thingsboard" in ctx.selected and "postgres" not in ctx.selected:
        conflict = ctx.container_conflict("postgres")
        if conflict:
            problems.append(f"thingsboard (its database is in postgres): {conflict}")
        for d in ctx.data_dirs("postgres"):
            why = ctx.unsafe_location(d)
            if why and not why.startswith("warn:"):
                problems.append(f"thingsboard (its database is in postgres): data dir {d} is {why}")
    return problems


def target_postgres_initialised(ctx: RestoreContext) -> bool:
    return any(not ctx.is_empty(d) for d in ctx.data_dirs("postgres"))


# ---------------------------------------------------------------- settings
def plan_settings(ctx: RestoreContext) -> tuple[dict[str, str], dict[str, tuple[str, str]], list[str]]:
    """(credential updates, port plan KEY -> (target value, proposed source value), notes)."""
    target = ctx.env
    creds: dict[str, str] = {}
    notes = []
    for s in ctx.selected:
        cenv, fenv = source_env(ctx.backup, s), source_services_env(ctx.backup, s)
        skip: set[str] = set()
        if s == "influxdb":
            chk = ctx.backup / "influxdb" / "credentials-check.txt"
            valid = read_env(chk).get("admin_credentials_valid")
            if not chk.is_file():
                notes.append("INFLUXDB_ADMIN_*: this backup predates the credential check; the source admin "
                             "user/password are used, but were not confirmed to still sign in")
            elif valid != "true":
                skip = {"INFLUXDB_ADMIN_USERNAME", "INFLUXDB_ADMIN_PASSWORD"}
                notes.append("INFLUXDB_ADMIN_USERNAME/PASSWORD: the source's no longer signed in at backup time; "
                             "the target values are kept. Set the current admin user/password in services.env by hand.")
        if s == "thingsboard" and "postgres" not in ctx.selected and target_postgres_initialised(ctx):
            skip |= {"POSTGRES_USER", "POSTGRES_PASSWORD"}
            notes.append("POSTGRES_USER/PASSWORD: the target postgres already has data, so its own user/password are "
                         "kept; the restored thingsboard database is owned by the source's user, which the roles "
                         "file adds")
        for key, sources in SOURCE_KEYS[s].items():
            if key in skip:
                continue
            for kind, name in sources:
                val = (cenv if kind == "env" else fenv).get(name)
                if val:
                    creds[key] = val
                    break
            else:
                notes.append(f"{key}: no source value in the backup; the target value is kept")
    if "grafana" in ctx.selected:
        notes.append("GRAFANA_ADMIN_*: taken from the source container's settings; if the admin password was later "
                     "changed in the Grafana UI, the restored database keeps that newer one")
    ports: dict[str, tuple[str, str]] = {}
    for s in ctx.selected:
        src = source_ports(ctx.backup, s)
        for key, cport, proto in ctx.svc(s).ports:
            prop = proposed_port(src, cport, proto)
            ports[key] = (target.get(key, ""), prop or target.get(key, ""))
    return creds, ports, notes


def confirm_ports(ctx: RestoreContext, ports: dict[str, tuple[str, str]]) -> dict[str, str]:
    """Source ports are proposed; the user confirms or gives new ones (--port KEY=VALUE, or interactively)."""
    chosen = {k: v[1] for k, v in ports.items()}
    for item in ctx.opts.port or []:
        k, _, v = item.partition("=")
        if k not in chosen:
            raise RestoreError(f"--port {k}: not a port setting of the selected services ({', '.join(sorted(chosen))})")
        chosen[k] = v
    ctx.log("Ports (setting: target default -> value to use; proposed = the source's port):")
    for k in sorted(chosen):
        tgt, prop = ports[k]
        tag = "given with --port" if chosen[k] != prop else ("source port" if prop != tgt else "same as target")
        ctx.log(f"  {k}: {tgt or '-'} -> {chosen[k]}   ({tag})")
    if ctx.opts.dry_run or ctx.opts.yes:
        return chosen
    if not sys.stdin.isatty():
        raise Aborted("the ports need confirmation: rerun with --yes (and --port KEY=VALUE for any change)")
    if input("Use these ports? [Y/n] ").strip().lower() in ("n", "no"):
        for k in sorted(chosen):
            new = input(f"  {k} [{chosen[k]}]: ").strip()
            if new:
                chosen[k] = new
    return chosen


def port_in_use(ctx: RestoreContext, port: str) -> str | None:
    """Name of another container publishing the host port, or 'another program' if something listens on it."""
    own = {ctx.container(s) for s in ctx.selected}
    out = ctx.docker.out("ps", "--format", "{{.Names}}\t{{.Ports}}", check=False)
    for line in out.splitlines():
        name, _, ports = line.partition("\t")
        if name in own:
            continue
        for part in ports.split(","):
            if f":{port}->" in part:
                return f"container '{name}'"
    try:
        with socket.create_connection(("127.0.0.1", int(port)), timeout=1):
            return "another program"
    except (OSError, ValueError):
        return None


def apply_settings(ctx: RestoreContext, creds: dict[str, str], ports: dict[str, str]) -> None:
    current = ctx.env
    updates = {**creds, **ports}
    changed = sorted(k for k, v in updates.items() if current.get(k) != v)
    ctx.log(f"services.env: {len(changed)} setting(s) to change: {', '.join(changed) or 'none'} (values not shown)")
    if not changed:
        return
    risky = [k for k in changed if risky_value(updates[k])]
    if risky:
        raise RestoreError(f"{', '.join(risky)}: the value contains both ' and $ (or `); docker compose and the "
                           "dtaas-services CLI would read it differently. Change that password on the source first.")
    ctx.confirm(f"Write these settings into {ctx.env_path} (a copy of the current file is kept)?")
    if ctx.opts.dry_run:
        return
    shutil.copy2(ctx.env_path, ctx.run_dir / "services.env.before-restore")
    write_env_updates(ctx.env_path, {k: updates[k] for k in changed})
    ctx.note(f"services.env updated ({len(changed)} settings); previous file: {ctx.run_dir.name}/services.env.before-restore")


def place_password_file(ctx: RestoreContext) -> None:
    """TB keys of the source's password.env.current (the CLI's record of live passwords) into the target's."""
    if "thingsboard" not in ctx.selected:
        return
    d = source_project_dir(ctx.backup, "thingsboard")
    src = d / "config" / "password.env.current" if d else None
    if not src or not src.is_file():
        ctx.warn("password.env.current is not in the backup (it was root-only on the source and not copied by hand); "
                 "`dtaas-services user reset-password -s thingsboard` will not know the current TB passwords")
        return
    vals = {k: v for k, v in read_env(src).items() if k.startswith("TB_")}
    dst = ctx.project / "config" / "password.env.current"
    ctx.log(f"password.env.current: setting {', '.join(sorted(vals))} (values not shown)")
    if ctx.opts.dry_run:
        return
    if dst.is_file():
        shutil.copy2(dst, ctx.run_dir / "password.env.current.before-restore")
        write_env_updates(dst, vals)
    else:
        write_text(dst, "# Auto-generated by dtaas-services. Do not edit manually.\n"
                        + "".join(f"{k}={v}\n" for k, v in vals.items()))
    if hasattr(os, "chmod"):
        os.chmod(dst, 0o600)


def prepare_certs(ctx: RestoreContext) -> None:
    certs = ctx.project / "certs"
    services = set(ctx.selected) | ({"postgres"} if "thingsboard" in ctx.selected else set())  # TB starts postgres
    need = sorted({f for s in services for f in CERT_FILES[s]})
    missing = [f for f in need if not (certs / f).is_file()]
    if not missing:
        ctx.log("certs: all files the selected services need are present")
        return
    if not ((certs / "fullchain.pem").is_file() and (certs / "privkey.pem").is_file()):
        raise RestoreError(f"certs: {', '.join(missing)} missing, and certs/fullchain.pem + certs/privkey.pem are not there "
                           f"to create them from. Put the TARGET host's certificate and key into {certs}.")
    ctx.confirm(f"Create the per-service cert files ({', '.join(missing)}) from certs/fullchain.pem + privkey.pem?")
    e = ctx.env
    ids = [e.get("POSTGRES_UID", "999"), e.get("POSTGRES_GID", "999"), e.get("THINGSBOARD_UID", "799"),
           e.get("THINGSBOARD_GID", "799"), e.get("RABBIT_UID", "999"), e.get("MONGO_UID", "999"),
           e.get("MONGO_GID", "999"), e.get("INFLUX_UID", "1000"), e.get("INFLUX_GID", "1000"),
           e.get("USERID", "0"), e.get("GROUPID", "0")]
    image = ctx.image(ctx.selected[0])
    ctx.as_root(image, [(certs, "/c", "rw")], CERT_SCRIPT, *ids)
    if not ctx.opts.dry_run:
        ctx.note("certs: per-service cert files created from fullchain.pem/privkey.pem (like `dtaas-services host setup`)")


# ---------------------------------------------------------------- main
def run(a) -> int:
    backup, project = Path(a.backup_dir).resolve(), Path(a.target_project).resolve()
    if not same_host(a.target_host, local_hostname()):
        print(f"ERROR: --target-host '{a.target_host}' is not this computer ('{local_hostname()}'); "
              "a restore runs on the target", file=sys.stderr)
        return 2
    try:
        info, available = check_backup(backup)
        selected = select(a.services, available)
    except RestoreError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    ctx = RestoreContext(backup, project, selected, a)
    if not a.dry_run:
        ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        ctx.run_dir = backup.parent / f"restore-{ts}"
        ctx.run_dir.mkdir()
        w = secure_dir(ctx.run_dir)
        write_text(ctx.run_dir / INCOMPLETE, "Restore in progress or failed.\n")
        ctx.log_path = ctx.run_dir / "restore.log"
        ctx.log_path.touch()
        if w:
            ctx.warn(w)
    results: dict[str, list[str]] = {}
    try:
        ctx.log(f"{'DRY RUN: nothing will be changed. ' if a.dry_run else ''}Restore of {', '.join(selected)}")
        ctx.log(f"Backup: {backup} (from {info.get('source_host', '?')}, {info.get('timestamp', '?')}); "
                f"target project: {project}")
        if info.get("partial"):
            ctx.warn(f"this backup is PARTIAL ({info['partial']})")
            ctx.confirm("Restore from a PARTIAL backup?")
        problems = check_target(ctx)
        if problems:
            for p in problems:
                ctx.log(f"PROBLEM: {p}")
            raise RestoreError(f"{len(problems)} problem(s) found before restoring; nothing was changed")
        ctx.log(f"Compose project: {ctx.compose_project_name()}; checks passed")

        creds, port_plan, notes = plan_settings(ctx)
        for n in notes:
            ctx.warn(n)
        ports = confirm_ports(ctx, port_plan)
        busy = [f"{k}={v} (used by {who})" for k, v in ports.items() if "-" not in v and (who := port_in_use(ctx, v))]
        if busy:
            raise RestoreError("ports already in use: " + "; ".join(busy) + ". Choose others with --port KEY=VALUE.")
        apply_settings(ctx, creds, ports)
        place_password_file(ctx)
        prepare_certs(ctx)

        for s in selected:
            ctx.log(f"=== {s}")
            MODULES[s].restore(ctx)
            results[s] = MODULES[s].verify(ctx)
    except (RestoreError, KeyboardInterrupt) as e:
        msg = "interrupted" if isinstance(e, KeyboardInterrupt) else str(e)
        ctx.log(f"ERROR: {msg}")
        if ctx.run_dir:
            ctx.log(f"The restore did not finish; log and checkpoints: {ctx.run_dir}")
        return 1

    # report
    src_ports = {}
    for s in selected:
        for spec, hosts in source_ports(backup, s).items():
            src_ports[f"{s} {spec}"] = ",".join(hosts)
    lines = [f"Restore {'(dry run) ' if a.dry_run else ''}of {', '.join(selected)} from {backup}",
             f"target project: {project}", ""]
    for s in selected:
        probs = results.get(s, [])
        status = "planned (dry run)" if a.dry_run else ("OK" if not probs else f"{len(probs)} problem(s)")
        lines.append(f"{s}: {status}")
        lines += [f"  - {p}" for p in probs]
    lines += ["", "Ports for clients (container port: source host port -> target host port):"]
    env = ctx.env if not a.dry_run else {**ctx.env, **ports}
    for s in selected:
        src = source_ports(backup, s)
        for key, cport, proto in ctx.svc(s).ports:
            lines.append(f"  {s} {cport}/{proto} ({key}): {proposed_port(src, cport, proto) or '-'} -> {env.get(key, '-')}")
    if ctx.notes:
        lines += ["", "Notes:"] + [f"  {n}" for n in ctx.notes]
    if ctx.warnings:
        lines += ["", "Warnings:"] + [f"  {w}" for w in ctx.warnings]
    for l in lines:
        print(l)
    if ctx.run_dir:
        write_report(ctx.run_dir / "report.txt", lines)
        (ctx.run_dir / INCOMPLETE).unlink()
        print(f"\nReport, log and checkpoints: {ctx.run_dir}")
    return 1 if any(results.values()) else 0
