# tb-postgres-migration skill

A Claude Code skill to move the DTaaS **PostgreSQL + ThingsBoard** platform services
(installed with the `dtaas-services` pip CLI) from one host to another, upgrading on the way:

| | Source | Target |
|---|---|---|
| PostgreSQL | 16.x | 18.6 |
| ThingsBoard (`tb-node`, CE) | 4.2.1 | 4.3.1.8 (one upgrade step) |

Other platform services (RabbitMQ, MongoDB, Grafana, InfluxDB, GitLab) are not touched.

> **Don't upgrade to ThingsBoard 4.4.x.** From 4.4, `thingsboard/tb-node` is a unified CE/PE edition. Its
> upgrade converts a CE database to PE, and you can only undo that from a backup. 4.3.1.8 is the latest CE.
> Upgrade straight from 4.2.1. The 4.3.1.8 upgrader refuses a database that is already at 4.3.1.6.

> **Before you start, or as soon as the skill asks: run `setup-certs.sh` on the target host.**
> The cert setup needs root, and Claude can't use `sudo` (it can't type your password, and neither can a
> `! sudo ...` line in Claude Code). Run it yourself in a **separate terminal** after putting the target's
> certificates in `<project>/certs/` and after `dtaas-services service clean`:
>
> ```bash
> sudo .claude/skills/tb-postgres-migration/scripts/setup-certs.sh /path/to/target/project
> ```
>
> Postgres won't start without the files it creates. See [Step 3](#step-3-prepare-the-target).

## Files

```
.claude/skills/tb-postgres-migration/
├── SKILL.md                      # instructions Claude follows
├── README.md                     # this file (for people)
└── scripts/
    ├── backup-tb-postgres.sh     # backup script, run on the source host
    └── setup-certs.sh            # per-service TLS cert files, run with sudo on the target host
```

## Requirements

- **Source host:** docker access (the user is in the `docker` group). The `postgres` and
  `thingsboard` containers are running and were started from a `dtaas-services` project dir.
  No `sudo` is needed by the script itself.
- **Target host:** docker + compose, Python ≥ 3.10, a venv with a `dtaas-services` version that ships
  `postgres:18.6`, and TLS certificates for the target host name.
- **Transfer:** ssh/rsync from source to target.

## Where Claude finds the skill

Claude Code loads project skills from `.claude/skills/` in the directory it is started in.
Start Claude Code in the folder containing `.claude/` (e.g. `<backup-dir>`).
To use it everywhere, copy the folder to `~/.claude/skills/`.

## User input

The skill takes its input in three ways:

1. **Arguments on the slash command** (preferred):

   ```
   /tb-postgres-migration <source-host> <target-host> [target-project-dir]
   ```

   - `source-host`: host currently running the services, as `hostname` prints it
   - `target-host`: host to restore on, as `hostname` prints it
   - `target-project-dir`: dtaas-services project dir on the target (only needed for the restore)

   These are passed to the skill as `$ARGUMENTS`.

2. **Questions from Claude.** If the skill is triggered from a plain request (e.g. "back up thingsboard")
   or an argument is missing, Claude asks for the missing host names or directory before doing anything.
   It also stops and asks if `hostname` doesn't match the host given for the step.

3. **Confirmations.** Claude asks before every step that stops, starts or changes services, and before
   each restore/upgrade step on the target. You must run the `sudo` steps yourself, because `sudo` needs your
   password: the `password.env.current` copy on the source, and `setup-certs.sh` on the target.

Everything else is discovered rather than entered:
- the source project dir, from the `com.docker.compose.project.working_dir` label of the `postgres` container
- ports, DB name and user, from `config/services.env`
- image and package versions, from `docker inspect` and `pip show dtaas-services`

## Step 1: backup (on the source host)

Start Claude Code in this folder on the source host and run:

```
/tb-postgres-migration <source-host> <target-host>
```

and ask for a backup. Or run the script directly:

```bash
cd <backup-dir>   # the folder containing .claude/
./backup-tb-postgres.sh --source-host <source-host> --target-host <target-host>            # hot backup
./backup-tb-postgres.sh --source-host <source-host> --target-host <target-host> --stop-tb  # final cutover backup
```

- **Hot backup:** nothing is stopped. Use it to test the process and rehearse the restore.
- **`--stop-tb`:** stops ThingsBoard first, so nothing is written after the dump, and **leaves it stopped**.
  Use this for the real cutover.

Optional environment overrides: `PROJECT_DIR`, `BACKUP_ROOT` (default: `backups/` next to `.claude/`),
`PG_CONTAINER`, `TB_CONTAINER`.

The backup lands in `backups/<timestamp>/`:

| Path | Content |
|---|---|
| `db/globals.sql` | roles |
| `db/<db>.dump`, `db/<db>.toc` | one pg_dump custom-format archive per database (`--create`: includes the database's owner and grants), and its validated table of contents |
| `meta/` | hosts, project dir, versions, DB list, settings, extensions, exact counts of key TB tables |
| `config/` | compose files, `services.env`, `credentials.csv`, certs (`certs.tar.gz`), `data/thingsboard` |
| `backup.log`, `SHA256SUMS` | log and checksums |

### Manual step: copy `password.env.current` (on the source host)

`config/password.env.current` is managed by the dtaas-services CLI and is usually readable only by root.
If the script can't read it, it prints a command like the one below. Run it **on the source host**, after the
script finishes and before copying the backup:

```bash
sudo install -m 600 -o $(id -u) <project-dir>/config/password.env.current <backup-dir>/config/
```

Run it **in your own terminal**: `sudo` needs to ask for your password, which a `!` command inside
Claude Code can't do. This file is not included in `SHA256SUMS`.

Every backup gets a new timestamped folder, so use the exact command printed by that run.

## Step 2: copy to the target

```bash
rsync -a --progress backups/<timestamp> <target-host>:<dest>/
ssh <target-host> 'cd <dest>/<timestamp> && sha256sum -c SHA256SUMS'
```

The backup contains passwords and private keys. Copy it only between the two servers, and keep it mode 700.

## Step 3: prepare the target

On the target host, done by you or by Claude with the skill, following `SKILL.md` section 2:

1. Create a venv and run `pip install dtaas-services==<version with postgres:18.6>`, then
   `dtaas-services project generate --path <target-project-dir>`.
2. Merge the old `services.env` into the new one key by key. Keep the new ports and new passwords, except:
   - `POSTGRES_USER/PASSWORD/DB` must equal the source (the restored roles carry the source password).
   - `TB_SYSADMIN_EMAIL` and `TB_TENANT_ADMIN_PASSWORD` must equal the source (the CLI logs in to the restored TB
     with them).
   - `HOSTNAME`/`CERTS_SRC` must be set for the target.

   Copy `credentials.csv` and `password.env.current` (mode 600).
3. Put the target's TLS certificate and key in `<project>/certs/`, either as `fullchain.pem`/`privkey.pem` or
   certbot-style `fullchainN.pem`/`privkeyN.pem`.
4. Run `dtaas-services service clean`. It keeps `certs/` but deletes `data/thingsboard` and `log/thingsboard`.
   Only do this **before** restoring data.
5. **Run `setup-certs.sh` as root, in your own terminal:**

   ```bash
   cd /path/to/target/project
   sudo .claude/skills/tb-postgres-migration/scripts/setup-certs.sh .
   ```

   You can run it before starting Claude, or when the skill reaches this step and asks for it. It's safe to
   re-run, but run it again if you run `service clean` afterwards. It:
   - checks that the key matches the certificate, and renames `fullchainN.pem`/`privkeyN.pem` to the plain names
   - creates `postgres.crt/key`, `thingsboard-fullchain.pem`/`-privkey.pem`, `privkey-rabbitmq.pem`,
     `combined.pem` (MongoDB) and `privkey-influxdb.pem`, each owned by the service's UID/GID from
     `config/services.env`
   - recreates `data/thingsboard` and `log/thingsboard` owned by ThingsBoard (799)
   - ends with `ls -ln certs` so you can check the owners

   It replaces the cert part of `sudo dtaas-services host setup`, and unlike that command it doesn't need
   `CERTS_SRC` (e.g. `/etc/letsencrypt/...`).

## Step 4: restore and upgrade (on the target)

Start Claude Code with the skill on the target host:

```
/tb-postgres-migration <source-host> <target-host> /path/to/target/project
```

and ask for the restore. Claude follows `SKILL.md` section 3, confirming each step:

1. Start Postgres 18.6 only, load the roles (`globals.sql`), then `pg_restore --create` **every** dump in `db/`.
   This includes `thingsboard` and `swim` (an empty database with its own logins `swim_ntu` and `swim_reader`).
   `--create` recreates each database with its owner and grants (e.g. `GRANT CONNECT ON DATABASE swim`).
   Then run `vacuumdb --analyze-in-stages`.
2. Compare row counts with `meta/tb-counts.txt`, and database owners/grants with `meta/database-acls.txt`.
3. Upgrade the ThingsBoard schema **4.2.1 → 4.3.1.8** (CE) in one step, with a database checkpoint before and
   after. Claude first checks that the image is CE (no `pe` upgrade directory). After the upgrade, every
   count matches except `widgets_bundle`/`widget_type` (the system widgets are reloaded).
4. Start ThingsBoard and check HTTPS/MQTTS certs, sysadmin and tenant-admin login, devices, rule chains and
   MQTT telemetry. If the tenant-admin login fails, the password was probably changed in the UI on the source.
   Use the real one, or set a new one as sysadmin.

> Never run `dtaas-services service install -s thingsboard` or `service clean` after data has been restored.
> Install re-runs schema creation on a populated database, and clean deletes it.

## Step 5: cut over

1. Run the final `--stop-tb` backup on the source, then repeat steps 2–4 with it.
2. Repoint devices, DTaaS configuration and DNS to the target host.
3. Stop and remove the `postgres` and `thingsboard` containers on the source. They have `restart: always`
   and come back after a reboot if they are only stopped.

## Rollback

Until clients are repointed, the source host is unchanged. If `--stop-tb` was used, run `docker start thingsboard` there.
