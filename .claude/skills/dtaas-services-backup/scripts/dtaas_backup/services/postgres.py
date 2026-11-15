"""postgres: roles + every non-template database (thingsboard, swim, ...), as logical dumps."""
from __future__ import annotations

from ..common import Context, write_text
from ._pg import pg, pg_acl_meta, pg_db_size, pg_dump_db, pg_dump_globals, pg_user, psql, psql_to


def estimate(ctx: Context) -> int:
    return pg_db_size(ctx, "not datistemplate and datname <> 'postgres'")


def backup(ctx: Context) -> None:
    d = ctx.dir("postgres")
    meta, dbdir = d / "meta", d / "db"
    meta.mkdir(exist_ok=True)
    dk = ctx.docker
    write_text(meta / "versions.txt",
               f"server_version={psql(ctx, 'show server_version').strip()}\n"
               f"pg_dump_version={dk.out('exec', pg(ctx), 'pg_dump', '--version').strip()}\n"
               f"pg_user={pg_user(ctx)}\n")
    psql_to(ctx, meta / "databases.txt",
            "select datname, pg_encoding_to_char(encoding), datcollate, datctype, "
            "pg_size_pretty(pg_database_size(datname)) from pg_database order by 1")
    psql_to(ctx, meta / "settings.txt",
            "select name, setting from pg_settings where source not in ('default','override') order by 1")
    write_text(meta / "pg_hba.conf", dk.sh(pg(ctx), 'cat "$PGDATA/pg_hba.conf"', check=False))
    pg_acl_meta(ctx, meta)

    dbs = psql(ctx, "select datname from pg_database where not datistemplate and datname <> 'postgres' order by 1").split()
    ctx.log(f"postgres: databases: {' '.join(dbs)}")
    for db in dbs:
        psql_to(ctx, meta / f"extensions.{db}.txt", "select extname, extversion from pg_extension order by 1", db)
        psql_to(ctx, meta / f"table-estimates.{db}.txt",
                "select schemaname||'.'||relname, n_live_tup from pg_stat_user_tables order by 1", db)

    ctx.log("postgres: dumping globals (roles, tablespaces)")
    pg_dump_globals(ctx, dbdir)
    for db in dbs:
        pg_dump_db(ctx, db, dbdir)

    # Only the cert files postgres uses (certs/ is mounted at /etc/ssl; the key is root/postgres-only on the host).
    certs = d / "certs.tar.gz"
    try:
        dk.to_file(["exec", pg(ctx), "tar", "-C", "/etc/ssl", "--numeric-owner", "-czpf", "-",
                    "postgres.crt", "postgres.key"], certs)
    except Exception:
        certs.unlink(missing_ok=True)
        ctx.warn("postgres: could not archive postgres.crt/key")
