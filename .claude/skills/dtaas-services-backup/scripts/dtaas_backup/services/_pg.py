"""Shared PostgreSQL helpers for the postgres and thingsboard modules."""
from __future__ import annotations

from pathlib import Path

from ..common import BackupError, Context, du_h, write_text


def pg(ctx: Context) -> str:
    return ctx.c("postgres")


def pg_user(ctx: Context) -> str:
    user = ctx.docker.env(pg(ctx)).get("POSTGRES_USER", "")
    if not user:
        raise BackupError(f"could not read POSTGRES_USER from container {pg(ctx)}")
    return user


def psql(ctx: Context, sql: str, db: str = "postgres") -> str:
    """psql over the container's local socket (no password needed in the official image)."""
    return ctx.docker.out("exec", pg(ctx), "psql", "-U", pg_user(ctx), "-d", db, "-XAtqc", sql)


def psql_to(ctx: Context, path: Path, sql: str, db: str = "postgres") -> None:
    write_text(path, psql(ctx, sql, db))


def pg_db_size(ctx: Context, where: str) -> int:
    return int(psql(ctx, f"select coalesce(sum(pg_database_size(datname)),0) from pg_database where {where}").strip() or 0)


def pg_dump_globals(ctx: Context, d: Path) -> None:
    """Roles (with password hashes) and tablespaces."""
    d.mkdir(parents=True, exist_ok=True)
    ctx.docker.to_file(["exec", pg(ctx), "pg_dumpall", "-U", pg_user(ctx), "--globals-only"], d / "globals.sql")


def pg_dump_db(ctx: Context, db: str, d: Path) -> None:
    """One DB as a --create custom-format archive (owner, ACL, ALTER DATABASE settings),
    validated by listing its TOC. `pg_restore -l` hides DATABASE/ACL entries without --create."""
    d.mkdir(parents=True, exist_ok=True)
    dump, toc = d / f"{db}.dump", d / f"{db}.toc"
    ctx.docker.to_file(["exec", pg(ctx), "pg_dump", "-U", pg_user(ctx), "-d", db, "-Fc", "-Z", "6", "--create"], dump)
    try:
        ctx.docker.to_file(["exec", "-i", pg(ctx), "pg_restore", "--list", "--create"], toc, stdin_path=dump)
    except BackupError as e:
        raise BackupError(f"postgres: dump of {db} failed validation: {e}") from e
    text = toc.read_text(encoding="utf-8", errors="replace")
    if f" DATABASE - {db} " not in text:
        raise BackupError(f"postgres: dump of {db} has no DATABASE entry")
    ctx.log(f"  {db}.dump: {du_h(dump)}, {text.count('TABLE DATA')} table-data entries")


def pg_acl_meta(ctx: Context, m: Path) -> None:
    """Database owner/ACL, per-db/role settings, role memberships, roles: for verification after restore."""
    psql_to(ctx, m / "database-acls.txt",
            "select datname, pg_get_userbyid(datdba), coalesce(datacl::text,'<default>') "
            "from pg_database where not datistemplate order by 1")
    psql_to(ctx, m / "db-role-settings.txt",
            "select coalesce(d.datname,'*'), coalesce(r.rolname,'*'), s.setconfig "
            "from pg_db_role_setting s left join pg_database d on d.oid=s.setdatabase "
            "left join pg_roles r on r.oid=s.setrole order by 1,2")
    psql_to(ctx, m / "role-memberships.txt",
            "select r.rolname, m.rolname from pg_auth_members a join pg_roles r on r.oid=a.roleid "
            "join pg_roles m on m.oid=a.member where r.rolname !~ '^pg_' order by 1,2")
    psql_to(ctx, m / "roles.txt",
            "select rolname, rolsuper, rolcanlogin from pg_roles where rolname !~ '^pg_' order by 1")
