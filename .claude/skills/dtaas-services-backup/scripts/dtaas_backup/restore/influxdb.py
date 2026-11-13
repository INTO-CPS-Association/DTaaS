"""Restore influxdb: let the image finish its first-time setup, run `influx restore --full` from a throwaway
container with the backup mounted (no stdin), then give the CLI the source operator token
(config/influxdb/influx-configs), because the full restore replaces all users, orgs and tokens."""
from __future__ import annotations

from .core import RestoreContext, RestoreError

SVC = "influxdb"


def influx(ctx: RestoreContext, *args: str, check: bool = True) -> str:
    return ctx.docker.out("exec", ctx.container(SVC), "influx", *args, "--skip-verify", check=check)


def check(ctx: RestoreContext) -> list[str]:
    problems = []
    d = ctx.backup / SVC
    if not list((d / "backup").glob("*.manifest")):
        problems.append("influxdb/backup/*.manifest missing in the backup")
    if not (d / "influx-configs").is_file():
        problems.append("influxdb/influx-configs (source operator token) missing in the backup")
    return problems


def restore(ctx: RestoreContext) -> None:
    ctx.cli("start", SVC)
    ctx.wait("influxdb first-time setup", lambda: ctx.run_docker(
        "exec", ctx.container(SVC), "influx", "org", "list", "--skip-verify").returncode == 0, timeout=300)
    ctx.confirm("Run `influx restore --full`? It replaces ALL InfluxDB users, orgs, tokens and data on the target.")
    if ctx.opts.dry_run:
        ctx.log("[dry-run] would run influx restore --full and install the source operator token")
        return
    # keep the target's own CLI config (setup token) as a checkpoint
    keep = ctx.checkpoint_dir("influxdb-target-config")
    ctx.docker.out("cp", f"{ctx.container(SVC)}:/etc/influxdb2/influx-configs", str(keep / "influx-configs"), check=False)
    ctx.log("influxdb: running influx restore --full (can take long for large data)")
    ctx.docker.to_log(["run", "--rm", "--network", f"container:{ctx.container(SVC)}",
                       "--volumes-from", f"{ctx.container(SVC)}:ro",
                       "-v", f"{(ctx.backup / SVC / 'backup').resolve()}:/backup:ro",
                       "--entrypoint", "influx", ctx.image(SVC), "restore", "--full", "--skip-verify", "/backup"],
                      ctx.log_path)
    # The setup token is gone now; the CLI (dtaas-services user add, influx ...) needs the source token.
    ctx.copy_in(SVC, ctx.backup / SVC / "influx-configs", "/etc/influxdb2/influx-configs")
    if ctx.run_docker("exec", ctx.container(SVC), "influx", "org", "list", "--skip-verify").returncode != 0:
        raise RestoreError("influxdb: the source operator token does not work after the restore")
    ctx.note("influxdb: config/influxdb/influx-configs now holds the SOURCE operator token "
             f"(the target's setup config is in {keep.relative_to(ctx.run_dir)})")


def col(line: str, i: int) -> str:
    """Column i of tab-separated influx CLI output ('' if absent)."""
    f = line.split("\t")
    return f[i].strip() if len(f) > i else ""


def verify(ctx: RestoreContext) -> list[str]:
    if ctx.opts.dry_run:
        return []
    d = ctx.backup / SVC
    problems = []
    exp_orgs = {col(l, 1) for l in (d / "orgs.txt").read_text().splitlines() if col(l, 1)}
    orgs_now = [(col(l, 0), col(l, 1)) for l in influx(ctx, "org", "list", "--hide-headers").splitlines() if col(l, 1)]
    problems += [f"org missing: {o}" for o in sorted(exp_orgs - {n for _, n in orgs_now})]
    exp_b = {(col(l, 0), col(l, 2)) for l in (d / "buckets.txt").read_text().splitlines() if col(l, 2)}
    now_b = set()
    for oid, oname in orgs_now:
        for b in influx(ctx, "bucket", "list", "--hide-headers", "--org-id", oid).splitlines():
            if col(b, 1):
                now_b.add((oname, col(b, 1)))
    problems += [f"bucket missing: {o}/{b}" for o, b in sorted(exp_b - now_b)]
    exp_u = {col(l, 1) for l in (d / "users.txt").read_text().splitlines() if col(l, 1)}
    now_u = {col(l, 1) for l in influx(ctx, "user", "list", "--hide-headers").splitlines() if col(l, 1)}
    problems += [f"user missing: {u}" for u in sorted(exp_u - now_u)]
    ctx.log(f"influxdb: verified {len(exp_orgs)} orgs, {len(exp_b)} buckets, {len(exp_u)} users"
            + (f"; {len(problems)} problem(s)" if problems else ": OK"))
    return problems
