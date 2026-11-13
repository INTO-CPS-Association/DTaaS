# dtaas-services-backup skill

A Claude Code skill to back up **any selection** of the DTaaS platform services on **Linux, macOS or
Windows**, verify the backups, and guide their restore on a host that runs newer images
(dtaas-services 1.2.0). Only the services you list are backed up.

| Service | Source | Target (1.2.0) | Backup method |
|---|---|---|---|
| `postgres` | 16.11 | 18.6 | `pg_dumpall --globals-only` + `pg_dump -Fc --create` per database |
| `thingsboard` | tb-node 4.2.1 | 4.3.1.8 CE | TB files + counts + its own dump of the `thingsboard` DB and roles |
| `grafana` | 12.3.1 | 13.2.4 | copy of `/var/lib/grafana`, SQLite integrity-checked |
| `influxdb` | 2.7 | 2.9.1 | `influx backup` (full), manifest-checked |
| `mongodb` | 8.0.3 | 9.0.4 | `mongodump --archive`, header-checked |
| `rabbitmq` | 4.2.2 | 4.4.0 | `rabbitmqctl export_definitions` |

GitLab isn't supported.

## Files

```
.claude/skills/dtaas-services-backup/
├── SKILL.md                     # instructions Claude follows
├── README.md                    # this file
├── CROSS-PLATFORM.md            # Linux/macOS/Windows: why Python, what is safe where, Windows setup (WSL2)
├── .gitattributes               # LF line endings on every OS
├── restore/                     # one restore guide per service; Claude reads only the ones needed
│   ├── postgres-thingsboard.md  # maps to the tested tb-postgres-migration procedure
│   └── grafana.md  influxdb.md  mongodb.md  rabbitmq.md
└── scripts/
    ├── backup.py                # the tool: estimate | backup | verify | restore (Python >= 3.10, stdlib only)
    ├── dtaas_backup/
    │   ├── cli.py               # options, checks, selection, INCOMPLETE marker, checksums, verify
    │   ├── common.py            # docker calls, permissions, sizes, checksums (cross-platform rules)
    │   ├── services/            # backup: one module per service: estimate(ctx), backup(ctx)
    │   │   └── postgres.py thingsboard.py _pg.py grafana.py influxdb.py mongodb.py rabbitmq.py
    │   └── restore/             # restore: run.py (checks, settings, ports, certs, report), core.py, env.py,
    │       └── postgres.py thingsboard.py grafana.py influxdb.py mongodb.py rabbitmq.py   # check/restore/verify
    ├── backup.sh                # OLD bash version (Linux only), kept as a fallback until the Windows test
    └── services/*.sh
```

To add a service: add `dtaas_backup/services/<name>.py` with `estimate(ctx)` and `backup(ctx)`, add the name to
`ORDER` in `services/__init__.py`, and add `restore/<name>.md`.

## Using the skill

Start Claude Code in the folder that contains `.claude/` (e.g. `<backup-dir>`) and run:

```
/dtaas-services-backup <source-host> <target-host> <services|all> [target-project-dir]
```

Examples:

```
/dtaas-services-backup <source-host> <target-host> influxdb
/dtaas-services-backup <source-host> <target-host> grafana,rabbitmq
/dtaas-services-backup <source-host> <target-host> postgres,thingsboard
/dtaas-services-backup <source-host> <target-host> all
```

Then ask for an estimate, a backup, a verification or a restore. If you leave out the services, Claude asks.
It never adds services you didn't list; it only explains dependencies, e.g. that ThingsBoard's data lives in
Postgres.

## Running the tool directly

Use the dtaas-services venv's Python:

```bash
# Linux / macOS
PY=/path/to/project/.venv/bin/python
B=.claude/skills/dtaas-services-backup/scripts/backup.py
$PY $B estimate --services all
$PY $B backup --services grafana,rabbitmq --source-host <source-host> --target-host <target-host>
$PY $B verify backups/<timestamp>
```

```powershell
# Windows (PowerShell, cmd or Git Bash work the same)
$PY = "C:\path\to\project\.venv\Scripts\python.exe"
$B  = ".claude\skills\dtaas-services-backup\scripts\backup.py"
& $PY $B estimate --services all
& $PY $B backup --services influxdb --source-host <this-pc> --target-host <target>
& $PY $B verify backups\<timestamp>
```

| Command / option | Meaning |
|---|---|
| `estimate --services <list\|all>` | expected size per service, writes nothing |
| `backup --services <list\|all>` | comma-separated, any order. They always run in this order: postgres, thingsboard, grafana, influxdb, mongodb, rabbitmq |
| `--target-host` (required), `--source-host` | recorded in `info.txt`. `--source-host` defaults to the hostname, with a warning if they differ |
| `--stop-tb` | stop ThingsBoard before any dump and leave it stopped (needs `thingsboard` in the list) |
| `--mongo-gzip` | gzip the MongoDB archive |
| `--mongo-db DB`, `--influx-bucket ORG/BUCKET` | **partial** backup (tests, single tenant); recorded in `info.txt` |
| `--backup-root DIR` | where `<timestamp>/` is created (default: `backups/` next to `.claude/`, or `BACKUP_ROOT`) |
| `verify <dir>` | checksums + completeness, on any OS, no Docker needed |
| `restore <dir> --services <list\|all> --target-project DIR --target-host HOST` | restore into a fresh dtaas-services project on this computer |
| `restore ... --dry-run` | every check + the plan (ports, settings, steps); changes nothing |
| `restore ... --yes [--port KEY=VALUE ...]` | run after the plan and ports were approved; `--port` replaces a proposed (source) port |
| `restore ... --tb-image IMAGE` | ThingsBoard CE image for the upgrade (default `thingsboard/tb-node:4.3.1.8`; 4.4+ refused) |

Environment overrides: `BACKUP_ROOT`, and `<SERVICE>_CONTAINER` (e.g. `MONGODB_CONTAINER=mongo2`).
Exit codes: 0 ok, 1 failure (the backup is left marked `INCOMPLETE`), 2 wrong arguments.

## Output

`backups/<timestamp>/` contains `info.txt`, `backup.log` and `SHA256SUMS`, plus one folder per listed
service and `projects/<install-dir>/` holding the compose files, `services.env` and credentials of each install
the services came from. See SKILL.md for the full layout. While a backup runs, or after it fails, the folder
contains `INCOMPLETE`; `verify` refuses such a folder.

At the end, the tool lists **warnings**. On a typical source host there are two:
- `config/password.env.current` is root-only. Copy it yourself with the printed command: on Linux/macOS
  `sudo install -m 600 -o <uid> <src> <dst>` in your own terminal, on Windows `Copy-Item` in an
  Administrator PowerShell. Files copied by hand aren't in `SHA256SUMS`; `verify` lists them separately.
- RabbitMQ has 1 queued message (vhost `accurate`) that isn't in the backup.

## Cross-platform design

Full explanation, including which restores are safe on Windows and macOS and the recommended Windows setup
(project inside WSL2): see [CROSS-PLATFORM.md](CROSS-PLATFORM.md). In short:

- Python standard library only: no `numfmt`/`du -b`/`df --output`/`sha256sum`/GNU `tar` on the host.
- Every command is an argument list passed straight to `docker`: no shell quoting, no Git Bash path rewriting.
- Binary data goes straight from `docker` to a file opened in binary mode, never through memory or text mode.
- Text metadata is written with LF endings everywhere, so backups made on any OS are identical.
- Access is restricted to the current user with `chmod 700` (Linux/macOS) or `icacls` (Windows).
- Hostname checks ignore case and domain (Windows reports upper case).
- Docker Desktop paths like `/run/desktop/mnt/host/c/...` are mapped back to `C:\...`.

## Tests done on a Linux host, 2026-11-12

| Test | Result |
|---|---|
| Parity: bash vs Python backup of `postgres,thingsboard,grafana,rabbitmq` | 55 files compared: **identical**, apart from three expected differences: pg_dump's random `\restrict` key, Docker's mount order, and a trailing blank line in bash's `mounts.txt` |
| `sha256sum -c` on the Python backup / `verify` on the bash backup | OK / OK (56 files) |
| Failure (missing container) | exit 1, `INCOMPLETE` left, `verify` refuses it |
| `influxdb` partial (`riccardo/GreenHouseDemo`) | 3.0 MB, manifest ok (6 entries) |
| `mongodb` partial (`admin`) | archive header ok, `mongorestore --dryRun` ok |
| Argument errors | exit 2 |

These tests found a bug present in both versions: the MongoDB collection count queried the internal `config`
database, which the root user can't read. A full MongoDB backup would have failed; this is now fixed in both.

**Not yet tested:**
- full InfluxDB and MongoDB backups (about 59 GB and 244 GB)
- any run on Windows or macOS
- a real `restore` (only dry runs so far; see "Testing the restore on the target host")

Restore tests done on a Linux host (dry runs, against a test project from the 1.2.0 templates):
- refuses: live containers with the same names, ports in use, a non-empty data dir, the wrong `--target-host`,
  a service not in the backup, Windows-drive paths
- proposes the source ports (e.g. Grafana 8098, PostgreSQL 8080), and takes `--port` overrides
- `services.env` values are read identically by `python-dotenv` (the CLI) and `docker compose`, including
  passwords with spaces, quotes, `#`, `\` and `$`; a value with both `'` and `$` is refused

## Sizes on a source host (2026-11-12)

| Service | Estimate | Actual backup |
|---|---|---|
| postgres | 163 MB on disk | 22 MB (`thingsboard` 22 MB, `swim` 4 KB) |
| thingsboard | 156 MB on disk | 23 MB (own DB copy; postgres + thingsboard together: 44 MB) |
| grafana | 1.3 MB | 1.3 MB |
| influxdb | 59 GB on disk | not run yet (a 10 MB test bucket compressed to 3.0 MB) |
| mongodb | 244 GB | not run yet (the data barely compresses) |
| rabbitmq | 13 KB | 56 KB incl. metadata |

## Copy and restore

```
scp -r backups/<timestamp> <target-host>:<dest>/          # or rsync -a
<python> backup.py verify <dest>/<timestamp>              # on <target-host>
```

Then, on the target (see SKILL.md section 4 for preparation and details):

```
<python> backup.py restore <dest>/<timestamp> --services all --target-project <project> --target-host <target-host> --dry-run
<python> backup.py restore <dest>/<timestamp> --services all --target-project <project> --target-host <target-host> --yes [--port KEY=VALUE ...]
```

- **Before any change, it checks:**
  - the backup (`verify`, not `INCOMPLETE`, partial only with confirmation)
  - the hostname
  - container-name collisions with other compose projects
  - data on a Linux filesystem
  - empty data dirs and free ports
- **It proposes the source's ports.** You confirm them, or give new ones with `--port`.
- **It writes the source admin credentials into `services.env`** before the first start, keeping the old file.
- **It creates the per-service certificate files.**
- **It restores the services in order:** postgres, thingsboard (with the 4.3.1.8 CE upgrade and checkpoints),
  rabbitmq, grafana, influxdb, mongodb.
- **Afterwards it checks each one and writes `restore-<timestamp>/report.txt`,** including the old -> new port for each client.

### Testing the restore on the target host

The restore command has been dry-run on a Linux host against a test project, but no real restore has run yet.
Suggested order on the target host, each into a **fresh** project (`dtaas-services project generate`, `HOSTNAME`
set, target certs in `certs/`, services to restore **not** started):

1. `grafana,rabbitmq` from `20261112-140330`: quick, checks settings, ports, certs, root-container ownership.
2. `postgres,thingsboard` from `20261112-140330` (or a new backup): compare with the earlier manual restore
   (counts, schema `4003001008|CE`, logins).
3. `influxdb` and `mongodb`: make partial backups first (`--influx-bucket`, `--mongo-db`; seconds), then the full ones.

Run each with `--dry-run` first. Between tries, `dtaas-services service remove --volumes -s <svc>` (or
`service clean -s <svc>`) empties the target again.

## Relation to tb-postgres-migration

`tb-postgres-migration` is the tested restore and upgrade procedure for PostgreSQL + ThingsBoard, and
`restore/postgres-thingsboard.md` points to it. Its own `backup-tb-postgres.sh` (bash, Linux) still works.
`backup --services postgres,thingsboard` here produces the same dumps, laid out per service.
