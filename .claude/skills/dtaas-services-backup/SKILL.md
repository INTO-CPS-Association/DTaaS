---
name: dtaas-services-backup
description: Back up and restore any selection of the DTaaS platform services postgres, thingsboard, grafana, influxdb, mongodb and rabbitmq, on Linux, macOS or Windows. Only the listed services are backed up, one or many. Also estimates backup size, verifies backups, and dry-runs restores. Targets newer images (dtaas-services 1.2.0). Use when asked to back up, size, verify, migrate, move or restore one or more of these services between DTaaS hosts.
argument-hint: <source-host> <target-host> <services|all> [target-project-dir]
---

# DTaaS services backup (per-service, cross-platform)

## Parameters

Arguments given by the user: `$ARGUMENTS`

1. `SOURCE_HOST`: the host currently running the services.
2. `TARGET_HOST`: the host the backup is for / restored on.
3. `SERVICES`: a comma-separated list from `postgres, thingsboard, grafana, influxdb, mongodb, rabbitmq`, or
   `all`. Examples: `influxdb`, `grafana,rabbitmq`, `postgres,thingsboard`.
4. `TARGET_PROJECT_DIR`: the dtaas-services project dir on TARGET_HOST (optional; restore only).

If a needed value is missing, ask the user. Never guess the service list, and never widen it: back up
**only** the listed services. If the user names a service that isn't supported (e.g. gitlab), say so and
don't substitute another.
Check the computer's hostname (case-insensitive, ignore the domain) against `SOURCE_HOST` before a backup,
or against `TARGET_HOST` before a restore. If it doesn't match, stop and ask.

## How to run the tool (all platforms)

On Windows or macOS, or whenever the user asks whether something is safe on another OS, read
`CROSS-PLATFORM.md` first. The key rule: restore only when the target databases keep their data on a Linux
filesystem (a Linux host, a project inside WSL2, or Docker volumes), **never into a project on a Windows drive**.

The tool is `scripts/backup.py` (Python >= 3.10, standard library only). Run it with the **dtaas-services
venv's Python**, which every DTaaS host has:

| OS | Python to use |
|---|---|
| Linux / macOS | `<project>/.venv/bin/python` (or any `python3` >= 3.10) |
| Windows | `<project>\.venv\Scripts\python.exe` (or `py -3`; avoid the `python3` Microsoft Store stub) |

Below, `PY` is that interpreter and `B` is `.claude/skills/dtaas-services-backup/scripts/backup.py`.
The tool calls `docker` directly, with no shell in between. So it behaves the same from bash, zsh,
PowerShell, cmd or Git Bash; no `MSYS_NO_PATHCONV` is needed. The bash scripts (`scripts/backup.sh`,
`scripts/services/*.sh`) are the older Linux-only version, kept as a fallback until the Python tool has been
tested on Windows. Don't use them on Windows or macOS.

## Service dependencies to tell the user about (but don't add services on your own)

- **thingsboard** keeps all its state in the Postgres DB `thingsboard`. The thingsboard module always dumps
  that DB and the roles into `thingsboard/db/`, so `thingsboard/` is self-contained. With `postgres` also
  listed, the DB is in both folders (two dumps seconds apart, identical with `--stop-tb`). The `postgres`
  container must be running; the TB container may be stopped. Other Postgres databases (e.g. `swim`) are
  only in a `postgres` backup.
- **postgres** without `thingsboard` includes the `thingsboard` DB but not TB's files or verification counts.
- `--stop-tb` (stops ThingsBoard before the dumps, for a cutover) requires `thingsboard` in the list.

## Rules

- Never stop, remove or modify containers on either host unless the user explicitly asks in this session.
  Plain backups stop nothing. `--stop-tb` stops ThingsBoard, so ask first.
- All backups are **logical**, so they restore into newer images. Never copy raw data dirs between versions.
- Services may come from **different installs** (other project dirs, plain `docker run`). The tool finds
  each one from its running container. Never assume one project dir.
- Backups hold password hashes, tokens and env passwords. The tool restricts the backup dir to the current
  user (`chmod 700` on Linux/macOS, `icacls` on Windows). Never upload backups anywhere, and never print credentials.
- Steps that need elevated rights can't be run by Claude. Ask the user to run them **themselves**: on
  Linux/macOS in their own terminal with `sudo`, on Windows in an **Administrator PowerShell**. Give the exact
  command; the tool prints it as a warning (e.g. to copy a root-only `password.env.current`).
- Never feed a backup file to a command through stdin redirection (`<`) on Windows: PowerShell has no `<`, and
  Windows PowerShell 5 corrupts binary data in pipes. Use `docker cp`, or mount the backup dir into a
  throwaway container.
- MongoDB and InfluxDB are large (hours). Run them with `run_in_background`, ideally as separate invocations.
- A backup dir containing an `INCOMPLETE` file did not finish. Never copy or restore it.
- Backup files can be larger than 4 GB, so the backup disk must not be FAT32/exFAT.

## 1. Estimate (read-only, seconds)

```
PY B estimate --services SERVICES
```

This prints the image and expected size per listed service, plus the free space. When reporting:
- postgres shows on-disk DB size; the compressed dump is much smaller (148 MB -> 22 MB on a typical source host).
- thingsboard includes its own DB copy.
- influxdb shows on-disk TSM; `influx backup` gzips, so the result is usually smaller.
- mongodb shows the logical `dataSize` (= the uncompressed mongodump size).

## 2. Backup (on SOURCE_HOST)

```
PY B backup --services SERVICES --source-host SOURCE_HOST --target-host TARGET_HOST [--stop-tb] [--mongo-gzip]
```

Partial backups, e.g. for tests or one tenant: `--influx-bucket ORG/BUCKET` and `--mongo-db DB`.
They are recorded as `partial=` in `info.txt`. Say clearly that such a backup is not complete.

Output: `<project>/backups/<timestamp>/` (override with `--backup-root` or `BACKUP_ROOT`), containing only the
listed services:

```
info.txt  backup.log  SHA256SUMS            (INCOMPLETE while running / after a failure)
projects/<install-dir>/      compose files, services.env/.env, credentials.csv, password.env.current
                             (one per install the selected services came from, saved once)
<service>/service.txt        image, status, ports, compose origin
<service>/mounts.txt  <service>/docker-inspect.json
postgres/     db/globals.sql, db/<db>.dump (+ .toc) for every DB, meta/ (versions, DBs, roles, ACLs, settings, pg_hba, extensions), certs.tar.gz
thingsboard/  db/globals.sql + db/thingsboard.dump (always: own copy), meta/tb-counts.txt,
              tb-schema-version.txt, tb-info.txt, database-acls.txt, thingsboard-data.tar.gz, certs.tar.gz
grafana/      grafana-data.tar (whole /var/lib/grafana, grafana.db integrity-checked), counts.txt
influxdb/     backup/ (influx backup, all orgs; manifest checked), orgs.txt, buckets.txt, users.txt, influx-configs,
              credentials-check.txt (whether the admin user/password in the container env still sign in)
mongodb/      mongodump.archive[.gz] (header checked), databases.txt, collection-counts.txt, users.txt, mongod.conf
rabbitmq/     definitions.json, queues.txt, rabbitmq.conf, enabled_plugins
```

Built-in checks: postgres dumps (TOC listing, with a DATABASE entry), grafana.db (`integrity_check`),
influxdb (every manifest file present with the right size), mongodb (archive header), rabbitmq (valid JSON).
To check a MongoDB archive in depth, run `mongorestore --dryRun --archive` against it (it reads, writes nothing).

At the end, the tool lists warnings: files it couldn't read (with the exact command for the user) and
RabbitMQ messages that aren't backed up. Relay them all.

Consistency, to tell the user:
- mongodb (standalone) has no oplog, so an online dump isn't point-in-time. For a final backup, pause the writers.
- rabbitmq: only the definitions are saved, not queued messages.
- thingsboard: data written after a hot backup is lost. Use `--stop-tb` for the cutover backup.

## 3. Copy and verify

Copy the whole backup dir with `scp -r <backup-dir> TARGET_HOST:<dest>/` (OpenSSH; built into Windows 10+,
Linux and macOS) or `rsync -a`. Then, on the receiving computer:

```
PY B verify <dest>/<timestamp>
```

This works on any OS and doesn't need Docker. It fails if `INCOMPLETE` is present or any checksum differs,
and it lists files that aren't in `SHA256SUMS` (e.g. copied by hand). On Linux, `sha256sum -c SHA256SUMS` also works.

## 4. Restore on TARGET_HOST

The restore is a command like the backup: `PY B restore`. It restores **only the listed services**, which
must all be in the backup. Run it on TARGET_HOST, after copying the backup there and running `verify`.

### 4.1 Prepare the target (once, by the user or with them)

1. Create a venv with a dtaas-services version that ships the target images (1.2.0 on the `feature/distributed-demo`
   branch), and run `dtaas-services project generate --path TARGET_PROJECT_DIR`. On Windows, do this **inside
   WSL2** (CROSS-PLATFORM.md).
2. Set `HOSTNAME` (and `CERTS_SRC` if used) in `config/services.env`. Everything else that must match the source
   (admin users/passwords, ports) is filled in by the restore.
3. Put the TARGET host's certificate and key into `certs/` as `fullchain.pem` and `privkey.pem`. The restore
   creates the per-service cert files and owners itself (or the user runs `dtaas-services host setup`).
4. **Don't start the services to be restored.** Their `data/<service>` dirs must be empty. The restore starts them
   itself, after writing the source credentials, because admin accounts are created on the first start.

### 4.2 Dry run, then ask the user

```
PY B restore <backup-dir> --services SERVICES --target-project TARGET_PROJECT_DIR --target-host TARGET_HOST --dry-run
```

The dry run performs every check and prints the plan, without changing anything:
- **Checks:** the backup verifies and is not `INCOMPLETE` (a partial backup needs confirmation); this computer is
  TARGET_HOST; each selected service exists in the target compose files; no container with the same name belongs
  to another compose project; data dirs are on a Linux filesystem; data dirs are empty; ports are free.
- **Ports:** for each port setting, the target default and the **source's port**, which is proposed.
- **Settings:** the services.env keys that will change (names only).
- **Steps:** each step per service, and the ports report (old -> new) for clients.

Show the user the plan and **ask them to confirm the ports**. If they give new ports, pass them as
`--port KEY=VALUE` (repeatable, e.g. `--port MONGODB_PORT=27017`). Relay every WARNING/PROBLEM. If the dry run
reports problems, resolve them with the user (e.g. `dtaas-services service clean -s <svc>` only if they agree
that the target data there may be destroyed); never work around a check.

### 4.3 Restore

After the user has approved the plan and the ports:

```
PY B restore <backup-dir> --services SERVICES --target-project TARGET_PROJECT_DIR --target-host TARGET_HOST --yes [--port KEY=VALUE ...]
```

Run it with `run_in_background` when influxdb or mongodb is included (hours). Without `--yes`, it asks at the
terminal before each destructive step. What it does, in this order:

| Step | What happens |
|---|---|
| settings | writes the source admin users/passwords and the confirmed ports into `config/services.env` (the previous file is kept in the run dir); TB keys of `password.env.current` |
| certs | creates missing per-service cert files from `fullchain.pem`/`privkey.pem`, with the right owners, from a root container |
| postgres | start; load roles; `pg_restore --create` each database (the image's empty `thingsboard` DB is replaced); `vacuumdb`; check roles and owner/ACL |
| thingsboard | restore its own DB copy; counts must match; checkpoint; confirm a CE image; upgrade to `thingsboard/tb-node:4.3.1.8` (4.4+ refused; the compose file is changed, with a `.bak`); schema must end in `\|CE`, else roll back; checkpoint; start; counts; sysadmin and tenant-admin login |
| rabbitmq | start; import the definitions; check vhosts, users, queues; report config differences |
| grafana | extract into `data/grafana` with owner `USERID:GROUPID` (root container); start; check counts and admin login |
| influxdb | start (first-time setup); `influx restore --full` with the backup mounted; install the source operator token in `config/influxdb/influx-configs`; check orgs, buckets, users |
| mongodb | start (root user = source's); `mongorestore` with the backup mounted, credentials passed as environment variables; check collection counts and users |

Output: `<backup-root>/restore-<timestamp>/` with `restore.log`, `report.txt` (results, **old -> new ports for
clients**, notes, warnings), `checkpoints/` (ThingsBoard DB before/after the upgrade, the target's InfluxDB config)
and the previous `services.env`. `INCOMPLETE` stays there if the restore stopped; read `restore.log`, fix the
cause with the user, and use the checkpoints. Exit codes: 0 ok, 1 failure or verification problems, 2 wrong arguments.

Temporary containers (`docker run --rm`) are used for root-only file changes (no sudo), and to give `mongorestore`
and `influx restore` read-only access to the backup without stdin or copying. They use the target's own images.

Things that remain the user's: the target certificates, decisions about ports and about cleaning a non-empty
target, the current passwords if a check says the source's are stale, and repointing clients.

The guides in `restore/*.md` describe the same steps by hand. Use them to explain a step or to finish one
manually after a failure.

## 5. Cut over

Final backup of the same service list (`--stop-tb` if thingsboard is included; pause MongoDB writers; drain
RabbitMQ), restore, repoint clients (list old -> new host/port per service), then stop and remove the
source containers. They have `restart: always`.

## Rollback

The source is untouched until clients are repointed (except TB, if `--stop-tb` was used: `docker start thingsboard`).
