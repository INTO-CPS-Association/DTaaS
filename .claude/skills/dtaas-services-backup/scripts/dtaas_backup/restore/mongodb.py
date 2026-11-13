"""Restore mongodb: start with the source root user (merged into services.env), then mongorestore from a
throwaway container with the backup mounted (no stdin, no copy into the container); credentials are passed
as environment variables, never on a command line."""
from __future__ import annotations

import json

from .core import RestoreContext, RestoreError

SVC = "mongodb"
MONGOSH = ('mongosh --quiet --host localhost --tls --tlsAllowInvalidHostnames --tlsAllowInvalidCertificates '
           '-u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"')


def archive(ctx: RestoreContext):
    for name in ("mongodump.archive", "mongodump.archive.gz"):
        p = ctx.backup / SVC / name
        if p.is_file():
            return p
    return None


def mongo_eval(ctx: RestoreContext, js: str) -> str:
    return ctx.docker.sh(ctx.container(SVC), MONGOSH, js)


def check(ctx: RestoreContext) -> list[str]:
    return [] if archive(ctx) else ["mongodb/mongodump.archive missing in the backup"]


def tls_flags(ctx: RestoreContext) -> list[str]:
    """Database-tools versions differ: older ones only know --ssl, newer ones --tls."""
    help_text = ctx.docker.out("run", "--rm", "--entrypoint", "mongorestore", ctx.image(SVC), "--help", check=False)
    return ["--tls" if "--tls " in help_text or "--tls\n" in help_text else "--ssl", "--tlsInsecure"]


def restore(ctx: RestoreContext) -> None:
    ctx.cli("start", SVC)
    ctx.wait("mongodb", lambda: mongo_eval(ctx, "print(db.adminCommand({ping:1}).ok)").strip().endswith("1"), timeout=300)
    a = archive(ctx)
    ctx.confirm(f"Run mongorestore from {a.name} ({a.stat().st_size / 1e9:.1f} GB)? Documents are added to the target databases.")
    if ctx.opts.dry_run:
        return
    env = ctx.docker.env(ctx.container(SVC))
    creds = {"MU": env.get("MONGO_INITDB_ROOT_USERNAME", ""), "MP": env.get("MONGO_INITDB_ROOT_PASSWORD", "")}
    flags = " ".join(tls_flags(ctx))
    gz = " --gzip" if a.suffix == ".gz" else ""
    ctx.log(f"mongodb: running mongorestore ({flags}); large archives take hours")
    p = ctx.run_docker("run", "--rm", "--network", f"container:{ctx.container(SVC)}",
                       "-v", f"{a.parent.resolve()}:/b:ro", "-e", "MU", "-e", "MP", "--entrypoint", "sh", ctx.image(SVC),
                       "-c", f'mongorestore --host localhost {flags} -u "$MU" -p "$MP" --authenticationDatabase admin '
                             f'--archive=/b/{a.name}{gz}', env=creds)
    ctx._append_log(p.stdout + p.stderr)
    tail = (p.stdout + p.stderr).decode("utf-8", "replace").strip().splitlines()[-3:]
    if p.returncode != 0:
        raise RestoreError(f"mongorestore failed: {' | '.join(tail)}")
    ctx.note(f"mongodb: {' | '.join(l.split(None, 1)[-1] for l in tail[-1:])}")


def verify(ctx: RestoreContext) -> list[str]:
    if ctx.opts.dry_run:
        return []
    d = ctx.backup / SVC
    problems = []
    now = mongo_eval(ctx, 'db.adminCommand({listDatabases:1}).databases.forEach(d=>{ if(d.name==="local"||d.name==="config") return; '
                          'const x=db.getSiblingDB(d.name); x.getCollectionNames().forEach(n=>print(d.name+"."+n+"|"+x.getCollection(n).countDocuments({}))) })')
    now_c = dict(l.rsplit("|", 1) for l in now.splitlines() if "|" in l)
    for line in (d / "collection-counts.txt").read_text().splitlines():
        if "|" not in line:
            continue
        coll, n = line.rsplit("|", 1)
        if coll.startswith("admin.system."):
            continue
        if coll not in now_c:
            problems.append(f"collection missing: {coll}")
        elif now_c[coll] != n:
            problems.append(f"count differs: {coll} {n} -> {now_c[coll]} (source count was an estimate, taken online)")
    now_u = {(u["user"], u["db"]) for u in (json.loads(l) for l in mongo_eval(ctx,
             'db.getSiblingDB("admin").system.users.find({},{user:1,db:1,_id:0}).forEach(u=>print(JSON.stringify(u)))').splitlines() if l.strip())}
    exp_u = {(u["user"], u["db"]) for u in (json.loads(l) for l in (d / "users.txt").read_text().splitlines() if l.strip())}
    problems += [f"user missing: {u}@{db}" for u, db in sorted(exp_u - now_u)]
    ctx.log(f"mongodb: verified {len(now_c)} collections, {len(exp_u)} users" + (f"; {len(problems)} problem(s)" if problems else ": OK"))
    return problems
