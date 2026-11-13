"""Restore thingsboard: its own DB copy into the target postgres, then the tested CE upgrade
(4.2.x -> 4.3.1.8 in one step; 4.4+ converts CE to PE and is refused), then start and check.
See tb-postgres-migration SKILL.md section 3 for the manual procedure this automates."""
from __future__ import annotations

import json
import re
import shutil
import ssl
import urllib.error
import urllib.request
from pathlib import Path

from ..common import write_text
from . import postgres as pg
from .core import RestoreContext, RestoreError
from .env import read_env, set_compose_image

SVC = "thingsboard"
DEFAULT_IMAGE = "thingsboard/tb-node:4.3.1.8"
CHANGED_BY_UPGRADE = {"widgets_bundle", "widget_type"}   # system widget library is reloaded by the upgrade


def tag_version(image: str) -> tuple[int, ...]:
    m = re.search(r":(\d+(?:\.\d+)*)", image)
    return tuple(int(x) for x in m.group(1).split(".")) if m else ()


def counts(ctx: RestoreContext) -> dict[str, str]:
    out = {}
    for line in (ctx.backup / SVC / "meta" / "tb-counts.txt").read_text().splitlines():
        t = line.split("|")[0]
        out[t] = pg.psql(ctx, f"select count(*) from public.{t}", "thingsboard").strip()
    return out


def expected_counts(ctx: RestoreContext) -> dict[str, str]:
    return dict(l.split("|", 1) for l in (ctx.backup / SVC / "meta" / "tb-counts.txt").read_text().splitlines() if "|" in l)


def checkpoint(ctx: RestoreContext, name: str) -> Path:
    d = ctx.checkpoint_dir(name)
    ctx.docker.to_file(["exec", ctx.container("postgres"), "pg_dump", "-U", pg.user(ctx), "-Fc", "--create",
                        "-d", "thingsboard"], d / "thingsboard.dump")
    ctx.log(f"thingsboard: checkpoint saved: {d / 'thingsboard.dump'}")
    return d / "thingsboard.dump"


def back_to(ctx: RestoreContext, dump: Path) -> None:
    ctx.log(f"thingsboard: rolling the database back to {dump}")
    ctx.docker.out("exec", ctx.container("postgres"), "dropdb", "-U", pg.user(ctx), "--if-exists", "thingsboard")
    ctx.copy_in("postgres", dump, "/tmp/thingsboard-checkpoint.dump")
    ctx.docker.to_log(["exec", ctx.container("postgres"), "pg_restore", "-U", pg.user(ctx), "-d", "postgres",
                       "--create", "--exit-on-error", "/tmp/thingsboard-checkpoint.dump"], ctx.log_path)


def check(ctx: RestoreContext) -> list[str]:
    problems = []
    if not (ctx.backup / SVC / "db" / "thingsboard.dump").is_file():
        problems.append("thingsboard/db/thingsboard.dump missing in the backup")
    img = ctx.opts.tb_image or DEFAULT_IMAGE
    if tag_version(img) >= (4, 4):
        problems.append(f"{img}: ThingsBoard 4.4+ converts a CE database to PE; use a 4.3.x CE image (default {DEFAULT_IMAGE})")
    return problems


def is_ce_image(ctx: RestoreContext, image: str) -> bool:
    out = ctx.docker.out("run", "--rm", "--entrypoint", "ls", image, "/usr/share/thingsboard/data/upgrade", check=False)
    entries = set(out.split())
    if not entries:
        raise RestoreError(f"could not list the upgrade scripts in {image}")
    return "pe" not in entries


def upgrade(ctx: RestoreContext) -> None:
    image = ctx.opts.tb_image or DEFAULT_IMAGE
    src = (ctx.backup / SVC / "meta" / "tb-schema-version.txt").read_text().strip()
    ctx.log(f"thingsboard: source schema {src}; upgrade image {image}")
    if ctx.opts.dry_run:
        ctx.log(f"[dry-run] would check that {image} is CE, set it in compose.thingsboard.yml and run the upgrade")
        return
    if not is_ce_image(ctx, image):
        raise RestoreError(f"{image} contains PE upgrade scripts (unified/PE image); refusing to upgrade a CE database")
    compose_file = ctx.project / "compose.thingsboard.yml"
    shutil.copy2(compose_file, ctx.run_dir / "compose.thingsboard.yml.bak")
    old = set_compose_image(compose_file, "thingsboard-ce", image)
    ctx.note(f"compose.thingsboard.yml: image {old} -> {image} (previous file in {ctx.run_dir.name}/compose.thingsboard.yml.bak)")
    before = checkpoint(ctx, "01-thingsboard-restored")
    ctx.confirm(f"Run the ThingsBoard schema upgrade to {image} on the restored database?")
    ctx.log("thingsboard: running the upgrade (several minutes)")
    p = ctx.compose_cmd("run", "--rm", "-e", "UPGRADE_TB=true", "thingsboard-ce")
    text = (p.stdout + p.stderr).decode("utf-8", "replace")
    write_text(ctx.run_dir / "thingsboard-upgrade.log", text)
    schema = pg.psql(ctx, "select * from tb_schema_settings", "thingsboard").strip()
    failed = p.returncode != 0 or "Upgrade finished successfully" not in text
    if "CE to PE" in text or schema.endswith("|PE") or failed:
        back_to(ctx, before)
        why = "it converted the database to PE" if ("CE to PE" in text or schema.endswith("|PE")) else "it failed"
        raise RestoreError(f"ThingsBoard upgrade: {why} (log: {ctx.run_dir / 'thingsboard-upgrade.log'}); "
                           f"the database was rolled back to the restored state")
    ctx.note(f"thingsboard: upgraded, schema {schema}")
    checkpoint(ctx, "02-thingsboard-upgraded")


def tb_login(ctx: RestoreContext, email: str, password: str) -> str:
    port = ctx.env.get("THINGSBOARD_PORT", "8089")
    req = urllib.request.Request(f"https://localhost:{port}/api/auth/login",
                                 data=json.dumps({"username": email, "password": password}).encode(),
                                 headers={"Content-Type": "application/json"})
    sc = ssl.create_default_context()
    sc.check_hostname, sc.verify_mode = False, ssl.CERT_NONE
    try:
        with urllib.request.urlopen(req, context=sc, timeout=20) as r:
            return str(r.status)
    except urllib.error.HTTPError as e:
        return str(e.code)
    except Exception as e:
        return f"error: {type(e).__name__}"


def restore(ctx: RestoreContext) -> None:
    d = ctx.backup / SVC / "db"
    if ctx.docker.running(ctx.container(SVC)):
        raise RestoreError("the target ThingsBoard container is running; it must not run during the restore")
    pg.start(ctx)
    if "postgres" not in ctx.selected:
        pg.load_globals(ctx, d / "globals.sql")
    pg.restore_db(ctx, d / "thingsboard.dump")
    pg.analyze(ctx, "thingsboard")
    if not ctx.opts.dry_run:
        exp, now = expected_counts(ctx), counts(ctx)
        bad = [t for t in exp if exp[t] != now.get(t)]
        if bad:
            raise RestoreError(f"thingsboard: counts differ right after the restore: {', '.join(bad)}")
        ctx.log(f"thingsboard: all {len(exp)} counts match the backup")
    uid, gid = ctx.env.get("THINGSBOARD_UID", "799"), ctx.env.get("THINGSBOARD_GID", "799")
    ctx.as_root(ctx.image("postgres"), [(ctx.project / "data", "/d", "rw"), (ctx.project / "log", "/l", "rw")],
                'mkdir -p /d/thingsboard /l/thingsboard && chown -R "$1:$2" /d/thingsboard /l/thingsboard', uid, gid)
    upgrade(ctx)
    ctx.cli("start", SVC)

    def started() -> bool:
        p = ctx.run_docker("logs", ctx.container(SVC))
        return b"Started ThingsboardServerApplication" in p.stdout + p.stderr

    ctx.wait("ThingsBoard to start", started, timeout=900, interval=10)


def verify(ctx: RestoreContext) -> list[str]:
    if ctx.opts.dry_run:
        return []
    problems = []
    exp, now = expected_counts(ctx), counts(ctx)
    for t in exp:
        if t not in CHANGED_BY_UPGRADE and exp[t] != now.get(t):
            problems.append(f"count differs after upgrade: {t} {exp[t]} -> {now.get(t)}")
    schema = pg.psql(ctx, "select * from tb_schema_settings", "thingsboard").strip()
    if not schema.endswith("|CE"):
        problems.append(f"schema is not CE: {schema}")
    pw = read_env(ctx.project / "config" / "password.env.current")
    env = ctx.env
    sys_pw = pw.get("TB_SYSADMIN_CURRENT_PASSWORD") or env.get("TB_SYSADMIN_NEW_PASSWORD", "")
    st = tb_login(ctx, env.get("TB_SYSADMIN_EMAIL", ""), sys_pw)
    ctx.note(f"thingsboard: sysadmin login -> HTTP {st}" + ("" if st == "200" else " (password.env.current may be missing or out of date)"))
    ten_pw = pw.get("TB_TENANT_ADMIN_CURRENT_PASSWORD") or env.get("TB_TENANT_ADMIN_PASSWORD", "")
    st2 = tb_login(ctx, env.get("TB_TENANT_ADMIN_EMAIL", ""), ten_pw)
    ctx.note(f"thingsboard: tenant admin login -> HTTP {st2}" + ("" if st2 == "200" else " (the password may have been changed in the UI on the source)"))
    ctx.log(f"thingsboard: verified counts and schema" + (f"; {len(problems)} problem(s)" if problems else ": OK"))
    return problems
