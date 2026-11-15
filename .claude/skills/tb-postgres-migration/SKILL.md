---
name: tb-postgres-migration
description: Back up the DTaaS PostgreSQL + ThingsBoard platform services (installed with the dtaas-services pip CLI) on a source host and restore them on a target host with an upgrade (postgres 16 -> 18.6, thingsboard/tb-node CE 4.2.1 -> 4.3.1.8). Use when asked to back up, migrate, move, restore or verify the postgres/thingsboard services between two DTaaS hosts.
argument-hint: <source-host> <target-host> [target-project-dir]
---

# PostgreSQL + ThingsBoard migration (dtaas-services installs)

## Parameters

Arguments given by the user: `$ARGUMENTS`

- `SOURCE_HOST`: the host currently running postgres + thingsboard (first argument).
- `TARGET_HOST`: the host to restore on (second argument).
- `TARGET_PROJECT_DIR`: the dtaas-services project dir on TARGET_HOST (optional third argument; needed for the restore only).

If a needed value is missing, ask the user. Never assume host names or directories.
Run `hostname` and confirm it matches `SOURCE_HOST` before a backup, or `TARGET_HOST` before a restore.
If it doesn't match, stop and ask.

## How the installation is laid out (discover it, don't hardcode it)

The services are installed with the `dtaas-services` pip package
(docs: `docs/admin/services/cli.md` in the INTO-CPS-Association/DTaaS repo).
`dtaas-services project generate --path <dir>` creates one **project dir**, and all paths are relative to it:

| Path | Content |
|---|---|
| `config/services.env` | all settings and passwords (ports, `POSTGRES_*`, `TB_*`, `HOSTNAME`, `CERTS_SRC`) |
| `config/credentials.csv` | user accounts for `dtaas-services user add` |
| `config/password.env.current` | CLI-managed record of live passwords. Never hand-edit it. Usually root-only. |
| `compose.services.yml` | postgres (plus rabbitmq, mongodb, grafana, influxdb) |
| `compose.thingsboard.yml` | thingsboard |
| `data/postgres`, `data/thingsboard`, `log/thingsboard` | service data and logs |
| `certs/` | TLS certs; `postgres.crt/key`, `thingsboard-*.pem` (uid 799) |

How to find the values:
- **Source project dir:** the `com.docker.compose.project.working_dir` label of the `postgres` container
  (`docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' postgres`).
  The `...project.config_files` label lists the compose files. The backup script does this automatically.
- **Ports, DB name, user:** read `config/services.env` in the project dir. Never print passwords.
- **Image versions:** use `docker inspect` on the running containers (source), or the `image:` lines in the
  compose files of the target project dir.
- **CLI version:** run `<project>/.venv/bin/pip show dtaas-services`, or `pip show dtaas-services` in the active venv.

Only `postgres` and `thingsboard-ce` move. The other services stay on SOURCE_HOST.

## Rules

- Never stop, remove or modify containers on either host unless the user explicitly asks in this session.
- A postgres major upgrade (16 -> 18) **cannot** reuse `data/postgres`. Always use the logical dumps.
- On the target, **never** run `dtaas-services service install -s thingsboard` or `service clean` after
  data is restored. Install re-runs the schema creation on a populated DB and can corrupt it; clean wipes it.
- Backups hold credentials and private keys. Keep them mode 600/700 and never upload them anywhere.
- **Never use `thingsboard/tb-node:4.4.x` or later.** From 4.4 on, CE and PE are a single "unified"
  edition: running the 4.4 upgrade on a CE database converts it to PE (log line
  `Upgrading ThingsBoard from version CE to PE`, and `tb_schema_settings` ends in `|PE`). Undoing that
  needs a restore from a checkpoint. The latest CE is **4.3.1.8**. Use 4.4 only if the user explicitly
  asks for PE.
- Commands that need root (`dtaas-services host setup`, `service install`, `sudo ...`) can't be run by
  Claude, because sudo needs a password. The `!` prefix can't prompt for it either. Ask the user to run them
  **in their own terminal**, and give the exact command.

## 1. Backup (on SOURCE_HOST)

> The `dtaas-services-backup` skill can also back up postgres and thingsboard, alone or together with other
> services (`--services postgres,thingsboard`). Its layout is per service; the path mapping is in its
> `restore/postgres-thingsboard.md`. The script below still works and produces the layout this file's restore
> steps use.

```bash
S=.claude/skills/tb-postgres-migration/scripts/backup-tb-postgres.sh
$S --source-host SOURCE_HOST --target-host TARGET_HOST            # hot backup, nothing stopped
$S --source-host SOURCE_HOST --target-host TARGET_HOST --stop-tb  # final cutover: stops TB, leaves it stopped
```

The script needs docker access only, no sudo. It finds the project dir itself; set `PROJECT_DIR=...` to override it.
Output goes to `<skill-root-project>/backups/<timestamp>/` (override with `BACKUP_ROOT`):
- `db/globals.sql` contains the roles. `db/<db>.dump` holds one pg_dump `--create` custom-format archive per
  non-template database (incl. its owner, ACL and settings). `db/<db>.toc` is its validated table of contents.
  List it with `pg_restore -l --create`; without `--create` the DATABASE/ACL entries are hidden.
  `meta/database-acls.txt`, `meta/role-memberships.txt` and `meta/db-role-settings.txt` are for verification.
- `meta/info.txt` contains the hosts, project dir, compose files, dtaas-services version, images and PG versions.
  `meta/` also contains the database list, roles, settings, pg_hba, extensions, row estimates,
  exact counts of key TB tables (`tb-counts.txt`) and the TB schema version.
- `config/` contains the compose files, `services.env`, `credentials.csv`, `password.env.current` (if readable;
  otherwise the script prints the `sudo install` command to copy it), `certs.tar.gz` and `thingsboard-data.tar.gz`.
- `SHA256SUMS` checksums everything except a manually copied `password.env.current`.

Copy the backup: `rsync -a <backup-dir> TARGET_HOST:<dest>/`, then run `sha256sum -c SHA256SUMS` there.

## 2. Prepare TARGET_HOST with the newer dtaas-services package

1. Create a venv and run `pip install dtaas-services==<version>`. Use a version whose `compose.services.yml`
   ships `postgres:18.6`; 1.2.0 on the `feature/distributed-demo` branch does.
   Then run `dtaas-services project generate --path TARGET_PROJECT_DIR`.
2. **Merge** the old `config/services.env` into the new one, key by key. Don't overwrite the file, because newer
   versions add keys (e.g. `POSTGRES_UID/GID`, `THINGSBOARD_UID/GID`). Keep `POSTGRES_USER/PASSWORD/DB` identical to
   the source. Set `HOSTNAME`/`CERTS_SRC` for TARGET_HOST. Note that the source may use a non-default `POSTGRES_PORT`.
   Copy `credentials.csv`. Put the old `password.env.current` in place (mode 600) so the CLI's view of the
   passwords matches the restored database.
   - The CLI logs in to TB with `TB_SYSADMIN_EMAIL`, so it must be the **source** value: the restored DB has the
     source email, and only `service install` (forbidden here) would change it.
   - `password.env.current` usually holds only `TB_SYSADMIN_CURRENT_PASSWORD`. For the tenant admin, the CLI
     falls back to `TB_TENANT_ADMIN_PASSWORD`, so copy the source value of that too.
   - New ports and other passwords (RabbitMQ, InfluxDB, Grafana, MongoDB, GitLab) can keep the new values.
     TB reaches Postgres on the docker network (`postgres:5432`), so `POSTGRES_PORT` only affects external clients.
3. Provide TLS certs for TARGET_HOST (certs naming SOURCE_HOST will not validate). Check that the cert names
   TARGET_HOST and that the key matches it.
4. Run `dtaas-services service clean`. It needs no root, but it asks for confirmation (`echo y | ...`). It keeps
   `certs/`, but it **deletes** `data/thingsboard` and `log/thingsboard` (and `certs/.gitkeep`). The data dirs
   are still empty at this point.
5. Create the per-service cert files: ask the user to run, **in their own terminal**,
   `sudo .claude/skills/tb-postgres-migration/scripts/setup-certs.sh TARGET_PROJECT_DIR`.
   It does what `dtaas-services host setup` does for certs, without needing `CERTS_SRC`: it normalizes
   `fullchainN.pem`/`privkeyN.pem`, creates `postgres.crt/key` (999), `thingsboard-*.pem` (799),
   `privkey-rabbitmq.pem`, `combined.pem` (MongoDB) and `privkey-influxdb.pem`, and recreates `data/thingsboard` and
   `log/thingsboard` owned by 799. UIDs/GIDs come from `config/services.env`. Run it **after** `service clean`.
   It is safe to re-run. Postgres won't start without `certs/postgres.crt/key`.
   `sudo dtaas-services host setup` is the alternative, if `CERTS_SRC` is readable by root on TARGET_HOST.
   Check with `ls -ln certs`.
6. Check that the compose ports are free on TARGET_HOST: 8883 often clashes with RabbitMQ MQTT.

## 3. Restore + upgrade on TARGET_HOST (confirm each step with the user)

Run all compose commands in TARGET_PROJECT_DIR with `--env-file config/services.env`, and pass
`-p <project>`. Read the project name from the `com.docker.compose.project` label of the `postgres` container
after step 1, so the one-off upgrade containers join the same compose project as the CLI's containers.
Use `docker exec -i` whenever SQL is fed on stdin (heredoc or `<`). Without `-i`, psql silently runs nothing.

1. Start only postgres: `dtaas-services service start -s postgres`. Check its logs and `select version()`.
2. Load the roles: `docker exec -i postgres psql -U <POSTGRES_USER> -d postgres < db/globals.sql`.
   A "role ... already exists" error for POSTGRES_USER is expected and harmless.
3. Restore **every** `db/<db>.dump`, not only thingsboard. Other databases such as `swim` share this
   Postgres and have their own logins in `globals.sql`. The dumps were made with `--create`, so restore with
   `--create`, connecting to `postgres`. This recreates each database with its owner, its grants
   (e.g. `REVOKE ... FROM PUBLIC`, `GRANT CONNECT ... TO swim_ntu`) and its settings.
   The image auto-creates an empty `POSTGRES_DB` (thingsboard), so drop it first. TB must not be running:
   ```bash
   docker exec postgres dropdb -U <POSTGRES_USER> --if-exists thingsboard
   for f in db/*.dump; do
     docker cp "$f" postgres:/tmp/ &&
     docker exec postgres pg_restore -U <POSTGRES_USER> -d postgres --create --exit-on-error -j 4 "/tmp/$(basename "$f")"
   done
   ```
4. Run `docker exec postgres vacuumdb -U <POSTGRES_USER> --all --analyze-in-stages`.
5. Compare against the backup **before** the TB upgrade:
   - exact counts against `meta/tb-counts.txt`
   - database owners and ACLs (`select datname, pg_get_userbyid(datdba), datacl from pg_database`) against
     `meta/database-acls.txt`
   - roles against `meta/roles.txt`
   - each non-superuser role (e.g. `swim_ntu`, `swim_reader`): `has_database_privilege(role, db, 'CONNECT')`
     and a SCRAM password hash in `pg_authid`. A real password login needs the plaintext password, which the
     backup doesn't have, so ask the user if one is required.
6. Make a checkpoint, in a mode 700 dir such as `<backup-root>/checkpoints/01-restored-<version>/`:
   `docker exec postgres pg_dump -U <POSTGRES_USER> -Fc --create -d <db> > <dir>/<db>.dump` for each DB.
7. **Upgrade the ThingsBoard schema in one step: 4.2.1 -> 4.3.1.8 (CE).**
   - The 4.3.1.8 upgrader accepts only 4.2.1.x / 4.2.2.x databases. It refuses a 4.3.1.6 database with
     `database version '4.3.1.6' is not supported for upgrade`, so don't go through 4.3.1.6.
   - dtaas-services 1.2.0 ships `tb-node:4.3.1.6`, so set `image: 'thingsboard/tb-node:4.3.1.8'` in
     `compose.thingsboard.yml` (keep a `.bak`).
   - Before running the upgrade, confirm the image is CE: `docker run --rm --entrypoint ls <image>
     /usr/share/thingsboard/data/upgrade` must list only `basic lts`. A `pe` entry means a PE/unified image,
     so stop.
   - With TB not running:
     `docker compose -p <project> -f compose.thingsboard.yml --env-file config/services.env run --rm -e UPGRADE_TB=true thingsboard-ce`.
   - Expect `Upgrading ThingsBoard from version 4.2.1.0 to 4.3.1.8 ...` and `Upgrade finished successfully!`
     in the log, and `tb_schema_settings` = `4003001008|CE`. Then make a checkpoint (`02-upgraded-4.3.1.8`).
   - If anything fails, or the log says `CE to PE`: drop `thingsboard`, restore the previous checkpoint with
     `pg_restore --create`, and stop.
   - Re-check `meta/tb-counts.txt`. After the upgrade, `widgets_bundle` and `widget_type` differ (the system
     widget library is reloaded). Every other count must match.
8. Start TB: `dtaas-services service start -s thingsboard`, and wait for `Started ThingsboardServerApplication`
   in `docker logs thingsboard`. Check:
   - HTTPS on `THINGSBOARD_PORT` and MQTTS on `THINGSBOARD_MQTT_SSL_PORT` serve the TARGET_HOST cert
     (`openssl s_client`).
   - Sysadmin login via `POST /api/auth/login`, with `TB_SYSADMIN_EMAIL` and the password from
     `password.env.current`. Never print passwords.
   - Tenant admin login with `TB_TENANT_ADMIN_PASSWORD`. This can fail even though the migration is fine, if
     the password was changed in the UI on the source. If it fails, tell the user and don't reset it yourself.
   - Tenants, devices and dashboards are present and each tenant has a root rule chain. If REST login isn't
     possible, query the DB.
   - MQTT(S) telemetry arrives once devices are repointed.
9. Repoint clients (devices, DTaaS configs, DNS) from SOURCE_HOST to TARGET_HOST. If the target uses
   different ports, list the old -> new port for each client. Then disable the services on
   SOURCE_HOST, e.g. `dtaas-services service stop -s thingsboard,postgres` and remove the containers. They have
   `restart: always` and come back after a reboot if they are only stopped.

## Rollback

Until clients are repointed, SOURCE_HOST is untouched. Run `docker start thingsboard` there if it was stopped by `--stop-tb`.
On the target, the checkpoints let you go back to any verified state: stop TB, `dropdb thingsboard`, then
`pg_restore --create` the checkpoint and set the matching `image:` tag.
