# mongodb: `mongodump --archive` of all databases (incl. admin users/roles), streamed out of the
# container; the root credentials stay in the container env. A standalone mongod has no oplog,
# so an online dump is NOT point-in-time.
MG_C="${CONTAINER[mongodb]}"
# The server cert names the public host, not localhost; mongosh and mongodump spell the bypass differently.
MONGO_CREDS='-u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'
MONGOSH_OPTS="--host localhost --tls --tlsAllowInvalidHostnames $MONGO_CREDS"
MONGODUMP_OPTS="--host localhost --ssl --tlsInsecure $MONGO_CREDS"
mongo_eval() { docker exec "$MG_C" sh -c "mongosh --quiet $MONGOSH_OPTS --eval '$1'"; }

estimate_mongodb() {  # logical dataSize = uncompressed mongodump size
  mongo_eval 'let t=0; db.adminCommand({listDatabases:1}).databases.forEach(d=>{ if(d.name!=="local") t+=Number(db.getSiblingDB(d.name).stats().dataSize) }); print(t)' | tail -1
}

backup_mongodb() {
  local d="$OUT/mongodb" ext=archive gz=""
  docker exec "$MG_C" cat /etc/mongod.conf > "$d/mongod.conf" 2>/dev/null || true
  docker exec "$MG_C" sh -c 'mongod --version | head -1' > "$d/version.txt" 2>/dev/null || true
  mongo_eval 'db.adminCommand({listDatabases:1}).databases.forEach(d=>{ const s=db.getSiblingDB(d.name).stats(); print([d.name,s.collections,Number(s.objects),Number(s.dataSize),Number(s.storageSize),Number(s.indexSize)].join("|")) })' \
    > "$d/databases.txt"
  mongo_eval 'db.adminCommand({listDatabases:1}).databases.forEach(d=>{ if(d.name==="local"||d.name==="config") return; const x=db.getSiblingDB(d.name); x.getCollectionNames().forEach(n=>print(d.name+"."+n+"|"+x.getCollection(n).estimatedDocumentCount())) })' \
    > "$d/collection-counts.txt"
  mongo_eval 'db.getSiblingDB("admin").system.users.find({},{user:1,db:1,roles:1,_id:0}).forEach(u=>print(JSON.stringify(u)))' \
    > "$d/users.txt"
  $MONGO_GZIP && { ext=archive.gz; gz=--gzip; }
  log "mongodb: $(wc -l < "$d/databases.txt") databases; running mongodump (online; standalone, so not point-in-time)"
  docker exec "$MG_C" sh -c "mongodump $MONGODUMP_OPTS --archive $gz --quiet" > "$d/mongodump.$ext" \
    || die "mongodb: mongodump failed"
  log "mongodb: $(du -h "$d/mongodump.$ext" | cut -f1)"
}
