"""influxdb: full `influx backup` (all orgs, buckets, users, tokens, dashboards), online.
The CLI runs in a throwaway container of the same image that shares the server's network namespace
and /etc/influxdb2 (operator token), writing straight into the backup dir (a bind mount)."""
from __future__ import annotations

import json
import os
from pathlib import Path

from ..common import BackupError, Context, du_h, write_text

LIST_BUCKETS = ('influx org list --skip-verify --hide-headers | while read id name; do '
                'influx bucket list --skip-verify --hide-headers --org-id "$id" | '
                'awk -v o="$name" \'{print o "\\t" $0}\'; done')


def estimate(ctx: Context) -> int:
    """On-disk TSM + metadata; `influx backup` gzips, so the result is usually smaller."""
    out = ctx.docker.sh(ctx.c("influxdb"),
                        "du -sb /var/lib/influxdb2/engine/data /var/lib/influxdb2/influxd.bolt "
                        "/var/lib/influxdb2/influxd.sqlite 2>/dev/null", check=False)
    return sum(int(line.split()[0]) for line in out.splitlines() if line.strip())


def check_manifest(backup_dir: Path) -> int:
    """Every file named in the *.manifest files exists with the recorded size. Returns files checked."""
    manifests = sorted(backup_dir.glob("*.manifest"))
    if not manifests:
        raise BackupError(f"influxdb: no manifest in {backup_dir}")
    checked = 0

    def walk(node):
        nonlocal checked
        if isinstance(node, dict):
            if "fileName" in node:
                f = backup_dir / node["fileName"]
                if not f.is_file():
                    raise BackupError(f"influxdb: {f.name} is in the manifest but missing")
                if "size" in node and f.stat().st_size != int(node["size"]):
                    raise BackupError(f"influxdb: {f.name} has size {f.stat().st_size}, manifest says {node['size']}")
                checked += 1
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    for m in manifests:
        walk(json.loads(m.read_text(encoding="utf-8")))
    return checked


SIGNIN = 'curl -sk -o /dev/null -w "%{http_code}" -u "$DOCKER_INFLUXDB_INIT_USERNAME:$DOCKER_INFLUXDB_INIT_PASSWORD" -X POST https://localhost:8086/api/v2/signin'


def check_admin_credentials(ctx: Context, d: Path) -> None:
    """The admin user/password in the container env (DOCKER_INFLUXDB_INIT_*, saved in docker-inspect.json;
    the same as INFLUXDB_ADMIN_* in a dtaas-services services.env) are only applied at first setup. Test
    whether they still sign in, and record only the result (never the credentials)."""
    code = ctx.docker.sh(ctx.c("influxdb"), SIGNIN, check=False).strip()
    valid = code == "204"
    write_text(d / "credentials-check.txt",
               f"admin_credentials_valid={'true' if valid else 'false'}\n"
               f"source=container env DOCKER_INFLUXDB_INIT_USERNAME/PASSWORD (see docker-inspect.json)\n"
               f"signin_http_status={code or 'n/a'}\n")
    if valid:
        ctx.log("influxdb: admin credentials in the container env are current (sign-in ok)")
    else:
        ctx.warn(f"influxdb: the admin credentials in the container env no longer sign in (HTTP {code or 'n/a'}); "
                 "the current admin password is not in the backup")


def backup(ctx: Context) -> None:
    d = ctx.dir("influxdb")
    c, dk = ctx.c("influxdb"), ctx.docker
    check_admin_credentials(ctx, d)
    write_text(d / "orgs.txt", dk.out("exec", c, "influx", "org", "list", "--skip-verify", "--hide-headers"))
    write_text(d / "buckets.txt", dk.sh(c, LIST_BUCKETS))
    write_text(d / "users.txt", dk.out("exec", c, "influx", "user", "list", "--skip-verify", "--hide-headers", check=False))
    write_text(d / "influx-configs", dk.out("exec", c, "cat", "/etc/influxdb2/influx-configs"))  # operator token
    n_orgs = len((d / "orgs.txt").read_text().splitlines())
    n_buckets = len((d / "buckets.txt").read_text().splitlines())

    cmd, argv = "influx backup --skip-verify", []
    if ctx.opts.influx_bucket:  # partial backup: ORG/BUCKET, passed as $1/$2 (no quoting issues)
        org, _, bucket = ctx.opts.influx_bucket.partition("/")
        cmd += ' --org "$1" --bucket "$2"'
        argv = [org, bucket]
        ctx.log(f"influxdb: PARTIAL backup of {org}/{bucket} only")
    cmd += " /backup"
    if hasattr(os, "getuid"):  # hand the files to the current user (no-op meaning on Windows)
        cmd += f" && chown -R {os.getuid()}:{os.getgid()} /backup"
    ctx.log(f"influxdb: {n_orgs} orgs, {n_buckets} buckets; running 'influx backup' (online)")
    out = d / "backup"
    out.mkdir(exist_ok=True)
    dk.to_log(["run", "--rm", "--network", f"container:{c}", "--volumes-from", f"{c}:ro",
               "-v", f"{out.resolve()}:/backup", "--entrypoint", "sh", dk.image(c), "-c", cmd, "sh", *argv],
              ctx.log_path)
    checked = check_manifest(out)
    ctx.log(f"influxdb: {du_h(out)}, {sum(1 for _ in out.iterdir())} files, manifest ok ({checked} entries)")
