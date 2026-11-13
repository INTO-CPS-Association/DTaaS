# Restore: mongodb (8.0.3 -> 9.0.4)

Input: `mongodb/mongodump.archive` (or `.archive.gz`), `databases.txt`, `collection-counts.txt`, `users.txt`.

1. In `services.env`, set `MONGODB_ADMIN_USERNAME/PASSWORD` to the **source** root user (the `MONGO_INITDB_ROOT_*`
   env in `mongodb/docker-inspect.json`; never print it). The restore merges in the source users anyway.
2. `dtaas-services service start -s mongodb`. The image creates the root user.
3. Check the flag names first with `docker exec mongodb mongorestore --help`: the database-tools versions differ.
   The source tools used `--ssl --tlsInsecure`. Then restore in the background (hundreds of GB take hours):
   ```bash
   docker exec -i mongodb sh -c 'mongorestore --host localhost --ssl --tlsInsecure \
     -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
     --archive' < mongodb/mongodump.archive          # add --gzip for .archive.gz
   ```
   `-i` is required; without it, mongorestore reads nothing.
4. Verify: `estimatedDocumentCount()` per collection against `collection-counts.txt`, users against `users.txt`,
   and a login as a non-root source user.
5. Ports: the source published 27017 on host port 8087. Tell the user the old -> new port for clients.
