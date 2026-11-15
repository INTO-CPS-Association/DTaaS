# Restore: grafana (12.3.1 -> 13.2.4)

Input: `grafana/grafana-data.tar` (the whole `/var/lib/grafana`), `grafana/counts.txt`.

1. With grafana **not** running (stop it if the CLI started it, after confirming with the user):
   extract into the target project, `tar -xf grafana/grafana-data.tar -C TARGET_PROJECT_DIR/data/`
   (this creates/overwrites `data/grafana`), then set the owner to `USERID:GROUPID` from `config/services.env`.
   That may need the user to run `sudo chown -R <USERID>:<GROUPID> TARGET_PROJECT_DIR/data/grafana` in their own terminal.
2. `dtaas-services service start -s grafana`. Grafana migrates the DB to 13.x on first start. Watch
   `docker logs grafana` for migration errors.
3. The admin password is now the **source** one: `GF_SECURITY_ADMIN_PASSWORD` only applies to a new DB.
4. Verify against `counts.txt` via the API (`/api/orgs`, `/api/search`, `/api/datasources`), with the
   source admin. Data sources pointing at the old InfluxDB/other hosts or ports need updating. List them for the user.
