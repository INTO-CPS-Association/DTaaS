# 18 Script User

## Spec

Today a script runs as the runner's own account, in the runner's
working directory, with the runner's whole environment
(`src/fsm/script-context.ts:152-158`, `inherited = process.env`). It
can read `runner.yaml` with the MQTT password, the signing key of
[15b](15b-signed-output.md), the database and
`/proc/<runner pid>/environ`, and it can rewrite the
scripts that later runs execute. This feature lets an operator run the
scripts as a second account on Linux, so that a script reaches none of
these. It implements choice C1 of
[SECURITY-MODEL.md](../../../../../../user/servers/execution/runner/security-model.md);
B3, a microVM or a container around the whole runner, stays the
orchestrator's. Size L.

The owner settled the design on 2026-10-27. Each part below is marked
as the owner's decision, or as this plan's call where the plan fills a
gap.

### Threats

The owner's decision:

- **A caller who abuses a permitted script through its input**: the
  JSON on stdin, the parameter values of `DT_PARAM_*`, the choice of
  script. [15a](15a-access-control.md) decides who may call; this is a
  caller who may.
- **A hostile DT author.** The author controls only the scripts
  directory and the state machine file. `runner.yaml`, the signing key,
  the MQTT credentials and the database belong to the uid and gid that
  launch the runner.

A compromised runner, a kernel exploit, the network a script reaches
and the files that scripts share between runs in the run directory stay
the accepted risks of SECURITY-MODEL.md.

### Configuration

Opt-in and off by default (owner's decision). The key names are this
plan's call:

```yaml
scripts:
  # the account that the scripts run as, on Linux only: a name or a uid
  user: 'dt-script'
  # optional; a group name or gid instead of the account's primary group
  group: 'dt-script'
  # the working directory of every script, the one place it may write
  runDirectory: '/var/lib/dt/hospital-1/run'
```

- **Why these names.** `runner.yaml` puts an optional feature in a
  section whose presence turns it on (`mqtt`, `notify`, `auth`), and
  names keys in camel case (`stateMachine`, `stopGrace`,
  `protocolVersion`, `publicKey`). `scripts` holds what applies to the
  scripts only; `user` and `group` are the words of systemd's `User=`
  and `Group=` and of Docker's `user`; `runDirectory` is
  SECURITY-MODEL.md's provisional name. `location`, `commands` and
  `stopGrace` stay where they are, as moving them would break every
  configuration.
- **The section is strict**, and `user` is required in it, so a stray
  `scripts:` fails, as a stray `auth:` does.
- **`user`** is a name, or a uid as a YAML integer or a string of
  digits. Either is looked up in `/etc/passwd`. A uid without an entry
  is refused (this plan's call): `setpriv --init-groups` needs one, and
  failed with "uid 4242 not found, --init-groups requires an user that
  can be found on the system" (util-linux 2.41.3), and the environment
  takes `HOME` from it.
- **`group`** is optional: a name looked up in `/etc/group`, or a gid.
  It replaces the account's primary group from `/etc/passwd`. This is
  how the owner's "numeric uid and gid accepted too" is offered (this
  plan's call).
- **`runDirectory`** is required in the section (this plan's call; the
  owner's default is the scripts location, see the contradiction
  below). It is resolved against the directory of `runner.yaml` with
  `path.resolve`, so an absolute path works, as for `stateMachine` and
  `auth.key` (this plan's call: a run directory often lives under
  `/var/lib`).

Without the section nothing changes: scripts run as the runner's
account, in its working directory, with its whole environment, on
Linux and Windows alike. The one difference is the `scripts: null`
field of [Health](#health).

**A contradiction in the settled decisions.** The owner gave the run
directory the default of the scripts location, and also ruled that the
scripts directory must not be writable by the script account while the
run directory must be. With the default, both rules apply to one
directory, so the layout check would always fail. This plan makes
`runDirectory` required under `scripts`. The alternative, keeping the
default and letting the check fail with a hint to set the key, is under
[Considered and Set Aside](#considered-and-set-aside).

### Startup Checks

With the section, `Config.loadConfig` runs these checks in order. Each
of the first six stops the start at its failure; the seventh names
every offending path in one error (the order and the collection are
this plan's call).

1. **Platform** (owner's decision). On Windows
   (`process.platform === 'win32'`) the runner refuses to start with
   "scripts.user in FILE is supported on Linux only". Every platform
   other than Linux refuses the same way (this plan's call: the
   launcher and `/proc` are Linux's).
1. **Not root** (owner's decision). A runner whose `process.getuid()`
   is 0 refuses.
1. **The launcher.** `/usr/bin/setpriv` must exist and be executable
   (`fs.accessSync` with `X_OK`). The absolute path is this plan's
   call: SonarCloud flagged the `PATH` lookup of `getconf` in
   [17a](17a-script-resources.md) (S4036), and util-linux installs
   `setpriv` there on Debian and Ubuntu.
1. **Capabilities** (owner's decision, widened by this plan). The
   runner reads `/proc/self/status` and requires bits 7 (`CAP_SETUID`),
   6 (`CAP_SETGID`) and 5 (`CAP_KILL`), the mask `e0`, in `CapEff`
   **and in `CapAmb`**, naming each one missing. The owner named
   `CapEff`. Only the ambient set passes through `execve` to `setpriv`,
   which has no file capabilities, so a runner that got the three from
   file capabilities on the `node` binary would pass a `CapEff` check
   and then fail in `setpriv` at every spawn.
1. **The account** (owner's decision). `user` and `group` resolve from
   `/etc/passwd` and `/etc/group`; one that does not resolve is an
   error naming the key and the value.
1. **A distinct account** (this plan's call). The script account's uid
   must not be 0 or the runner's own, and its gid not 0: separation
   from oneself or from root protects nothing.
1. **Layout** (owner's decision on what, this plan's call on how).
   Verified, never imposed: the runner never runs `chmod` or `chown`.

| Path                                              | Rule                                                            |
| :------------------------------------------------ | :-------------------------------------------------------------- |
| `runner.yaml`                                     | not readable, not writable, no writable ancestor                |
| the key of `auth.key`, when set                   | not readable, not writable, no writable ancestor                |
| the state machine file, when set                  | not readable, not writable, no writable ancestor                |
| the database's directory, when `database` is set  | no permission at all (no `r`, `w` or `x`), no writable ancestor |
| the database file, when it exists                 | not readable, not writable                                      |
| the scripts directory, and every entry beneath it | not writable, no writable ancestor                              |
| the run directory                                 | writable (`w` and `x`), and every ancestor searchable           |

How the account's access is decided (this plan's call):

- **Class.** For a path's `stat`, the owner bits apply when its uid is
  the account's, else the group bits when its gid is one of the
  account's groups, else the other bits; the kernel, too, picks one
  class and never a union. The account's groups are the gid that
  `setpriv` sets, the gid of its `/etc/passwd` entry, and every group
  of `/etc/group` that lists its name: a superset of what
  `setpriv --init-groups` sets, so the check errs towards refusing.
- **Reach.** A path is readable or writable only if every ancestor
  directory, up to `/`, grants the account `x`. Every path is checked
  at its `fs.realpathSync`, so a symbolic link is judged by its target
  and the target's ancestors.
- **Writable ancestor.** An ancestor that the account can write lets it
  rename the path away and put its own in its place, whatever the
  path's mode, unless the ancestor has the sticky bit and the account
  does not own the entry (as in `/tmp`).
- **Database.** SQLite creates the file, its journal and its WAL with
  the runner's umask, typically `644`, after the check has run. A
  directory that grants the account nothing keeps those files out of
  reach whatever their mode; "not readable" alone would pass a first
  start whose file does not exist yet, and then expose it.
- **Not writable as well.** The owner listed `runner.yaml`, the key,
  the database and the state machine file as not readable; this plan
  adds not writable for each.
- **Not seen.** ACLs, AppArmor and NSS sources other than the two files.
  `PRIVILEGE-SETUP.md` tells the operator to keep ACLs off these
  paths, to make the account a local one, and to verify with
  `sudo -u dt-script`.

The error names each path, the rule it breaks, the mode in octal and
the owner and group, and never the content of a file:

```text
Error: Cannot run the scripts as dt-script (scripts.user in /etc/dt/hospital-1/runner.yaml):
✖ /etc/dt/hospital-1/runner.yaml is readable by dt-script: mode 644, owner 998, group 998
✖ /etc/dt/hospital-1/keys/hospital-1.key is readable by dt-script: mode 640, group 1001 is a group of dt-script
✖ /srv/dt/hospital-1/scripts/open is writable by dt-script: mode 775, group 1001 is a group of dt-script
✖ /var/lib/dt/hospital-1/run is not writable by dt-script: mode 755, owner 998
See PRIVILEGE-SETUP.md.
```

The capability error reads "scripts.user needs CAP_SETUID, CAP_SETGID
and CAP_KILL as ambient capabilities of the runner; missing: CAP_KILL.
See PRIVILEGE-SETUP.md."

### Rights

The owner's decision: the runner never acquires a privilege. It is
started as its own unprivileged account with `CAP_SETUID`,
`CAP_SETGID` and `CAP_KILL` ambient, by systemd:

```ini
[Service]
User=dt-runner
Group=dt-runner
AmbientCapabilities=CAP_SETUID CAP_SETGID CAP_KILL
CapabilityBoundingSet=CAP_SETUID CAP_SETGID CAP_KILL
NoNewPrivileges=yes
ExecStart=/usr/bin/node /opt/runner/dist/src/main.js --config /etc/dt/hospital-1/runner.yaml
```

or by root through `setpriv`:

```bash
setpriv --reset-env --reuid=dt-runner --regid=dt-runner --init-groups \
  --inh-caps=+setuid,+setgid,+kill --ambient-caps=+setuid,+setgid,+kill \
  -- /usr/bin/node /opt/runner/dist/src/main.js --config /etc/dt/hospital-1/runner.yaml
```

`--reset-env` belongs on this line: `sudo` keeps `HOME=/root`, which
the runner would otherwise pass on.

### Launch

The owner's decision, as corrected on 2026-10-27: each script is
started through

```bash
/usr/bin/setpriv --reuid=UID --regid=GID --init-groups \
  --inh-caps=-all --ambient-caps=-all --no-new-privs -- SCRIPT
```

with the resolved numbers as `UID` and `GID` (this plan's call: the
numbers that the layout check used, with no second lookup of a name),
and as `SCRIPT` the absolute path that `ExecaManager.createRunner`
builds today (`join(location, name)`,
`src/execa-manager.service.ts:117-125`; `location` is absolute after
`resolvePaths`).

- **No `--reset-env` on the script's line.** setpriv(1) says that it
  "clears all the environment variables except TERM". With util-linux
  2.41.3 in WSL, `FOO=bar setpriv --reset-env -- sh -c 'echo $FOO'`
  printed nothing, and the same without `--reset-env` printed `bar`.
  The runner's constructed environment, `RUNNER_URL`, `RUNNER_TOKEN`,
  `DT_*` and the declared `env`, would be lost. The runner passes the
  environment with execa's `env` and `extendEnv` off, as today
  (`src/execa-runner.ts:53-59`), and `setpriv` hands it on unchanged.
- **Node's `uid` and `gid` spawn options are not used**: they leave the
  three capabilities in the script (verified, below).
- **`--bounding-set=-all` is not used**: it needs `CAP_SETPCAP` and
  fails with "Operation not permitted". With `--no-new-privs`, `execve`
  grants no capability through setuid bits or file capabilities, which
  makes the bounding set irrelevant. The script's `CapBnd` therefore
  stays what the orchestrator gave the runner: the full set under a
  plain `setpriv` start, the three under the systemd unit above.
- **Same process.** `setpriv` replaces itself with the script: in WSL,
  `setpriv … -- sh -c 'echo $$' &` printed the pid that `$!` gave. So
  `subprocess.pid` is the script's pid, and the stop path, `SIGTERM`
  through execa's `kill()` and `SIGKILL` after `stopGrace`
  (`forceKillAfterDelay`, `src/execa-runner.ts:53-59` and `:80-87`),
  reaches the script unchanged (owner's decision). `CAP_KILL` in the
  runner's effective set is what lets it signal a process of another
  uid.
- **Measurement.** [17a](17a-script-resources.md)'s meter reads
  `/proc/<pid>/stat` and `/proc/<pid>/status`, which are mode `444`
  whatever the account, so
  it measures the script; a first sample taken before the `execve`
  measures `setpriv` for a moment.
- **A failed launch**, where `setpriv` cannot switch, is a failed run
  with `setpriv`'s message in `stderr` and its exit code, 127 for a
  privilege error; the startup checks make it unlikely.
- **Working directory** (owner's decision). `runDirectory` is the `cwd`
  of every script, the one place it may write, shared between runs by
  design.
- **Windows** is untouched: the setting cannot be on there.

### Environment

The owner's decision, as corrected on 2026-10-27: with the setting, the
base of a script's environment is an allow-list instead of
`process.env`, and only that base changes in
`src/fsm/script-context.ts`:

| Variable          | Value                                           |
| :---------------- | :---------------------------------------------- |
| `HOME`            | the account's home directory from `/etc/passwd` |
| `USER`, `LOGNAME` | the account's name from `/etc/passwd`           |
| `PATH`            | `/usr/local/bin:/bin:/usr/bin`, fixed           |
| `TMPDIR`, `LANG`  | the runner's values, when set                   |

On top come the runner variables, the file's `env` and the state's
`env`, the later winning, as today. The `PATH` is setpriv(1)'s own
default for a regular user (this plan's call on the value).

**A hole the decisions left open** (this plan's call). `setpriv` holds
`CAP_SETUID`, `CAP_SETGID` and `CAP_KILL` from its start until it
switches. Capabilities that come only from the ambient set do not put a
program in secure-execution mode: the kernel sets `AT_SECURE` when the
permitted set grows beyond the ambient one
(`security/commoncap.c`), so glibc's dynamic loader honours
`LD_PRELOAD` and its kin in `setpriv`. The declared `env` is the DT
author's, so an `LD_PRELOAD` naming a library in the run directory
would run the author's code with `CAP_SETUID`, which can become the
runner's uid and read the key. With the setting, a state machine file
is therefore refused, like any other invalid definition, when its `env`
or a state's `env` declares a name that glibc drops in secure mode or
that names a file for it to load:

- names starting with `LD_` or `MALLOC_`;
- `GCONV_PATH`, `GETCONF_DIR`, `GLIBC_TUNABLES`, `HOSTALIASES`,
  `LOCALDOMAIN`, `LOCPATH`, `NIS_PATH`, `NLSPATH`, `RESOLV_HOST_CONF`,
  `RES_OPTIONS`, `TMPDIR` and `TZDIR`, the rest of glibc's
  `unsecvars.h`;
- `LANG`, `LANGUAGE` and names starting with `LC_`, as a locale name
  may be a path (CVE-2014-0475).

The base still sets `TMPDIR` and `LANG` from the operator's
environment. Parameter values cannot reach these names, which are all
`DT_PARAM_*`. The exploit was reasoned from the kernel and glibc rules,
not tried, as it needs a privileged start (_unverified_); the refusal
is cheap either way.

### Health

`GET /health` and MQTT `health` gain `scripts`: `{ "user": "<name>" }`
with the setting, the name from `/etc/passwd` also when `user` was a
uid, and `null` without it (owner's decision):

```json
{
  "status": "ok",
  "uptime": 4,
  "mqtt": "connected",
  "database": "file",
  "scripts": { "user": "dt-script" }
}
```

`GET /health` is open, so any caller learns the name of a local
account; the owner accepts that with the field.

### Token, Roles and What Stays

`RUNNER_TOKEN`, the role `script` and its routes are unchanged (owner's
decision). The token now lives in the script's own process only, as
`/proc/<runner pid>/environ` is readable by the runner's account alone.
Nothing changes for `POST /`, the state machine, stop, history,
metrics, signing or peers.

### Linux Demo

Postponed to the recording of issue [16](16-peer-events.md) (owner's
decision, after this plan): once [17b](17b-process-tree.md),
[17c](17c-fidelity.md) and 18 are merged, [16](16-peer-events.md)'s
recording records both platforms with the setting on. The plan below
stands for it.

The owner's decision: a shell variant of the hospital scripts, recorded
in WSL with the setting on as a second cast beside the Windows one,
from a copy of the demo inside the WSL filesystem, as file modes on
`/mnt/c` are not real.

- **Names.** On Linux `RunnerFactory.create` runs the script's bare
  name (`src/runner-factory.service.ts:10-24`, as `test/data/scripts`
  does), not `<name>.sh`; the factory picks `.ps1` only on Windows. So
  the variants are `scripts/open`, `full`, `closed`, `admit` and
  `discharge`, POSIX `sh` with mode `100755`, and `scripts/ward.sh`,
  the sourced helper that `ward.ps1` is, which is no command. The
  brief's `scripts/*.sh` would need the factory to append `.sh` on
  Linux, which would break every Linux deployment.
- **What they use.** `curl` with `Authorization: Bearer $RUNNER_TOKEN`
  for what `Send-Runner` does, and `jq` for stdin and `ward.json`; both
  are apt packages, prerequisites of the recording. `ward.json` and
  `ward.log` live in the working directory, the run directory, as the
  scripts may write nowhere else; `ward.ps1` keeps `scripts/../run/`.
- **Layout of the copy** (this plan's call). Ubuntu's home directories
  are mode `750`, so the account could not reach scripts under one; the
  copy lives at `/srv/dtaas-demo`, which the owner creates once. In it,
  `runner.user.yaml` (`runner.auth.yaml` plus the `scripts` section,
  written by `record.mjs`) and `hospital.fsm.yaml` are `600`; the
  database moves to `run/db/hospital.db`, with `run/db` at `700`;
  `run/keys`, the principals' private keys with which a script could
  otherwise sign as `alice`, is `700`; and the run directory `run/ward`
  is `777`, so that the recording user can reset it and the account can
  write it. `record.mjs` sets these modes; it is not the runner, so the
  rule against `chmod` does not bind it.
- **What the owner runs by hand**, when the recording asks: three
  privileged commands,
  `sudo useradd --system --no-create-home --shell /usr/sbin/nologin dt-script`,
  `sudo install -d -o "$USER" -g "$USER" -m 755 /srv/dtaas-demo`, and
  the `setpriv` line of [Rights](#rights) that starts
  `tools/runner.mjs -c runner.user.yaml` as the owner's own account
  with an absolute path to a Node of version 24 or later in WSL.
  Everything else is scripted. With `DEMO_RUNNER=external`,
  `record.mjs` prints that line and waits for `GET /health` instead of
  spawning the runner; `touch run/shutdown` still stops it, as
  `runner.mjs` polls the file.
- **The cast** shows, beside the existing story, `GET /health` with
  `scripts.user`, `ward.log` lines with the script's `id -un` and
  `Cap*` lines, and a `cat` of the key that fails.
- The demo README describes both recordings.

### Operator Guide

A new, self-contained `PRIVILEGE-SETUP.md` at the runner's root, beside
`DOCKER.md` and `SECURITY-MODEL.md`, where the operators' guides live;
`docs/` holds the design, the research and these issues (this plan's
call on the place and the name). For Ubuntu, it gives:

- the commands that create the runner account and the script account;
- the systemd unit and the `setpriv` line of [Rights](#rights);
- the ownership and modes of `runner.yaml`, the key, the database
  directory, the scripts directory and the run directory, as the
  layout table demands;
- the checks: `capsh --print` and `grep Cap /proc/<pid>/status` for the
  runner, `sudo -u dt-script cat runner.yaml` failing, and `GET /health`
  naming the account;
- the Docker equivalent: `user: root`, `cap_drop: ALL`, `cap_add` of
  `SETUID`, `SETGID` and `KILL`, `no-new-privileges`, and a `setpriv`
  entrypoint with `--reset-env`, as Docker gives no ambient
  capabilities to a non-root `USER`; and the two accounts in the image.

README.md's document list, DOCKER.md and SECURITY-MODEL.md link to it.

### Verified Facts

Verified on WSL Ubuntu 26.04 on 2026-10-27, by the owner unless marked:

| Fact                                                                                                                                           |
| :--------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambient capabilities set by a root `setpriv` survive into Node running as a non-root user.                                                     |
| Node's `uid` and `gid` spawn options leave `CapAmb` and `CapEff` at `e0` in the child.                                                         |
| libuv resets the supplementary groups of a child that it starts with `uid` and `gid`.                                                          |
| The script launch line yields `CapInh`, `CapPrm`, `CapEff` and `CapAmb` of 0 and `NoNewPrivs` 1.                                               |
| `--bounding-set=-all` fails with "Operation not permitted" without `CAP_SETPCAP`.                                                              |
| `sudo` keeps `HOME=/root`, so the runner's start line needs `--reset-env`.                                                                     |
| `--reset-env` drops every variable but `TERM`; without it `setpriv` passes the environment on (by this plan, unprivileged, util-linux 2.41.3). |
| `setpriv` executes the program in its own process, keeping the pid (by this plan, unprivileged).                                               |
| `--init-groups` refuses a uid without an `/etc/passwd` entry (by this plan, unprivileged).                                                     |

The owner's summary said "all Cap\* = 0". `CapBnd` cannot be 0 without
`--bounding-set`, so this plan reads it as the four sets above, which
is what SECURITY-MODEL.md asks for too.

### Considered and Set Aside

- **Node's `uid` and `gid` spawn options**: the script keeps
  `CAP_SETUID`, `CAP_SETGID` and `CAP_KILL` and can switch back to the
  runner's uid (verified).
- **`sudo` as the helper** (C2): a setuid binary and its rules on every
  host, and a process between the runner and the script, which a stop
  signals and [17a](17a-script-resources.md) measures.
- **A long-lived script host** (C3): re-implements spawning, stop and
  measurement across a process boundary.
- **srt or a Firecracker microVM per script** (A1, A2, A3): set aside
  in SECURITY-MODEL.md, from the research notes
  [Sandbox][sandbox] and
  [Firecracker][firecracker].
- **The runner running `chmod` or `chown`**: the layout is the
  orchestrator's; a runner that changed modes would need rights it must
  not hold, and would hide a wrong deployment.
- **The runner running as root**: refused at startup.
- **`--reset-env` on the script's launch**: drops the constructed
  environment (verified).
- **`--bounding-set=-all`**: needs `CAP_SETPCAP`.
- **The environment in `setpriv`'s arguments**, as
  `setpriv … -- env VAR=… SCRIPT`: `/proc/<pid>/cmdline` is readable by
  every account, so `RUNNER_TOKEN` would leak to the whole host.
- **File capabilities on `node`** (`setcap`): every Node program on the
  host would hold them, and they do not reach `setpriv`.
- **The run directory defaulting to the scripts location**, with the
  layout check failing and naming `scripts.runDirectory`: the owner's
  default, but it can never pass the owner's own rules.
- **A step in `.github/workflows/runner.yml`** that creates the account
  and runs the test under `setpriv`: the delivery rules keep a pull
  request inside `servers/execution/runner`, so the test does both
  itself with `sudo -n` (Plan, step 14).

### Version and Decision

`GET /health` and MQTT `health` gain a field and no route changes
shape, so under the delivery rules of the issues' README no bump is
due, as for [15b](15b-signed-output.md)'s `publicKey` and
[17a](17a-script-resources.md)'s `resources`; the owner's call of no
bump stands. Tests that compare the whole health reply gain
`scripts: null`.

The implementing pull request adds to `docs/state-machine-design.md`:

> **D35** With `scripts.user`, scripts run as a second account through
> `setpriv`. Added by issue 18. A hostile DT author, or a caller who
> abuses a script through its input, must not reach `runner.yaml`, the
> key, the database or the runner's environment. On Linux the runner,
> started unprivileged with `CAP_SETUID`, `CAP_SETGID` and `CAP_KILL`
> ambient, starts each script through `setpriv`, which sets the account
> and clears every capability, in the run directory and with an
> allow-listed environment. It checks its rights and the layout at
> startup and refuses to start on any mismatch; it never changes a
> mode. Without the setting nothing changes.

## Plan

1. Review this plan against the code as the merges before it leave it:
   the line numbers below, the sizes of `src/fsm/fsm.service.ts` (247
   lines), `src/execa-manager.service.ts` (233) and
   `src/fsm/script-context.ts` (208), and the decision number, D35
   unless another issue has taken it.
1. `src/scripts/scripts.config.ts` (new), like
   `src/auth/auth.config.ts`: `scriptsSchema`, a strict object of
   `user` (a name of `[a-z_][a-z0-9_.-]*` up to 32 characters, or a uid
   as an integer or a string of digits), an optional `group` (the same,
   for a gid) and `runDirectory` (`z.string().min(1)`); and
   `ScriptsConfig`. `src/config/config.schema.ts:28-31` adds
   `scripts: scriptsSchema.optional()` after `peers`.
1. `src/scripts/account.ts` (new): `parsePasswd(text)` and
   `parseGroup(text)` split lines on `:` and skip comments, blank lines
   and malformed lines; `resolveAccount(config, files)` gives
   `Account = { name, uid, gid, home, groups: number[] }`, with
   `groups` the superset of the Spec, or throws naming the key and the
   value. The texts of the files come in as arguments, so the tests
   need no `/etc`.
1. `src/scripts/capabilities.ts` (new): `missingCapabilities(status)`
   reads the hex of `CapEff` and `CapAmb` as a `BigInt` and returns
   the names of bits 7, 6 and 5 absent from either; all three when a
   line is missing.
1. `src/scripts/layout.ts` (new): `access(stat, account)` gives the
   `r`, `w` and `x` of the class that applies; `reach`, the walk of the
   ancestors with the sticky rule; and
   `layoutProblems(paths, account, fs)`, one line per offence in the
   Spec's format, over an injected
   `{ statSync, realpathSync, readdirSync }`, so that the unit tests
   fake every mode. The scripts directory is walked recursively.
1. `src/scripts/separation.ts` (new):
   `checkSeparation(file, values, host)`, with
   `host = { platform, getuid, readText, accessSync, fs }` defaulting
   to the real ones. It runs the Spec's checks in order and returns
   `ScriptUser = { account, runDirectory }`, or `undefined` without the
   section; every error ends with the pointer to `PRIVILEGE-SETUP.md`.
   Each check is a function of its own, so none crosses Qlty's limits.
1. `src/config/configuration.service.ts`: `resolvePaths` (`:76-86`)
   resolves `scripts.runDirectory` with `path.resolve`, beside
   `resolveAuth` (`:69-72`); `loadConfig` (`:96-104`) calls
   `checkSeparation(file, this.configValues)` after `resolvePaths` and
   keeps the result; `getScriptUser(): ScriptUser | undefined` follows
   `getPeers` (`:158-160`). The comment of
   `src/config/config.interface.ts:10-11` names `runDirectory` among
   the resolved paths.
1. `src/scripts/launch.ts` (new): `SETPRIV = '/usr/bin/setpriv'`;
   `launchArgs(account, script)`, the arguments of the Spec's line;
   `scriptBase(user, inherited)`, which returns `inherited` without a
   user and the allow-list with one; and `refusedName(name)` over the
   loader names.
1. Spawn. `src/execa-runner.ts:13-16`: `RunnerOptions` gains
   `cwd?: string`, and `run` (`:53-59`) passes `cwd: this.options.cwd`
   to execa. `src/runner-factory.service.ts:10-24`:
   `create(command, settings, platform)` takes `{ stopGrace?, user? }`
   as its second parameter, so it keeps three. With a `user`, never on
   Windows, which the start refuses, it returns
   `new ExecaRunner(SETPRIV, launchArgs(user.account, command), options)`
   with `cwd: user.runDirectory` in the options.
   `ExecaManager.createRunner` (`src/execa-manager.service.ts:117-125`)
   passes `getStopGrace()` and `getScriptUser()` of its `Config` in
   that object.
1. Environment. `RunnerContext` (`src/fsm/script-context.ts:173-207`)
   gains `private inherited` and `inherit(base)`, and `environment`
   (`:196-207`) passes `inherited` to `scriptEnvironment`, whose
   default of `process.env` (`:153`) stays for every other caller.
   `FsmService.load` (`src/fsm/fsm.service.ts:71-79`), after `:77`,
   calls `inherit` with `scriptBase` of `config.getScriptUser()` and
   `process.env`. That makes the file 248 lines; if drift has grown
   it, `load`'s body moves to a helper in `src/fsm/` first.
1. Refused names. `Known` (`src/fsm/subscriptions.ts:8-13`) gains
   `separated: boolean`, from `config.getScriptUser()`. `envProblems`
   (`src/fsm/script-context.ts:69-75`) takes it and adds
   "env LD_PRELOAD is refused with scripts.user" for the file's and
   each state's `env`; `crossCheck` (`src/fsm/definition.ts:158`)
   passes `known.separated`. `main.ts` already loads the configuration
   before the state machine (`src/main.ts:27-28`).
1. Health. `src/dto/health.dto.ts:7-22`: `ScriptsHealth`,
   `{ user: string } | null`, a `scripts` field, and
   `healthReport(mqtt, database, scripts)`. `HealthService`
   (`src/health.service.ts:9-13`) injects `Config` too and builds
   `scripts` from `getScriptUser()`. The MQTT handler's `health`
   (`src/mqtt/mqtt-request.handler.ts:78`) takes it from a new
   `ExecaManager.scriptsHealth()` beside `databaseMode()`
   (`src/execa-manager.service.ts:230-232`), as the handler's
   constructor already has three parameters.
1. Unit tests with fakes, as named in Tasks; `test/unit/mqtt.fixture.ts`
   and the other fakes of `Config` and `ExecaManager` gain
   `getScriptUser` and `scriptsHealth`.
1. `test/e2e/script-user.spec.ts` (new). It runs only on Linux with
   `CI=true` and a `sudo -n true` that succeeds, and is skipped
   elsewhere, on Windows through `process.platform`, as
   `mqtt.broker.spec.ts` is without a broker. The job `test-runner` of
   `.github/workflows/runner.yml` runs `yarn test` on `ubuntu-latest`
   after `yarn build` (`:57-65`), where `sudo` needs no password (the
   same file runs `sudo apt-get` at `:107-108`), so no workflow changes.
   The test:
   - creates `dt-script-test` with
     `sudo -n useradd --system --no-create-home --shell /usr/sbin/nologin`,
     unless `getent passwd` has it;
   - lays out `/tmp/runner-18-XXXXXX` at `755`: `runner.yaml` (`600`)
     with `auth.principals` and the `scripts` section, `auth.key` in
     `keys/` (`700`, the key `600`), the database in `db/` (`700`),
     `scripts/` (`755`, its scripts `755`) and `run/` (`777`);
   - starts `dist/src/main.js` with `process.execPath` through
     `sudo -n` and the `setpriv` line of [Rights](#rights), with the
     test's own uid and gid as the runner account, waits for
     `GET /health`, and stops it with `SIGTERM` to `sudo`, which
     relays it;
   - runs, signed with `test/sign.util.ts`, a script that prints
     `id -un`, `id -u`, its `Cap*` and `NoNewPrivs` lines, `HOME`,
     `pwd`, whether `RUNNER_URL` and `RUNNER_TOKEN` are set, and the
     exit codes of `cat` on the key and on `runner.yaml` and of a write
     into `scripts/`; and asserts the account, `CapInh`, `CapPrm`,
     `CapEff` and `CapAmb` of 0, `NoNewPrivs` 1, the account's `HOME`
     from `getent passwd`, the run directory as `pwd`, both variables
     set, and the three failures;
   - stops a looping script with `POST /stop` and gets `stopped` within
     `stopGrace`, which needs `CAP_KILL`;
   - reads `scripts.user` from `GET /health`;
   - starts a second runner whose key is `644`, and expects it to exit
     with an error that names the key's path and does not contain
     `PRIVATE KEY`.
1. `PRIVILEGE-SETUP.md` (new), as the Spec lists, tried on WSL for the
   systemd and `setpriv` starts and on the host's Docker for the
   compose lines, which SECURITY-MODEL.md marks _unverified_.
1. Documents, as in Tasks.

### Deferred to 16

The owner postponed the Linux demo after this plan was written: it is
recorded with issue [16](16-peer-events.md)'s recording, after
[17b](17b-process-tree.md), [17c](17c-fidelity.md) and 18 are merged,
for both platforms with the setting on. Its step, as planned:

1. Demo, in `demo/hospital`: the five commands and `scripts/ward.sh` of
   the Spec; `tools/settings.mjs` gains the script suffix and the ward
   log's path by platform, which `tools/steps.mjs` uses where it names
   `.ps1` and `run/ward.log` (`:55-63`, `:87-89`, `:104-105`,
   `:115-117`, `:130`); `tools/record.mjs` writes `runner.user.yaml`
   and sets the modes on Linux beside `authConfig` (`:46-57`), resets
   `run/ward/` in `reset` (`:36-42`), and with `DEMO_RUNNER=external`
   prints the start line and waits in `startRunner` (`:99-110`). The
   second cast is `hospital-linux.cast`, with its MP4 from
   `tools/to-mp4.sh`.

## Tasks

- [x] `scripts` is optional and strict; `user` is required in it and
      takes a name, an integer or a string of digits; `group` is
      optional; `runDirectory` is required and resolved with
      `path.resolve`, an absolute one kept. Check:
      `test/unit/scripts.schema.spec.ts`,
      `test/integration/config.scripts.spec.ts`.
- [x] Texts of `/etc/passwd` and `/etc/group` resolve a name, a uid, a
      group name and a gid; the groups include every group that lists
      the account; comments and malformed lines are skipped; an unknown
      name or uid is an error naming the key. Check:
      `test/unit/scripts.account.spec.ts`.
- [x] `missingCapabilities` gives none for `e0` in `CapEff` and
      `CapAmb`, names `CAP_KILL` for `c0`, and all three for a missing
      `CapAmb` line and for file capabilities alone (`CapEff` `e0`,
      `CapAmb` 0). Check: `test/unit/scripts.capabilities.spec.ts`.
- [x] The layout check with fake stats: the owner, group and other
      classes; an unreachable path is unreadable; a writable ancestor
      fails unless sticky and not owned; a symbolic link is judged by
      its target; a database directory with `x` fails; a missing
      database file is no problem; the scripts directory is walked
      recursively; the run directory must be writable; all problems
      come in one error, in the Spec's format, without file content.
      Check: `test/unit/scripts.layout.spec.ts` and
      `test/unit/scripts.layout.paths.spec.ts`.
- [x] `checkSeparation` with a fake host: nothing without the section;
      `win32` and `darwin` refuse naming `scripts.user`; uid 0 refuses;
      a missing `/usr/bin/setpriv` refuses; missing capabilities are
      named; a root or same-uid account refuses; the layout runs last.
      Check: `test/unit/scripts.separation.spec.ts`.
- [x] `launchArgs` gives the Spec's line with numbers and without
      `--reset-env` or `--bounding-set`; with a user the factory builds
      `/usr/bin/setpriv` with the run directory as `cwd`, and without
      one today's runners, on Linux and Windows. Check:
      `test/unit/scripts.launch.spec.ts`,
      `test/integration/runner-factory.service.spec.ts`.
- [x] With a user, the base has the account's `HOME`, `USER` and
      `LOGNAME`, the fixed `PATH`, the runner's `TMPDIR` and `LANG`,
      and nothing else of `process.env`; the runner variables and both
      `env`s come on top; without a user the environment is today's.
      Check: `test/unit/script-context.base.spec.ts` (new, as
      `script-context.spec.ts` has 202 lines),
      `test/unit/fsm.service.script-env.spec.ts`.
- [x] With `separated`, `LD_PRELOAD`, `MALLOC_CHECK_`, `GCONV_PATH`,
      `LANG` and `LC_ALL` in the file's or a state's `env` are refused,
      and `PATH` and `POLL_MS` are not; without it all are taken.
      Check: `test/unit/fsm.declared-env.spec.ts`.
- [x] `GET /health` and MQTT `health` carry `scripts`, `null` without
      the setting. Check: `test/unit/health.service.spec.ts`,
      `test/unit/mqtt-request.handler.spec.ts:129-137`,
      `test/e2e/health.spec.ts`, and `test/e2e/mqtt.broker.spec.ts`
      grepped for the health shape (CI only).
- [x] The privileged end-to-end test passes in CI and is skipped on
      Windows and on Linux without `CI=true` and `sudo -n`. Check:
      `test/e2e/script-user.spec.ts` in the CI log, and its skip in a
      local run.
- [ ] Postponed to [16](16-peer-events.md)'s recording. The Linux
      variant of the demo records in WSL from `/srv/dtaas-demo` with
      the setting on; `hospital.cast` is
      unchanged; `hospital-linux.cast` and its MP4 are added. Check:
      `node tools/check-cast.mjs` on both casts, and `run/ward/ward.log`
      showing `dt-script` and zero capabilities.
- [ ] `PRIVILEGE-SETUP.md` is self-contained and its commands ran: the
      `setpriv` and systemd starts on WSL, the compose lines on Docker.
      Check: the `capsh --print` and `/proc/<pid>/status` output of
      each, recorded in Learnings.
- [x] README.md: the document list (`:21-33`) links
      `PRIVILEGE-SETUP.md`; a "Script User" section under Configure,
      after Peers; Health (`:1415-1440`) and Script Environment
      (`:385`) mention `scripts`. Check: those sections.
- [x] `api/API.md`: `GET /health` (`:242-269`) gains the `scripts` row
      and example. Check: that section.
- [x] DOCKER.md (`:161-165`) and SECURITY-MODEL.md link
      `PRIVILEGE-SETUP.md`; SECURITY-MODEL.md's "Not Decided Yet", its
      _unverified_ notes on `setpriv` and libuv, and the "spawn as
      another account" row of Implementation Technologies, which still
      offers Node's `uid` and `gid`, are brought up to date. Check:
      those sections.
- [x] `docs/state-machine-design.md`: D35 as the Spec words it, and
      Components lists `src/scripts/`. Check: markdownlint-cli and the
      widths of the table (the lesson of [15b](15b-signed-output.md) on
      prettier).
- [x] `config/runner.yaml.sample` has a commented `scripts` section;
      `DEVELOPER.md` describes `script-user.spec.ts` and how to run it
      in WSL. Check: yamllint, markdownlint-cli and prettier.
- [ ] Postponed to [16](16-peer-events.md)'s recording. The demo README
      describes both recordings and the privileged commands. Check: markdownlint-cli
      and prettier.
- [x] `docs/issues/README.md`: the row of 18 moves to `in review` with
      the pull request. Check: the table.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass; no
      file is over 250 lines and no function crosses Qlty's limits.
      Check: their output, with Linux CI as the authority.

## Learnings

- **Drift.** The references held on the merge with
  `feature/distributed-demo` at `92bb3e18`, and D35 was free. Two counts
  were off: `fsm.service.ts` grows from 247 lines to 249, not 248, as
  the call of `scriptBase` needs an import as well; `script-context.ts`
  grows from 208 to 237 and `execa-manager.service.ts` from 233 to 241.
  No body moved out of `FsmService.load`.
- **Scope.** The owner postponed the Linux demo after this plan was
  written: issue [16](16-peer-events.md)'s recording, after
  [17b](17b-process-tree.md), [17c](17c-fidelity.md) and 18 merge,
  records both platforms with the setting on. Its step moved under
  [Deferred to 16](#deferred-to-16), its two task boxes stay open, and
  `demo/hospital` is unchanged.
- **Readings this plan left open.**
  - `Known.separated` is optional, so the eight test literals of
    `Known` stay as they are; `known(config)` always sets it.
  - A gid stands for itself, also without an entry in `/etc/group`; a
    group name must be listed. A uid still needs its `/etc/passwd`
    entry, for `--init-groups`.
  - The layout's file system is `LayoutFs` of
    `src/scripts/layout.access.ts`, whose `statSync` gives `undefined`
    for a missing path, and `NODE_FS` adapts Node's. The rules of
    access, reach and the sticky bit are a `LayoutView` there, and the
    rules per path are in `layout.ts`, which keeps both files under
    150 lines; the test is split the same way
    (`scripts.layout.spec.ts`, `scripts.layout.paths.spec.ts`).
  - A writable ancestor is judged by its own reach, not by the
    protected path's: a writable directory above one that the account
    can not search still lets it rename the branch away. Both the path
    as given and its target are walked, so a link that sits in a
    writable directory is found too. Each such ancestor is one line,
    "is writable by dt-script, above a protected path", rather than one
    line per file beneath it.
  - A database directory of mode `711` gives two lines: the directory,
    and the file, which the account can open by its name.
  - A missing path: the access test is skipped and its ancestors are
    still checked; a missing run directory is an error, a missing
    scripts directory or database file is not. `checkSeparation` runs
    last in `Config.loadConfig`, after `Signer.load`, so a missing or
    bad key keeps its own error.
  - `RunnerFactory.create` takes `RunnerSettings`, `{ stopGrace, user }`.
    `HealthService` injects `Config` beside `Queue`.
  - `config.scripts.spec.ts` replaces the members of the exported
    `HOST` of `src/scripts/separation.ts` with `jest.spyOn` and
    `jest.replaceProperty`, so `Config` needs no test hook.
- **The runner enters the run directory.** libuv changes to the `cwd`
  in the child before the `execve` of `setpriv`, as the runner's own
  account, so the runner needs `x` on the run directory and its
  ancestors. PRIVILEGE-SETUP.md gives the run directory to
  `dt-script:dt-runner` with mode `770`; the startup does not check it,
  and a run that can not enter it fails as a run.
- **PRIVILEGE-SETUP.md** puts every file of a DT under one directory,
  as `location` and `database` are joined to the directory of
  `runner.yaml` even when absolute (`resolvePaths`); the Spec's
  `/etc/dt` and `/var/lib/dt` example would need `../..` paths. Its
  Docker entrypoint keeps `--reset-env`, as the Spec says, while
  SECURITY-MODEL.md's compose lines leave it out; SECURITY-MODEL.md's
  "Not Decided Yet" now names that for the deploy issue.
- **What Linux CI proved.** `test/e2e/script-user.spec.ts` ran in the
  `test-runner` job of both workflow runs of the first push (push and
  pull request, `ubuntu-latest`, Node 26), and its four tests passed:
  a script started as `dt-script-test` with only that account's
  group, `CapInh`, `CapPrm`, `CapEff` and `CapAmb` of zero,
  `NoNewPrivs` 1, the account's `HOME`, the run directory as `pwd`,
  `RUNNER_URL` and `RUNNER_TOKEN` set, and `cat` of the key and of
  `runner.yaml` and a `touch` into the scripts failing; `POST /stop`
  stopped a looping script of the account in about a second, which
  needs `CAP_KILL`; `GET /health` named the account; and a second
  runner whose key was `644` in a `755` directory exited non-zero,
  naming the key's path, without `PRIVATE KEY` in its output. The
  runner is stopped with `pkill -TERM -u <uid> -f <runner.yaml>`: it
  runs as the test's account, and `sudo`, as root, is left out by `-u`.
- **What WSL could and could not verify.** Ubuntu 26.04 in WSL has
  `/usr/bin/setpriv` of util-linux 2.41.3 and the account `dt-scripts`
  (uid 999, gid 986). Unprivileged, against a layout under `/tmp`:
  the build's layout check found no problem in a good layout and five
  lines in a bad one (a readable `runner.yaml` and key, a database
  directory of `711`, a `777` directory linked from the scripts, and a
  run directory of `755`), and `checkSeparation` refused a plain
  `node` for all three capabilities. `script-user.spec.ts` skips in
  WSL, as `sudo -n` asks for a password; it skipped in a copy of the
  runner at `~/r18-runner`. Jest does not start from `/mnt/c` in WSL
  ("Preset ts-jest/presets/default-esm not found"), so the copy needs
  its own `yarn install`. The privileged start, the systemd unit, the
  compose lines and `capsh --print` were not run, so their task box
  stays open.
- **Tests and checks.** On the merge base, the whole suite on Windows
  with `--maxWorkers=2` gave 111 suites and 1007 tests (10 skipped),
  with one failure, the 5 s timeout of `options.spec.ts` that
  [16](16-peer-events.md) also saw. On this branch, before the last two
  tests were added, it gave 121 suites and 1140 tests: 119 suites
  passed and 2 were skipped
  (`script-user.spec.ts` and `mqtt.broker.spec.ts`), 1126 tests passed
  and 14 were skipped, with no failure; `options.spec.ts` passed. The
  new sources are covered to 100% but for the real adapters of `HOST`
  and `NODE_FS`, which `scripts.host.spec.ts` now tries on a temporary
  directory. `yarn syntax`, `yarn build`, `npx tsc --noEmit
--noUnusedLocals --noUnusedParameters`, prettier, markdownlint-cli
  0.45.0 with `.markdownlint.yaml` and yamllint 1.38.0 pass.
  DEVELOPER.md says that Jest can not find tests with _config_ in their
  file names, but `jest --listTests` lists every `config.*.spec.ts`;
  that note predates this issue and is left as it is.
- **Checks of the pull request.** On the first push, SonarCloud rated
  the new code D for security, all in `test/e2e/script-user.util.ts`:
  `sudo`, `getent` and `pkill` found through `PATH` (S4036), the literal
  `/tmp` of `mkdtempSync` (S5443), and an `await` in the polling loop
  (S9382). The helpers now run the binaries by absolute path, lay out
  the runner in `os.tmpdir()`, which is `/tmp` in CI, and poll by
  recursion. Codecov found three lines of `NODE_FS` uncovered (98.9%
  of the patch); with `scripts.host.spec.ts` the patch is covered in
  full and the project at 90.49%. Qlty reported no smell and no
  blocking issue.
- **Version and decision.** The version stays 0.10.0: `scripts` is an
  optional section, and `GET /health` gains a field. The decision is
  D35, as the Spec words it.

[sandbox]: ../../../../../system/servers/execution/runner/Sandbox.md
[firecracker]: ../../../../../system/servers/execution/runner/Firecracker.md
