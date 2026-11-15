"""mongodb: `mongodump --archive` of all databases (incl. admin users/roles), streamed out of the
container; the root credentials stay in the container env. A standalone mongod has no oplog, so an
online dump is NOT point-in-time."""
from __future__ import annotations

from ..common import BackupError, Context, du_h, write_text

CREDS = '-u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'
# The server cert names the public host, not localhost; mongosh and mongodump spell the bypass differently.
MONGOSH = f'mongosh --quiet --host localhost --tls --tlsAllowInvalidHostnames {CREDS} --eval "$1"'
MONGODUMP = f"mongodump --host localhost --ssl --tlsInsecure {CREDS} --archive --quiet"
ARCHIVE_MAGIC = bytes.fromhex("6de29981")   # mongodump archive header (0x8199e26d, little-endian)
GZIP_MAGIC = b"\x1f\x8b"


def mongo_eval(ctx: Context, js: str) -> str:
    return ctx.docker.sh(ctx.c("mongodb"), MONGOSH, js)


def estimate(ctx: Context) -> int:
    """Logical dataSize = uncompressed mongodump size."""
    out = mongo_eval(ctx, 'let t=0; db.adminCommand({listDatabases:1}).databases.forEach(d=>{ '
                          'if(d.name!=="local") t+=Number(db.getSiblingDB(d.name).stats().dataSize) }); print(t)')
    return int(float(out.strip().splitlines()[-1]))


def backup(ctx: Context) -> None:
    d = ctx.dir("mongodb")
    c, dk = ctx.c("mongodb"), ctx.docker
    write_text(d / "mongod.conf", dk.out("exec", c, "cat", "/etc/mongod.conf", check=False))
    write_text(d / "version.txt", dk.sh(c, "mongod --version | head -1", check=False))
    write_text(d / "databases.txt", mongo_eval(ctx,
        'db.adminCommand({listDatabases:1}).databases.forEach(d=>{ const s=db.getSiblingDB(d.name).stats(); '
        'print([d.name,s.collections,Number(s.objects),Number(s.dataSize),Number(s.storageSize),Number(s.indexSize)].join("|")) })'))
    write_text(d / "collection-counts.txt", mongo_eval(ctx,
        # local/config are internal (config.system.sessions is not readable even by root); mongodump skips them too.
        'db.adminCommand({listDatabases:1}).databases.forEach(d=>{ if(d.name==="local"||d.name==="config") return; '
        'const x=db.getSiblingDB(d.name); x.getCollectionNames().forEach(n=>print(d.name+"."+n+"|"+x.getCollection(n).estimatedDocumentCount())) })'))
    write_text(d / "users.txt", mongo_eval(ctx,
        'db.getSiblingDB("admin").system.users.find({},{user:1,db:1,roles:1,_id:0}).forEach(u=>print(JSON.stringify(u)))'))

    cmd, name, argv = MONGODUMP, "mongodump.archive", []
    if ctx.opts.mongo_gzip:
        cmd, name = cmd + " --gzip", "mongodump.archive.gz"
    if ctx.opts.mongo_db:  # partial backup of one database; the name is passed as $1 (no quoting issues)
        cmd += ' --db "$1"'
        argv = [ctx.opts.mongo_db]
        ctx.log(f"mongodb: PARTIAL backup of database {ctx.opts.mongo_db} only")
    n_dbs = len((d / "databases.txt").read_text().splitlines())
    ctx.log(f"mongodb: {n_dbs} databases; running mongodump (online; standalone, so not point-in-time)")
    archive = d / name
    dk.to_file(["exec", c, "sh", "-c", cmd, "sh", *argv], archive)
    with open(archive, "rb") as f:
        head = f.read(4)
    expected = GZIP_MAGIC if ctx.opts.mongo_gzip else ARCHIVE_MAGIC
    if not head.startswith(expected):
        raise BackupError(f"mongodb: {name} does not start with the expected header ({head.hex()})")
    ctx.log(f"mongodb: {du_h(archive)}, archive header ok")
