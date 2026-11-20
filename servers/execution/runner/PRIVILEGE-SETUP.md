# Privilege Setup

This guide is for operators who run the runner on Linux and want its
scripts to run as a second account. With that setting, a script can no
longer read `runner.yaml` with the MQTT password, the signing key, the
database or the runner's environment, and can no longer rewrite the
scripts that later runs execute. The guide gives the commands for
Ubuntu: the two accounts, the files and their modes, three ways to
start the runner, and the checks that show the separation works.
[SECURITY-MODEL.md](SECURITY-MODEL.md) explains the threats behind it
and what the setting leaves open.

The setting works on Linux only. The runner refuses to start with it on
Windows or any other platform.

## How It Works

The runner runs as one account, `dt-runner` below, and the scripts as
another, `dt-script`. The runner holds three Linux capabilities, and no
other privilege:

| Capability   | For                                                 |
| :----------- | :-------------------------------------------------- |
| `CAP_SETUID` | starting a script as the script account's uid       |
| `CAP_SETGID` | setting its gid and its groups                      |
| `CAP_KILL`   | stopping the script, which another account now owns |

The runner starts each script through util-linux `setpriv`:

```bash
/usr/bin/setpriv --reuid=UID --regid=GID --init-groups \
  --inh-caps=-all --ambient-caps=-all --no-new-privs -- SCRIPT
```

`setpriv` switches to the script account, clears every capability, sets
no-new-privs, and then becomes the script in the same process. The
script runs in the run directory with an environment that the runner
builds: `HOME`, `USER` and `LOGNAME` of the script account,
`PATH=/usr/local/bin:/bin:/usr/bin`, the runner's `TMPDIR` and `LANG`,
and the runner's own variables such as `RUNNER_URL` and `RUNNER_TOKEN`.

The runner never changes a mode or an owner. At startup it checks the
accounts, its capabilities and the files, and refuses to start on any
mismatch, naming every path that is wrong.

## 1. Create the Accounts

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin dt-runner
sudo useradd --system --no-create-home --shell /usr/sbin/nologin dt-script
```

Neither account is root, and `dt-script` must be in none of the groups
of `dt-runner`. `id dt-script` shows its groups:

```text
uid=998(dt-script) gid=998(dt-script) groups=998(dt-script)
```

The runner reads the accounts from `/etc/passwd` and `/etc/group`
only, so make them local accounts, not LDAP or other NSS sources.

`setpriv` comes with util-linux, which every Ubuntu installs at
`/usr/bin/setpriv`. Node.js 24 or later must be installed for the
runner.

## 2. Lay Out the Files

One directory per digital twin (DT), owned by `dt-runner`, holds
everything. The example is for the DT `hospital-1`:

| Path                                     | Owner and group       | Mode  |
| :--------------------------------------- | :-------------------- | :---- |
| `/srv/dt/hospital-1`                     | `dt-runner:dt-runner` | `755` |
| `/srv/dt/hospital-1/runner.yaml`         | `dt-runner:dt-runner` | `600` |
| `/srv/dt/hospital-1/hospital.fsm.yaml`   | `dt-runner:dt-runner` | `600` |
| `/srv/dt/hospital-1/keys`                | `dt-runner:dt-runner` | `700` |
| `/srv/dt/hospital-1/keys/hospital-1.key` | `dt-runner:dt-runner` | `600` |
| `/srv/dt/hospital-1/db`                  | `dt-runner:dt-runner` | `700` |
| `/srv/dt/hospital-1/scripts`             | `dt-runner:dt-runner` | `755` |
| each script in `scripts`                 | `dt-runner:dt-runner` | `755` |
| each file a script reads, in `scripts`   | `dt-runner:dt-runner` | `644` |
| `/srv/dt/hospital-1/run`                 | `dt-script:dt-runner` | `770` |

```bash
DT=/srv/dt/hospital-1
sudo install -d -o root -g root -m 755 /srv/dt
sudo install -d -o dt-runner -g dt-runner -m 755 "$DT"
sudo install -d -o dt-runner -g dt-runner -m 700 "$DT/keys" "$DT/db"
sudo install -d -o dt-runner -g dt-runner -m 755 "$DT/scripts"
sudo install -d -o dt-script -g dt-runner -m 770 "$DT/run"
sudo install -o dt-runner -g dt-runner -m 600 runner.yaml hospital.fsm.yaml "$DT/"
sudo install -o dt-runner -g dt-runner -m 600 hospital-1.key "$DT/keys/"
sudo install -o dt-runner -g dt-runner -m 755 scripts/* "$DT/scripts/"
```

Why each mode:

- `runner.yaml`, the state machine file and the key are `600`: the
  script account may neither read nor write them.
- The database directory is `700`, not just the file: SQLite creates
  its journal beside the file, with the runner's umask, after the
  runner has checked the layout. A directory that grants the script
  account nothing keeps those files out of its reach.
- The scripts are not writable by the script account, nor is any
  directory above them, so a script can not change what later runs
  execute. The script account needs `r` and `x` on each script and `x`
  on the directories above it.
- The run directory is the working directory of every script and the
  one place where a script may write. Its files are shared between the
  runs of all scripts. The runner, through the group `dt-runner`, must
  be able to enter it, as it starts each script there.
- No directory above a protected file may be writable by the script
  account: with a writable directory, it could rename a file away and
  put its own in its place. `/tmp` is the one safe exception, as its
  sticky bit keeps an account from renaming what it does not own.

Keep ACLs off these paths: the runner judges a path by its mode, owner
and group only. `getfacl -R /srv/dt/hospital-1` shows any ACL.

## 3. Configure the Runner

Add a `scripts` section to `runner.yaml`:

```yaml
id: 'hospital-1'
port: 5000
location: 'scripts'
commands: ['open', 'admit', 'discharge']
stateMachine: 'hospital.fsm.yaml'
database: 'db/hospital.db'
auth:
  principals:
    - name: 'manager-1'
      role: 'manager'
      publicKey: 'mCpoaytWvGJ9K0lxNlSNw6sjUG7UezRWtxPvL1pyxKA'
  key: 'keys/hospital-1.key'
scripts:
  user: 'dt-script' # a name or a uid of /etc/passwd
  # group: 'dt-script' # optional; a group name or gid instead of the primary group
  runDirectory: 'run' # relative to runner.yaml, or absolute
```

- `user` is required in the section. A uid needs an entry in
  `/etc/passwd`, as `setpriv --init-groups` refuses one without.
- `group` replaces the account's primary group. A group name must be
  in `/etc/group`; a gid is taken as it is.
- `runDirectory` is required in the section. It may be absolute, as
  `stateMachine` and `auth.key` may. `location` and `database` are
  always relative to `runner.yaml`, so keep the scripts and the database
  beneath its directory, as above.

Without the section the runner works as before: the scripts run as the
runner's account, in its working directory, with its whole environment.

A state machine file that declares, in its `env` or a state's `env`, a
variable that the dynamic loader or the C library reads a file from is
refused with the setting: names starting with `LD_`, `MALLOC_` or
`LC_`, and `LANG`, `LANGUAGE`, `TMPDIR`, `GCONV_PATH`, `GETCONF_DIR`,
`GLIBC_TUNABLES`, `HOSTALIASES`, `LOCALDOMAIN`, `LOCPATH`, `NIS_PATH`,
`NLSPATH`, `RESOLV_HOST_CONF`, `RES_OPTIONS` and `TZDIR`. `setpriv`
holds the runner's capabilities until it switches, and the loader would
honour such a variable in it.

## 4. Start the Runner

The runner must start as `dt-runner` with the three capabilities in its
ambient set, which is the set that passes to `setpriv`. Never start it
as root: it refuses to.

### With systemd

`/etc/systemd/system/dt-runner-hospital-1.service`:

```ini
[Unit]
Description=DT runner of hospital-1
After=network-online.target

[Service]
User=dt-runner
Group=dt-runner
AmbientCapabilities=CAP_SETUID CAP_SETGID CAP_KILL
CapabilityBoundingSet=CAP_SETUID CAP_SETGID CAP_KILL
NoNewPrivileges=yes
WorkingDirectory=/srv/dt/hospital-1
ExecStart=/usr/bin/node /opt/runner/dist/src/main.js --config /srv/dt/hospital-1/runner.yaml
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

`/opt/runner` stands for where the runner is installed, and
`/usr/bin/node` for a Node.js of version 24 or later. `NoNewPrivileges`
does not take the ambient capabilities away, and `setpriv` needs no
setuid bit. Give `TimeoutStopSec` at least the longest `stopGrace` of
the runner plus the time a script needs to clean up. These lines follow
`systemd.exec(5)` and were not run for this guide (_unverified_).

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dt-runner-hospital-1
```

### With setpriv, from root

Where there is no systemd, root starts the runner through `setpriv`,
which needs the capabilities in the inheritable set before it can make
them ambient:

```bash
sudo setpriv --reset-env --reuid=dt-runner --regid=dt-runner --init-groups \
  --inh-caps=+setuid,+setgid,+kill --ambient-caps=+setuid,+setgid,+kill \
  -- /usr/bin/node /opt/runner/dist/src/main.js --config /srv/dt/hospital-1/runner.yaml
```

`--reset-env` belongs on this line: `sudo` keeps `HOME=/root`, which the
runner would otherwise pass on; with it, `setpriv` sets `HOME`, `USER`
and `LOGNAME` of `dt-runner`. Run from a script, put `exec` before
`setpriv`, so that a `SIGTERM` to the script's process reaches the
runner. This line, with the test's own account in place of
`dt-runner`, is how the runner's end-to-end test starts it in CI.

### With Docker

Docker gives no ambient capability to a process that runs as a
non-root `USER`, so the container starts as root with only the three
capabilities, and an entrypoint drops to `dt-runner` through `setpriv`.
`no-new-privileges` does not stop that, as `setpriv` is no setuid
binary. The image needs both accounts:

```dockerfile
RUN useradd --system --no-create-home --shell /usr/sbin/nologin dt-runner \
  && useradd --system --no-create-home --shell /usr/sbin/nologin dt-script
```

```yaml
services:
  runner:
    user: root # the entrypoint drops to dt-runner
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
      - KILL
    security_opt:
      - no-new-privileges:true
    entrypoint:
      - setpriv
      - --reset-env
      - --reuid=dt-runner
      - --regid=dt-runner
      - --init-groups
      - --inh-caps=+setuid,+setgid,+kill
      - --ambient-caps=+setuid,+setgid,+kill
      - --
      - node
      - /opt/runner/dist/src/main.js
      - --config
      - /srv/dt/hospital-1/runner.yaml
```

The mounted files need the owners and modes of
[Lay Out the Files](#2-lay-out-the-files), by the uids of the accounts
in the image. `--reset-env` drops the variables that compose sets; the
runner reads its whole configuration from `runner.yaml`, so it needs
none. These lines were not run for this guide (_unverified_).

## 5. Check the Separation

The runner's capabilities, by its pid:

```bash
grep -E '^Cap(Eff|Amb)' /proc/$(pgrep -u dt-runner -f runner.yaml)/status
```

```text
CapEff: 00000000000000e0
CapAmb: 00000000000000e0
```

`e0` is `CAP_SETUID`, `CAP_SETGID` and `CAP_KILL`. With `capsh` of the
package `libcap2-bin`, the same start line with `capsh --print` in place
of the runner shows `Current: cap_kill,cap_setgid,cap_setuid=eip` and
the three in its `Ambient set`.

The script account can read none of the runner's files, and write no
script:

```bash
sudo -u dt-script cat /srv/dt/hospital-1/runner.yaml
sudo -u dt-script cat /srv/dt/hospital-1/keys/hospital-1.key
sudo -u dt-script ls /srv/dt/hospital-1/db
sudo -u dt-script touch /srv/dt/hospital-1/scripts/intruder
sudo -u dt-script touch /srv/dt/hospital-1/run/probe
```

The first four end with `Permission denied`; the last succeeds, so
remove `run/probe` again.

The runner names the account in its health:

```bash
curl -s http://localhost:5000/health
```

```json
{
  "status": "ok",
  "uptime": 4,
  "mqtt": "connected",
  "database": "file",
  "scripts": { "user": "dt-script" }
}
```

A script that prints `id` and
`grep -E '^(Cap|NoNewPrivs)' /proc/$$/status` shows the script
account with only its own group, every `Cap*` line at zero but
`CapBnd`, and `NoNewPrivs: 1`. `CapBnd` keeps what the runner was given,
as clearing it would need `CAP_SETPCAP`; no-new-privs makes it moot.

## When the Runner Refuses to Start

Every error of the setting ends with `See PRIVILEGE-SETUP.md.`

| Error                                                                | Fix                                                                             |
| :------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| `scripts.user in FILE is supported on Linux only.`                   | Remove the `scripts` section on Windows and other platforms.                    |
| `scripts.user refuses a runner that runs as root.`                   | Start the runner as `dt-runner`, as in [Start the Runner](#4-start-the-runner). |
| `scripts.user needs /usr/bin/setpriv, which is missing.`             | Install util-linux.                                                             |
| `... as ambient capabilities of the runner; missing: CAP_KILL.`      | Start the runner with the three capabilities ambient.                           |
| `scripts.user dt-scrip is not in /etc/passwd.`                       | Fix the name, or create the account.                                            |
| `scripts.user ... must be neither root nor the runner's account ...` | Use a second, non-root account with a non-root group.                           |
| `Cannot run the scripts as dt-script (scripts.user in FILE):`        | Fix each path that the following lines name; see below.                         |

A runner whose capabilities come from file capabilities on `node`
(`setcap`) is refused too: those do not pass to `setpriv`, and they
would reach every Node program on the host.

The layout error names each path, the rule it breaks, its mode, and
the owner or group that decides the script account's access, and never
the content of a file:

```text
Error: Cannot run the scripts as dt-script (scripts.user in /srv/dt/hospital-1/runner.yaml):
✖ /srv/dt/hospital-1/runner.yaml is readable by dt-script: mode 644, owner 997, group 997
✖ /srv/dt/hospital-1/keys/hospital-1.key is readable by dt-script: mode 640, group 1001 is a group of dt-script
✖ /srv/dt/hospital-1/scripts/open is writable by dt-script: mode 775, group 1001 is a group of dt-script
✖ /srv/dt is writable by dt-script, above a protected path: mode 777, owner 0, group 0
✖ /srv/dt/hospital-1/run is not writable by dt-script: mode 755, owner 997, group 997
See PRIVILEGE-SETUP.md.
```

| Line                                             | Fix                                                                   |
| :----------------------------------------------- | :-------------------------------------------------------------------- |
| `... is readable by` or `is writable by`         | `chmod 600` for a file of the runner, `chmod 755` for a script        |
| `... grants access to`                           | `chmod 700` on the database directory                                 |
| `... is writable by ..., above a protected path` | take `w` away from the script account on that directory               |
| `... is not writable by`                         | give the run directory to the script account, as in the table above   |
| `... is not searchable by`                       | give the script account `x` on that directory above the run directory |
| `... does not exist or is not a directory`       | create the run directory                                              |

A path is readable only if the script account can search every
directory above it, so a file of mode `644` beneath a directory of mode
`700` passes. A symbolic link is judged by its target.

## What Stays Open

The second account keeps a script from the runner's files and
environment. It does not keep it from:

- the network: a script reaches what the runner reaches;
- the run directory, which every script shares, run after run;
- `RUNNER_TOKEN`, which the script holds by design for its routes of
  the runner's API;
- the kernel, and anything that the script account can read elsewhere
  on the host, such as world-readable files.

[SECURITY-MODEL.md](SECURITY-MODEL.md) lists these risks, and the
microVM or container that an orchestrator can put around the whole
runner against them.
