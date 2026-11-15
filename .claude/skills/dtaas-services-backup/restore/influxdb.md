# Restore: influxdb (2.7 -> 2.9.1)

Input: `influxdb/backup/` (from `influx backup`), `influxdb/influx-configs` (source operator token),
`orgs.txt`, `buckets.txt`, `users.txt`.

1. `dtaas-services service start -s influxdb`. The image's setup mode creates a new org, user and operator token.
2. Full restore with that **new** operator token (in the target container's `/etc/influxdb2/influx-configs`),
   from a throwaway container of the **target** image that shares the server's network and config:
   ```bash
   docker run --rm --network container:influxdb --volumes-from influxdb:ro \
     -v <backup>/influxdb/backup:/backup:ro --entrypoint influx <target-image> \
     restore --full --skip-verify /backup
   ```
   This **replaces** all metadata (orgs, users, tokens) and data. After it, only the **source** tokens and
   users are valid, so clients keep working with their old tokens.
3. Make the target CLI work again: replace the token in the target's `influx-configs` with the source operator
   token from `influxdb/influx-configs`, and set `INFLUXDB_ADMIN_USERNAME/PASSWORD` in the target `services.env`
   to the **source** admin. The source admin user/password are in the backup:
   - `influxdb/docker-inspect.json`: container env `DOCKER_INFLUXDB_INIT_USERNAME` / `DOCKER_INFLUXDB_INIT_PASSWORD`
   - `projects/<install>/config/services.env`: `INFLUXDB_ADMIN_USERNAME` / `INFLUXDB_ADMIN_PASSWORD`, if that
     project was saved (on a typical source host they are identical to the container env)

   These are only applied at first setup, so check `influxdb/credentials-check.txt`:
   `admin_credentials_valid=true` means they still signed in at backup time. If it says `false`, the
   password was changed later; ask the user for the current one. Never print these values.
4. Verify: `influx org list`, and `influx bucket list --org-id <id>` per org, against `orgs.txt`/`buckets.txt`.
   Run a Flux `count()` over a time range on a few buckets on both hosts.
   Large restores (tens of GB) take a long time, so run step 2 with `run_in_background`.
