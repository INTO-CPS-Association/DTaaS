"""thingsboard: TB files + verification data + its OWN dump of the `thingsboard` Postgres DB and the
roles, so thingsboard/ is self-contained and restorable without a postgres backup. When postgres is also
selected, that DB is dumped twice (once in postgres/, once here), by design.
The postgres container must be running (the DB lives there); the TB container may be stopped."""
from __future__ import annotations

import re
import tarfile

from ..common import Context, host_path, tree_size, write_text
from ._pg import pg, pg_acl_meta, pg_db_size, pg_dump_db, pg_dump_globals, psql

TABLES = ("tenant customer tb_user device asset dashboard entity_view rule_chain rule_node "
          "device_profile asset_profile widgets_bundle widget_type attribute_kv ts_kv_latest").split()


def tb_db(ctx: Context) -> str:
    url = ctx.docker.env(ctx.c("thingsboard")).get("SPRING_DATASOURCE_URL", "")
    m = re.search(r"/([^/?]+)(\?|$)", url.split("//", 1)[-1])
    return m.group(1) if m else "thingsboard"


def estimate(ctx: Context) -> int:
    data = ctx.docker.mount_src(ctx.c("thingsboard"), "/data")
    files = tree_size(host_path(data)) if data else 0
    return files + pg_db_size(ctx, f"datname = '{tb_db(ctx)}'")


def backup(ctx: Context) -> None:
    d = ctx.dir("thingsboard")
    meta = d / "meta"
    meta.mkdir(exist_ok=True)
    db = tb_db(ctx)
    tb, dk = ctx.c("thingsboard"), ctx.docker
    info = [f"database={db}"]

    # Exact counts of key TB tables, to compare after restore + upgrade.
    counts = []
    for t in TABLES:
        if psql(ctx, f"select to_regclass('public.{t}') is not null", db).strip() == "t":
            counts.append(f"{t}|{psql(ctx, f'select count(*) from public.{t}', db).strip()}")
    write_text(meta / "tb-counts.txt", "".join(c + "\n" for c in counts))
    try:
        schema = psql(ctx, "select * from tb_schema_settings", db)
    except Exception:
        schema = ""
    write_text(meta / "tb-schema-version.txt", schema)
    ctx.log(f"thingsboard: schema {schema.strip()}, counts: {' '.join(counts)} ")

    ctx.log(f"thingsboard: dumping roles + database '{db}' (own copy)")
    pg_dump_globals(ctx, d / "db")
    pg_dump_db(ctx, db, d / "db")
    pg_acl_meta(ctx, meta)
    info.append(f"database_dump=db/{db}.dump")
    write_text(meta / "tb-info.txt", "\n".join(info) + "\n")
    if ctx.is_selected("postgres"):
        ctx.log(f"thingsboard: note: postgres/db/{db}.dump is a second dump, taken a few seconds earlier")

    # TB data dir + TB cert files: through the TB container when it runs (files are uid 799, mode 600),
    # otherwise from the host (data dir) and through postgres when both mount the same certs dir.
    data_tar, certs_tar = d / "thingsboard-data.tar.gz", d / "certs.tar.gz"
    if dk.running(tb):
        dk.to_file(["exec", tb, "tar", "-C", "/", "--numeric-owner", "-czpf", "-", "data"], data_tar)
        try:
            dk.to_file(["exec", tb, "sh", "-c", "cd /certs && tar --numeric-owner -czpf - thingsboard-*.pem"], certs_tar)
        except Exception:
            certs_tar.unlink(missing_ok=True)
            ctx.warn("thingsboard: could not archive TB cert files")
        return
    src = host_path(dk.mount_src(tb, "/data"))
    try:
        with tarfile.open(data_tar, "w:gz") as t:
            t.add(src, arcname=src.name)
    except OSError as e:
        ctx.warn(f"thingsboard: could not fully archive the data dir {src}: {e}")
    if dk.mount_src(tb, "/certs") and dk.mount_src(tb, "/certs") == dk.mount_src(pg(ctx), "/etc/ssl"):
        try:
            dk.to_file(["exec", pg(ctx), "sh", "-c", "cd /etc/ssl && tar --numeric-owner -czpf - thingsboard-*.pem"], certs_tar)
        except Exception:
            certs_tar.unlink(missing_ok=True)
            ctx.warn("thingsboard: could not archive TB cert files")
    else:
        ctx.warn("thingsboard: TB is stopped and its certs dir is not shared with postgres; TB cert files not saved")
