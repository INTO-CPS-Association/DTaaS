# Cross-platform backup and restore: Linux, macOS, Windows

This document explains when backing up and restoring the DTaaS platform services is safe on each operating
system, and why. It applies to this skill (`dtaas-services-backup`) and to services installed with the
`dtaas-services` pip package.

**Summary:**
- **Backups** are safe on Linux, macOS and Windows.
- **Restores** are safe on every OS as long as the databases keep their data on a **Linux filesystem**. On
  Windows that means the `dtaas-services` project must live **inside WSL2**, not on `C:\`.

iOS/iPadOS can't run Docker, so neither backup nor restore is possible there. "Mac" below means macOS.

---

## 1. Why the tool is written in Python

The first version was bash plus Linux (GNU) tools. That doesn't work elsewhere:

| Used by the bash version | Windows | macOS |
|---|---|---|
| `bash` scripts | not built in (Git Bash or WSL needed); line endings become CRLF on checkout | bash 3.2 has no `declare -A`, so the scripts fail |
| `numfmt`, `df --output`, `du -sb`, `readlink -f`, `sort -z` | missing or different | missing (macOS has the BSD versions) |
| `sha256sum` | Git Bash only | missing (`shasum -a 256` instead) |
| `chmod 700` / `umask` to protect secrets | no effect on NTFS | OK |
| `docker exec ... /var/lib/...` from Git Bash | Git Bash rewrites `/var/...` into `C:\...` paths | OK |
| `cmd < file` to feed a dump to a container | PowerShell has no `<`; Windows PowerShell 5 corrupts binary data in pipes | OK |

`scripts/backup.py` replaces it. It uses only the Python standard library, and every DTaaS host already has
Python 3.10 or newer, because `dtaas-services` needs it. Its design rules:

- Every command is an argument list passed straight to `docker`: no shell, no quoting problems, no Git Bash
  path rewriting. It behaves the same from bash, zsh, PowerShell, cmd or Git Bash.
- Binary data goes straight from `docker` to a file opened in binary mode, never through memory or text mode
  (the MongoDB archive can be hundreds of GB).
- Backup files are never fed to a command through stdin (`<`): files are copied into containers, or the backup
  folder is mounted into a temporary container.
- Text metadata is written with LF endings on every OS, so backups made on any OS are identical.
- Access to the backup folder is limited to the current user: `chmod 700` on Linux/macOS, `icacls` on Windows.
- Hostname checks ignore case and domain (Windows reports names in upper case).
- Docker Desktop paths such as `/run/desktop/mnt/host/c/...` are mapped back to `C:\...`.
- Checksums use the `sha256sum` format, so `sha256sum -c` still works on Linux, and `backup.py verify`
  works everywhere, without Docker.

Run it with the dtaas-services venv's Python: `<project>/.venv/bin/python` on Linux/macOS,
`<project>\.venv\Scripts\python.exe` on Windows. Avoid the `python3` Microsoft Store stub on Windows.

## 2. Does moving from bash to Python reduce reliability?

**No.** The tools that actually read and write the data are unchanged, and they run inside the containers:
`pg_dump`/`pg_restore`, `mongodump`/`mongorestore`, `influx backup`/`influx restore`, `rabbitmqctl` and
`tar`. Dump consistency, compatibility with newer images, and caveats such as MongoDB's missing
point-in-time come from these tools, not from the script language.

Python's error handling is more reliable than `set -euo pipefail`, which has known gaps. The only temporary
risk is new bugs in rewritten code. These steps prevent that:

| Risk | How it is prevented |
|---|---|
| New bugs in rewritten code | **Parity test:** bash and Python backed up the same services on a Linux source host. All 55 files matched, apart from three expected differences: pg_dump's random `\restrict` key, Docker's mount order, and a blank line in the bash `mounts.txt`. |
| Corrupted binary data | Binary-mode files only, written directly by `docker`. |
| Quoting of commands run inside containers | Values are passed as separate arguments (`$1`, `$2`), not embedded in quotes. |
| Long dumps killed by timeouts | No timeouts on dump/restore steps. |
| A half-written backup after Ctrl-C or a crash | An `INCOMPLETE` marker exists until the end; `verify` and restore refuse such a backup. |
| A file that is complete but unusable | Usability checks per service: PostgreSQL table-of-contents listing, Grafana `integrity_check`, InfluxDB manifest (every file present, right size), MongoDB archive header, RabbitMQ JSON. For MongoDB in depth: `mongorestore --dryRun`. |

The tests also found a bug present in both versions: the MongoDB document count queried the internal `config`
database, which root can't read, so a full MongoDB backup would have failed. It is fixed in both.

## 3. Backing up: safe on every OS

Every backup is made **through the database software itself**. It reads the data the way the database sees
it, not as raw files. Therefore:

- The backup is as consistent on Windows and macOS as on Linux, with the same caveats: MongoDB (standalone) isn't
  point-in-time, RabbitMQ queued messages aren't included, and ThingsBoard needs `--stop-tb` for a cutover backup.
- The backup is **portable**: it doesn't depend on the OS, the filesystem or the CPU. A backup from an x86 Linux
  server restores correctly on an Apple Silicon Mac. Copying raw data folders wouldn't.
- The backup only reads. Nothing on the source changes, except ThingsBoard being stopped with `--stop-tb`.
- If a source keeps its data on risky storage (see section 4), the backup doesn't fix that, but it is the
  **safe way out**: export through the database, then restore onto a Linux filesystem.

## 4. Restoring: where the data lives is what matters

### Containers alone don't make it safe

Containers isolate the programs, not where the data is stored. The `dtaas-services` compose files use **bind
mounts**: each container writes its data into a folder of the project on the host:

```
postgres:  ./data/postgres  -> /var/lib/postgresql/data/pgdata
mongodb:   ./data/mongodb   -> /data/db
influxdb:  ./data/influxdb  -> /var/lib/influxdb2
rabbitmq:  ./data/rabbitmq  -> /var/lib/rabbitmq
grafana:   ./data/grafana   -> /var/lib/grafana
```

On Windows and macOS, Docker runs the containers inside a Linux virtual machine. Where the database files
really end up depends on where the **project folder** is:

| Project folder | Database files are on | Safe? |
|---|---|---|
| Linux server (e.g. the target host) | ext4/xfs | **Yes** |
| Windows, inside **WSL2** (`\\wsl$\Ubuntu\home\...`) | ext4 inside the VM | **Yes**, same as Linux |
| Windows or macOS, **Docker named volumes** | the VM's Linux filesystem | **Yes** (but see the note below) |
| macOS folder (`/Users/...`, APFS via VirtioFS) | macOS disk, through Docker Desktop file sharing | **Test/dev only:** owners are emulated and PostgreSQL usually works, but it's slower and less crash-safe than a Linux disk |
| Windows drive (`C:\...`, NTFS; inside WSL this is `/mnt/c/...`) | NTFS, through Docker Desktop file sharing | **No** (reasons below) |

Why a Windows drive is unsafe:
- File owners and permissions aren't kept. PostgreSQL refuses a key or data folder that others can read, so it
  usually won't start. ThingsBoard (uid 799), MongoDB and InfluxDB also expect specific owners.
- PostgreSQL, MongoDB and InfluxDB rely on the disk confirming that writes really happened. Folders shared into
  the Docker VM from Windows don't reliably do that, so a crash or power loss can corrupt data. MongoDB warns
  against running on such shared folders.

Note on named volumes: switching the compose files to named volumes makes the data safe, but it moves away
from what `dtaas-services` generates, and the CLI's own handling of `data/` (e.g. `service clean`) would no
longer match. Prefer a project inside WSL2.

### Recommended Windows setup

Create the `dtaas-services` project **inside WSL2**, from a WSL2 (Ubuntu) terminal, **not** under `/mnt/c/...`:

```bash
cd ~ && mkdir dtaas && cd dtaas
python3 -m venv .venv && . .venv/bin/activate
pip install dtaas-services
dtaas-services project generate
```

This works with Docker Desktop (WSL2 backend) or Docker Engine installed inside WSL2. Everything then behaves
as on the Linux servers: data, permissions, certificates, and the restore steps written for bash. Most
Windows-only concerns (PowerShell, `<` redirection, CRLF) also disappear, because the commands run in a Linux shell.

### What the restore tool checks

Before restoring, the tool reads each target service's mounts with `docker inspect`:
- **Stop with an explanation** when a database's data folder is on a Windows drive (`C:\...`, `/mnt/<drive>/...`
  or `/run/desktop/mnt/host/...`). The explanation says how to move the project into WSL2.
- **Warn and ask** for a macOS folder (`/Users/...`, `/host_mnt/...`).
- **Proceed** for a Linux filesystem or a Docker volume.

The `restore` command implements these checks; they run in every dry run.

## 5. Protections that apply on every OS

A restore is **destructive on the target**: it drops and recreates databases, replaces InfluxDB's users and
tokens, and overwrites Grafana's data. The protections are the same everywhere:

- The target's hostname must match `TARGET_HOST`.
- The backup must pass `verify` and must not be `INCOMPLETE`.
- The target services must be empty or freshly installed.
- A checkpoint is taken before each step (e.g. a PostgreSQL dump before the ThingsBoard upgrade).
- Every step is confirmed with the user, one service at a time.
- After each service, counts are compared with the backup's `meta/` files.
- The source is never touched: restore runs only on the target.

## 6. Windows to Windows (backup on Windows, restore on Windows)

| Step | Safe? |
|---|---|
| Backup on Windows | **Yes**, whatever storage the source uses |
| Copy (`scp -r`) and `backup.py verify` | **Yes** |
| Restore into a project inside WSL2, or Docker volumes | **Yes** |
| Restore into a project on `C:\` | **No**: the tool stops and explains how to use WSL2 |

Things specific to Windows:
- The backup's own Windows paths (e.g. `PROJECT_DIR=C:\...`) are only recorded; the target project folder is a
  skill argument.
- `services.env` edited in Notepad may have CRLF line endings, and a stray `\r` at the end of a password causes
  confusing login failures. The restore rewrites the merged settings file with LF endings.
- Root-only files such as `password.env.current` are copied by the user from an **Administrator PowerShell**
  with the `Copy-Item` command the tool prints (on Linux/macOS: `sudo install ...` in their own terminal).
- On the same machine the existing certificates can be reused; on a different machine, certificates for that
  machine's name are needed.
- If the source ran on `C:\`, restoring into the same kind of folder would add no new risk, but it would repeat
  the existing one. Restore into WSL2 instead.
- Windows Defender scanning large archives (MongoDB: hundreds of GB) slows things down but doesn't corrupt them.
- Backup files can be larger than 4 GB, so the backup disk must not be FAT32/exFAT.

## 7. macOS specifics

- Apple Silicon (ARM): PostgreSQL, MongoDB, InfluxDB, RabbitMQ and Grafana publish ARM images. **Check that
  `thingsboard/tb-node` has an ARM image** for the version in use before promising ThingsBoard restores on a Mac.
- macOS folders (VirtioFS) are acceptable for testing. For real data, use Docker named volumes or a Linux host.

## 8. Test status

| Test | Linux | Windows | macOS |
|---|---|---|---|
| `estimate`, `backup`, `verify` for postgres, thingsboard, grafana, rabbitmq | done (parity with bash) | not yet | not yet |
| InfluxDB / MongoDB partial backups | done | not yet | not yet |
| InfluxDB / MongoDB full backups (about 59 GB / 244 GB) | not yet | not yet | not yet |
| Restore (PostgreSQL + ThingsBoard, bash procedure) | done on a Linux target | not yet | not yet |
| `restore` command: dry runs incl. the data-location checks | done on a Linux host | not yet | not yet |
| `restore` command: real restore | next: a Linux target | not yet | not yet |

Rehearsal before relying on Windows or macOS: back up `grafana,rabbitmq` and run `verify`, then
`postgres,thingsboard`, and restore each into a **throwaway** target project on that OS.

## 9. Information needed per Windows machine

- Docker Desktop (WSL2 backend), or Docker Engine inside WSL2?
- Is the `dtaas-services` project folder inside WSL2 or on `C:\`?

`docker info` and `docker inspect postgres` (the `Mounts` section) answer both.
