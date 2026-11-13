"""Restore postgres: roles, then every database dump (with owner, ACL, settings via --create).
When thingsboard is restored too, its database comes from thingsboard/db (own copy), not from here."""
from __future__ import annotations

from pathlib import Path

from .core import RestoreContext, RestoreError, compare_lines

SVC = "postgres"


def user(ctx: RestoreContext) -> str:
    return ctx.docker.env(ctx.container(SVC)).get("POSTGRES_USER") or ctx.env.get("POSTGRES_USER", "")


def psql(ctx: RestoreContext, sql: str, db: str = "postgres", check: bool = True) -> str:
    return ctx.docker.out("exec", ctx.container(SVC), "psql", "-U", user(ctx), "-d", db, "-XAtqc", sql, check=check)


def ready(ctx: RestoreContext) -> bool:
    return ctx.docker.out("exec", ctx.container(SVC), "pg_isready", "-U", user(ctx), check=False).find("accepting") >= 0


def start(ctx: RestoreContext) -> None:
    if SVC in ctx.started:
        return
    if ctx.opts.dry_run or not ctx.docker.running(ctx.container(SVC)):
        ctx.cli("start", SVC)
    ctx.wait("postgres", lambda: ready(ctx), timeout=180)


def load_globals(ctx: RestoreContext, sql_file: Path) -> None:
    """Roles with password hashes. 'already exists' for the image's POSTGRES_USER is expected."""
    ctx.copy_in(SVC, sql_file, "/tmp/globals.sql")
    if ctx.opts.dry_run:
        return
    p = ctx.run_docker("exec", ctx.container(SVC), "psql", "-U", user(ctx), "-d", "postgres",
                       "-X", "-q", "-f", "/tmp/globals.sql")
    err = p.stderr.decode("utf-8", "replace")
    ctx._append_log(p.stdout + p.stderr)
    errs = [l for l in err.splitlines() if "ERROR" in l and "already exists" not in l]
    if errs:
        raise RestoreError("loading roles failed: " + "; ".join(errs[:3]))
    ctx.log(f"postgres: roles loaded from {sql_file.parent.parent.name}/{sql_file.parent.name}/{sql_file.name}")


def db_exists(ctx: RestoreContext, db: str) -> bool:
    return psql(ctx, f"select 1 from pg_database where datname = '{db}'").strip() == "1"


def db_is_empty(ctx: RestoreContext, db: str) -> bool:
    n = psql(ctx, "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace "
                  "where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' "
                  "and c.relkind in ('r','p','v','m','S')", db).strip()
    return n == "0"


def restore_db(ctx: RestoreContext, dump: Path) -> None:
    """pg_restore --create into a database that doesn't exist yet (or is the image's empty POSTGRES_DB)."""
    db = dump.stem
    if not ctx.opts.dry_run and db_exists(ctx, db):
        if not db_is_empty(ctx, db):
            raise RestoreError(f"database '{db}' already exists on the target and is not empty; not overwriting it")
        ctx.confirm(f"Drop the empty database '{db}' (created by the image) and restore it from {dump.name}?")
        ctx.docker.out("exec", ctx.container(SVC), "dropdb", "-U", user(ctx), db)
    else:
        ctx.confirm(f"Restore database '{db}' from {dump.parent.parent.name}/db/{dump.name}?")
    ctx.copy_in(SVC, dump, f"/tmp/{dump.name}")
    if ctx.opts.dry_run:
        return
    ctx.docker.to_log(["exec", ctx.container(SVC), "pg_restore", "-U", user(ctx), "-d", "postgres", "--create",
                       "--exit-on-error", "-j", "4", f"/tmp/{dump.name}"], ctx.log_path)
    ctx.docker.out("exec", ctx.container(SVC), "rm", "-f", f"/tmp/{dump.name}", check=False)
    ctx.log(f"postgres: database '{db}' restored")


def analyze(ctx: RestoreContext, db: str | None = None) -> None:
    if ctx.opts.dry_run:
        return
    args = ["exec", ctx.container(SVC), "vacuumdb", "-U", user(ctx), "--analyze-in-stages"]
    args += ["-d", db] if db else ["--all"]
    ctx.docker.to_log(args, ctx.log_path)


def check(ctx: RestoreContext) -> list[str]:
    problems = []
    if not (ctx.backup / SVC / "db" / "globals.sql").is_file():
        problems.append("postgres/db/globals.sql missing in the backup")
    return problems


def restore(ctx: RestoreContext) -> None:
    d = ctx.backup / SVC / "db"
    start(ctx)
    load_globals(ctx, d / "globals.sql")
    for dump in sorted(d.glob("*.dump")):
        if dump.stem == "thingsboard" and "thingsboard" in ctx.selected:
            ctx.log("postgres: skipping postgres/db/thingsboard.dump (restored from thingsboard/db/ instead)")
            continue
        restore_db(ctx, dump)
    analyze(ctx)


def verify(ctx: RestoreContext) -> list[str]:
    if ctx.opts.dry_run:
        return []
    meta = ctx.backup / SVC / "meta"
    problems = []
    missing, _ = compare_lines(meta / "roles.txt",
                               psql(ctx, "select rolname, rolsuper, rolcanlogin from pg_roles where rolname !~ '^pg_' order by 1"))
    problems += [f"role missing or different: {l.split('|')[0]}" for l in missing]
    restored = {p.stem for p in (ctx.backup / SVC / "db").glob("*.dump")}
    if "thingsboard" in ctx.selected:
        restored.discard("thingsboard")   # verified by the thingsboard module
    acl_now = psql(ctx, "select datname, pg_get_userbyid(datdba), coalesce(datacl::text,'<default>') "
                        "from pg_database where not datistemplate order by 1")
    exp = [l for l in (meta / "database-acls.txt").read_text().splitlines() if l.split("|")[0] in restored]
    now = {l for l in acl_now.splitlines() if l.split("|")[0] in restored}
    problems += [f"database owner/ACL differs: {l.split('|')[0]}" for l in exp if l not in now]
    ctx.log(f"postgres: verified roles and owner/ACL of {', '.join(sorted(restored)) or 'no databases'}"
            + (f"; {len(problems)} problem(s)" if problems else ": OK"))
    return problems
