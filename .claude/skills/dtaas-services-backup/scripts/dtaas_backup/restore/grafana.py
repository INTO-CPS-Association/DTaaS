"""Restore grafana: extract /var/lib/grafana into the project's data/grafana before the first start,
set the owner to USERID:GROUPID from a root container (no sudo), start (Grafana migrates its DB)."""
from __future__ import annotations

import json
import sqlite3
import ssl
import urllib.error
import urllib.request
from pathlib import Path

from .core import RestoreContext, RestoreError

SVC = "grafana"


def check(ctx: RestoreContext) -> list[str]:
    return [] if (ctx.backup / SVC / "grafana-data.tar").is_file() else ["grafana/grafana-data.tar missing in the backup"]


def restore(ctx: RestoreContext) -> None:
    if ctx.docker.running(ctx.container(SVC)):
        ctx.cli("stop", SVC)
    uid, gid = ctx.env.get("USERID", "0"), ctx.env.get("GROUPID", "0")
    ctx.confirm(f"Extract the Grafana data into {ctx.project / 'data' / 'grafana'} (owner {uid}:{gid})?")
    ctx.as_root(ctx.image(SVC), [(ctx.backup / SVC, "/b", "ro"), (ctx.project / "data", "/d", "rw")],
                'tar -xf /b/grafana-data.tar -C /d && chown -R "$1:$2" /d/grafana', uid, gid)
    ctx.cli("start", SVC)
    port = ctx.env.get("GRAFANA_PORT", "3000")
    ctx.wait("grafana", lambda: ctx.https_ok(port, "/api/health"), timeout=300)


def login(ctx: RestoreContext) -> str:
    port = ctx.env.get("GRAFANA_PORT", "3000")
    body = json.dumps({"user": ctx.env.get("GRAFANA_ADMIN_USERNAME", ""),
                       "password": ctx.env.get("GRAFANA_ADMIN_PASSWORD", "")}).encode()
    req = urllib.request.Request(f"https://localhost:{port}/login", data=body, headers={"Content-Type": "application/json"})
    sc = ssl.create_default_context()
    sc.check_hostname, sc.verify_mode = False, ssl.CERT_NONE
    try:
        with urllib.request.urlopen(req, context=sc, timeout=20) as r:
            return str(r.status)
    except urllib.error.HTTPError as e:
        return str(e.code)
    except Exception as e:
        return f"error: {type(e).__name__}"


def verify(ctx: RestoreContext) -> list[str]:
    if ctx.opts.dry_run:
        return []
    tmp = ctx.run_dir / "grafana-verify.db"
    ctx.docker.out("cp", f"{ctx.container(SVC)}:/var/lib/grafana/grafana.db", str(tmp))
    problems = []
    con = sqlite3.connect(tmp.resolve().as_uri() + "?mode=ro", uri=True)
    try:
        if con.execute("pragma integrity_check").fetchone()[0] != "ok":
            problems.append("grafana.db integrity check failed after the start")
        for line in (ctx.backup / SVC / "counts.txt").read_text().splitlines():
            t, n = line.split("|")
            try:
                now = con.execute(f"select count(*) from {t}").fetchone()[0]
            except sqlite3.Error:
                continue   # table renamed/removed by the 13.x migration
            if str(now) != n:
                problems.append(f"count differs: {t} {n} -> {now}")
    finally:
        con.close()
        tmp.unlink(missing_ok=True)
    st = login(ctx)
    ctx.note(f"grafana: admin login -> HTTP {st}" + ("" if st == "200" else
             " (the admin password may have been changed in the UI on the source; GRAFANA_ADMIN_PASSWORD only applies to a new DB)"))
    ctx.log("grafana: verified" + (f"; {len(problems)} problem(s)" if problems else ": OK"))
    return problems
