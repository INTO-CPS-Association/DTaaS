"""grafana: the whole /var/lib/grafana (grafana.db SQLite + plugins, csv/pdf/png), read through the
container because grafana.db is root-only on the host. A hot copy of SQLite can catch a write in
progress, so grafana.db is integrity-checked and the copy retried."""
from __future__ import annotations

import shutil
import sqlite3
import tarfile
import time
from pathlib import Path

from ..common import BackupError, Context, du_h, write_text

TABLES = ("org", "user", "dashboard", "data_source", "folder", "alert_rule", "api_key", "team")


def _ro(db: Path) -> sqlite3.Connection:
    return sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True)


def estimate(ctx: Context) -> int:
    return int(ctx.docker.out("exec", ctx.c("grafana"), "du", "-sb", "/var/lib/grafana").split()[0])


def backup(ctx: Context) -> None:
    d = ctx.dir("grafana")
    tar_path, check = d / "grafana-data.tar", d / "check"
    ok = False
    for attempt in (1, 2, 3):
        ctx.docker.to_file(["exec", ctx.c("grafana"), "tar", "-C", "/var/lib", "--numeric-owner", "-cpf", "-", "grafana"], tar_path)
        shutil.rmtree(check, ignore_errors=True)
        check.mkdir()
        db = check / "grafana.db"
        with tarfile.open(tar_path) as t, open(db, "wb") as out:
            member = t.extractfile("grafana/grafana.db")
            if member is None:
                raise BackupError("grafana: grafana/grafana.db not found in the archive")
            shutil.copyfileobj(member, out)
        con = _ro(db)
        try:
            ok = con.execute("pragma integrity_check").fetchone()[0] == "ok"
            if ok:
                counts = []
                for t in TABLES:
                    try:
                        counts.append(f"{t}|{con.execute(f'select count(*) from {t}').fetchone()[0]}")
                    except sqlite3.Error:
                        pass
        finally:
            con.close()
        if ok:
            break
        ctx.log(f"grafana: integrity check failed on attempt {attempt}, retrying")
        time.sleep(2)
    shutil.rmtree(check, ignore_errors=True)
    if not ok:
        raise BackupError("grafana: grafana.db failed integrity check 3 times")
    write_text(d / "counts.txt", "".join(c + "\n" for c in counts))
    ctx.log(f"grafana: {du_h(tar_path)}, integrity ok, counts: {' '.join(counts)} ")
