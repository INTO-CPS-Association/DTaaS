# Security Model

This guide is for operators who deploy the runner and for the
developers who work on the separation of the runner from its scripts.
It states what the runner protects, from whom, and what it leaves to
the system that starts it. The execution scripts require a second account
and see how to set up the second account
is in [PRIVILEGE-SETUP.md](privilege-setup.md).

Where this guide states how the runner works today, it names the source file.
The account switch was tried on WSL Ubuntu 26.04, kernel 6.18.
Statements that could not be checked against a
source or the experiment are marked _unverified_.

## Terms

| Term                 | Meaning                                                                                                                                                                                                                                                                                |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| runner               | The Node process that serves one digital twin (DT): it reads `runner.yaml`, serves the HTTP and MQTT APIs, and runs the DT's scripts as child processes.                                                                                                                               |
| DT author            | The person who writes the scripts and the state machine file of a DT.                                                                                                                                                                                                                  |
| operator             | The person who writes `runner.yaml` and starts the runner: who may call it, the broker, the peers, the signing key, the database.                                                                                                                                                      |
| caller               | Anything that sends the runner a request over HTTP or MQTT. A **client** has every right, a **manager** reads, sets parameters and peers and runs the commands of `manager.commands`, and a **peer** is another DT; a peer has no role of its own and calls as a client or a manager.  |
| script               | A file in the scripts directory (`location`) that the runner runs for a command of `POST /` or for the entry into a state. On Linux it is run directly; on Windows the runner runs `<name>.ps1` with `powershell.exe` (`src/runner-factory.service.ts`).                               |
| script context       | What a script gets from the runner: the environment variables `RUNNER_URL`, `RUNNER_TOKEN`, `DT_ID`, `DT_STATE`, `DT_ENTRY`, `DT_PARAM_*` and the declared `env`; the command input on stdin; and a working directory, today the runner's own (`src/execa-runner.ts` passes no `cwd`). |
| principal            | A caller that `auth.principals` lists, with a name, a role and an Ed25519 public key (15a).                                                                                                                                                                                            |
| request token        | The credential of a principal: a compact JWS that the principal signs for one request, bound to the DT, the request and at most 60 s, and accepted once (15a).                                                                                                                         |
| script token         | `RUNNER_TOKEN`: a random bearer token that the runner draws at each start and gives to its scripts, with the role `script` (15a).                                                                                                                                                      |
| signed output        | With `auth.key`, the runner's notifications, MQTT responses and will are a compact JWS of their JSON, signed with the DT's Ed25519 private **key**, whose `kid` is the DT's `id` (15b).                                                                                                |
| peer                 | A DT that the operator lists under `peers` in `runner.yaml`. The runner follows its presence and state notices and may raise events from them (13, 16).                                                                                                                                |
| orchestrator         | Whatever starts and stops the runner process: a shell, systemd, Docker, a microVM manager. DTaaS's own Execution Manager is planned and not available.                                                                                                                                 |
| boundary             | A wall that code on one side can not cross by the means it is given: a user account, a container, a virtual machine.                                                                                                                                                                   |
| sandbox              | A boundary placed around one program or one run of it, here around a script.                                                                                                                                                                                                           |
| microVM              | A small virtual machine with its own kernel and few devices, such as one of Firecracker, started in a fraction of a second.                                                                                                                                                            |
| privilege separation | Running two parts of one system as two accounts, so that the less trusted part can not read or change what the other owns.                                                                                                                                                             |
| ambient capabilities | A Linux capability set that a process passes on to the programs it executes, so that an unprivileged account can hold a few chosen capabilities, such as `CAP_SETUID`, without being root and without file capabilities.                                                               |

## Threat Model

These are the owner's decisions.

### Adversaries

- **A caller who abuses a permitted script through its input**: the
  JSON on stdin, the parameter values that become `DT_PARAM_*`, and the
  choice of script among the permitted ones. Access control (15a)
  decides who may call at all; this threat is a caller who may.
- **A hostile DT author** who ships a hostile script.

A compromised runner process is not in scope of the runner's own
measures. If an attacker controls the runner, it controls everything
the runner holds; containing that is the orchestrator's job.

### Assets

The runner protects these from its scripts:

| Asset                         | Why                                                                                        |
| :---------------------------- | :----------------------------------------------------------------------------------------- |
| `runner.yaml`                 | It holds the MQTT `username` and `password`, the principals and the paths of the rest.     |
| the signing key (`auth.key`)  | With it, a script could sign notifications as the DT.                                      |
| the MQTT credentials          | With them, a script could act as the runner on the broker.                                 |
| the database                  | It holds the command history, the request keys, the machine, the parameters and the peers. |
| the runner's environment      | It may hold secrets of the deployment; on Linux it is readable in `/proc/<pid>/environ`.   |
| the scripts directory, intact | A script that rewrites it changes what later runs do.                                      |

The DT author controls only the scripts directory and the state
machine file. Everything else belongs to the user and group that
launch the runner.

### Accepted Residual Risks

| Risk                                                                        | Why it is accepted                                                                                                                                                                                  |
| :-------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A script reaches any device on any protocol, the broker, peers and webhooks | Scripts must reach the physical twin over whatever it speaks. Limiting that is the deployment's network and firewall; the runner adds no proxy.                                                     |
| A script corrupts files shared between runs in the run directory            | The run directory is the DT's own state. A DT that poisons itself hurts no other.                                                                                                                   |
| A script holds `RUNNER_TOKEN` for the life of the runner process            | Its scope is the role `script`, compared below.                                                                                                                                                     |
| A script exploits the kernel                                                | The orchestrator's boundary, a container, an account or a microVM, covers it.                                                                                                                       |
| Children of a script outlive it                                             | A stop signals only the direct child (D18). 17b measures the whole tree but, as planned, does not signal it; a kill of the tree is left to an issue of its own (`docs/issues/17b-process-tree.md`). |

The script token against a principal's request token:

| Property    | Script token (`RUNNER_TOKEN`)                                                   | Request token of a principal                                               |
| :---------- | :------------------------------------------------------------------------------ | :------------------------------------------------------------------------- |
| Form        | 32 random bytes, base64url (`src/auth/access.ts`)                               | compact JWS, Ed25519                                                       |
| Issued      | once per runner process, at its start                                           | by the principal, for each request                                         |
| Lifetime    | until the runner stops                                                          | at most 60 s from `iat` (`src/auth/claims.ts`)                             |
| Replay      | accepted any number of times                                                    | each `jti` once                                                            |
| Bound to    | nothing but the runner process                                                  | the DT (`aud`), the method, path and body hash, or the MQTT topic and body |
| Transport   | HTTP only; over MQTT it is a malformed credential                               | HTTP and MQTT                                                              |
| Routes      | every reading route, `POST /fsm/event` and `POST /escalate`                     | those of the principal's role                                              |
| Not allowed | `POST /`, `POST /stop`, `POST /fsm/transition`, `PUT /parameters`, `PUT /peers` | depends on the role                                                        |
| Exists      | only with `auth.principals`; without them every route is open anyway            | only with `auth.principals`                                                |

The routes of the role `script` are those of `ROUTE_ROLES` in
`src/auth/roles.ts`: `GET /`, `/history`, `/dt`, `/state`, `/metrics`,
`/fsm`, `/parameters` and `/peers`, plus `POST /fsm/event` and
`POST /escalate`; `GET /health` needs no credential.

### The Boundary Between Users

The boundary between users of one machine is the orchestrator's: a
container, a user account or a microVM. The runner adds nothing there.

## Ways to Isolate

The research compared three choices and their forms.

- **A, runner outside, scripts inside a sandbox.**
  - A1: Anthropic's sandbox-runtime (`srt`) around each script.
  - A2: a Firecracker microVM for each script run.
  - A3: a Firecracker microVM for each runner, with a long-lived script
    host inside it.
- **B, runner and scripts inside one boundary.**
  - B1: a hardened container: `read_only`, `cap_drop: ALL`,
    `no-new-privileges`, `pids_limit`, `mem_limit`, `cpus`.
  - B2: a stronger container runtime, Kata Containers or gVisor.
  - B3: a microVM, such as Firecracker, around the whole runner, booted
    by the orchestrator.
- **C, privilege separation inside the runner, on one kernel.**
  - C1: the runner starts with ambient capabilities and spawns scripts
    as a second account.
  - C2: a setuid helper such as `sudo` spawns the scripts.
  - C3: the runner drops its privilege and keeps a script host that
    holds it.

| Form | Boundary                                    | Who it stops                                           | What it leaves open                                             | Where the work lands                             | Runner change                                   |
| :--- | :------------------------------------------ | :----------------------------------------------------- | :-------------------------------------------------------------- | :----------------------------------------------- | :---------------------------------------------- |
| A1   | namespaces and seccomp around each script   | a script, from the files and network it is denied      | the host kernel; with the network on, every device and loopback | the runner, and a looser container               | a dependency, a platform split, a new stop path |
| A2   | a guest kernel per run                      | a script, from everything outside its VM               | the network the host routes to the VM                           | the runner: VM lifecycle, guest agent, images    | larger than any planned issue                   |
| A3   | a guest kernel per runner                   | the scripts, from the runner and the host              | the network; one run can affect the next                        | the runner: VM lifecycle, guest agent, images    | larger than any planned issue                   |
| B1   | the container                               | the runner and its scripts together, from the host     | the runner's files to its scripts                               | the compose file                                 | none                                            |
| B2   | a user-space kernel or a VM per container   | the runner and its scripts together, from the host     | the runner's files to its scripts                               | the container runtime                            | none                                            |
| B3   | a microVM around the runner                 | the runner and its scripts together, from the host     | the runner's files to its scripts, unless combined with C1      | the orchestrator                                 | none                                            |
| C1   | two accounts on one kernel                  | a script, from the runner's files, environment and key | the kernel, the network, the run directory                      | the runner, and the orchestrator's start command | spawn as an account, check the layout           |
| C2   | two accounts, through `sudo`                | as C1                                                  | as C1, plus `sudo` and its rules                                | the runner, and the host's `sudoers`             | spawn through `sudo`                            |
| C3   | two accounts, with a privileged script host | as C1                                                  | as C1, plus the protocol between runner and host                | the runner                                       | a second process that runs the scripts          |

Against the owner's earlier decisions of the sandbox research, Q1 to
Q8:

| Form | Loopback and devices without a proxy (Q3) | SIGTERM grace of D18 (Q5)     | 17a and 17b measure the script (Q6) | Run files shared between runs | Runner still runs on Windows (Q4) | Opt-in, off by default (Q8) | What the operator ships (Q7)                         |
| :--- | :---------------------------------------- | :---------------------------- | :---------------------------------- | :---------------------------- | :-------------------------------- | :-------------------------- | :--------------------------------------------------- |
| A1   | no, unless the network part is off        | no: SIGTERM becomes SIGKILL   | no: they see the wrapper            | yes                           | yes; srt on Windows is alpha      | yes                         | bubblewrap, socat, ripgrep, a looser seccomp profile |
| A2   | devices yes; loopback no                  | only through a guest agent    | no: they see the VMM                | no                            | yes                               | yes                         | KVM, kernel, root filesystem, agent, TAP set-up      |
| A3   | devices yes; loopback no                  | only through a guest agent    | no: they see the VMM                | yes                           | yes                               | yes                         | as A2                                                |
| B1   | yes                                       | yes                           | yes                                 | yes                           | yes                               | the operator's              | compose keys                                         |
| B2   | yes                                       | yes                           | yes                                 | yes                           | yes                               | the operator's              | the runtime                                          |
| B3   | yes; loopback is inside the VM            | yes                           | yes                                 | yes                           | yes                               | the operator's              | KVM, kernel, root filesystem with Node and runner    |
| C1   | yes                                       | yes, with `CAP_KILL`          | yes: `/proc` is world-readable      | yes                           | yes; the switch is Linux only     | yes                         | two accounts and a start command                     |
| C2   | yes                                       | only if `sudo` passes signals | they see `sudo`                     | yes                           | yes                               | yes                         | `sudo` and its rules                                 |
| C3   | yes                                       | through the host's protocol   | through the host                    | yes                           | yes                               | yes                         | as C1                                                |

Q1 (the threat), Q2 (the boundary between users) and Q6 (the runner
reports, the deployment limits) hold for every form. Q7, whether the
container may be loosened for an inner sandbox, was left open in the
research; only A1 and, with Firecracker's jailer, A2 and A3 would need
it. With those set aside, the answer is no: nothing is hosted inside
the container, so it is not loosened.

### Why the Other Forms Were Set Aside

- **A1, srt.** On Linux a SIGTERM to the sandbox becomes a SIGKILL of
  its whole tree, which defeats D18. With network isolation on it
  blocks loopback and private addresses, so `RUNNER_URL` and devices on
  a LAN fail; with it off, the code path is undocumented and the
  configuration's type refuses it. Inside the runner's container it
  needs a seccomp profile looser than Docker's default, which weakens
  the container around the runner to build a weaker wall inside it. It
  is a `0.0.x` release about once a week, labelled a research preview.
- **A2 and A3, Firecracker around the scripts.** The guest's loopback is
  its own, so `RUNNER_URL` at `127.0.0.1` no longer reaches the runner.
  The script context, stdin, the output and the exit code all need an
  agent in the guest over vsock. 17a and 17b would measure the VMM,
  not the script. A VM per run can not share the run files that the
  hospital demo's scripts keep between runs. Each is larger than any
  runner issue planned.
- **B1 and B2** are the orchestrator's options. They need no runner
  work, and they keep the runner's files open to its scripts, which is
  what C1 closes. An operator may add them at any time.
- **C2** adds `sudo`, its rules and a setuid binary to every host.
- **C3** re-implements the runner's spawning, stop and measurement
  across a process boundary.

## The Design Chosen: B3 and C1

The orchestrator may wrap the whole runner in a microVM, in a
container, or in nothing. Inside, the runner and its scripts run as two
accounts, and the runner starts each script through util-linux
`setpriv`. The decisions:

### Opt-In

The setting `scripts.user` of `runner.yaml` names the account that the
scripts run as. It is off by default. The runner never
enforces isolation by itself: without the setting, scripts run as the
runner's account, as today. A deployment may add its own isolation
without any runner setting.

### The Script Account

The setting is an account name, resolved once at startup from
`/etc/passwd` for the uid and the primary gid, and from `/etc/group`
for the supplementary groups; a numeric uid, and a gid, are accepted as
well. A name that does not resolve stops the runner with an error.

### Rights

The runner acquires no right by itself. With the setting on, it must be
started as its own unprivileged account with three ambient
capabilities:

| Capability   | For                                                   |
| :----------- | :---------------------------------------------------- |
| `CAP_SETUID` | starting a script as the script account's uid         |
| `CAP_SETGID` | setting its gid and dropping the runner's groups      |
| `CAP_KILL`   | signalling the script, which another account now owns |

The runner itself switches no account. It spawns `setpriv` as its own
account; the ambient capabilities pass to `setpriv` across the exec,
and `setpriv` uses them to switch to the script account (see
[Capabilities must not reach the script](#capabilities-must-not-reach-the-script)).

With systemd, _unverified_ in practice: `systemd.exec(5)` documents
`AmbientCapabilities=` for a service that runs as a non-privileged
`User=`, and adds `keep-caps` to keep the capabilities across the
change of user, but these lines have not been run:

```ini
[Service]
User=dt-runner
Group=dt-runner
AmbientCapabilities=CAP_SETUID CAP_SETGID CAP_KILL
CapabilityBoundingSet=CAP_SETUID CAP_SETGID CAP_KILL
NoNewPrivileges=yes
ExecStart=/usr/bin/runner --config /etc/dt/hospital-1/runner.yaml
```

From a shell script that runs as root, or through `sudo`, with
util-linux `setpriv`, which needs the capabilities in the inheritable
set before it can make them ambient:

```bash
exec setpriv --reset-env --reuid=dt-runner --regid=dt-runner --init-groups \
  --inh-caps=+setuid,+setgid,+kill --ambient-caps=+setuid,+setgid,+kill \
  -- runner --config /etc/dt/hospital-1/runner.yaml
```

Verified in the experiment: started with
`sudo setpriv --reset-env --reuid=1000 --regid=1000 --init-groups
--inh-caps=+setuid,+setgid,+kill --ambient-caps=+setuid,+setgid,+kill
-- …`, Node ran as uid 1000, and `capsh --print` showed
`Current: cap_kill,cap_setgid,cap_setuid=eip` and the same three in its
`Ambient set`. `setpriv` keeps the capabilities across its own change
of uid from root. `--reset-env` is required: `sudo` keeps `HOME=/root`,
which the runner would otherwise inherit; with it, `setpriv` sets
`HOME`, `SHELL`, `USER` and `LOGNAME` from the runner account's
`/etc/passwd` entry (`setpriv(1)`).

The script account in the experiment was a system account without a
home directory or a login shell:

```bash
useradd --system --no-create-home --shell /usr/sbin/nologin dt-scripts
```

At startup with the setting on, the runner checks that it can switch:
that it is not uid 0, that `/usr/bin/setpriv` exists, and that it holds
the three capabilities in its effective and its ambient set. A runner
that runs as uid 0 with the setting on refuses to start, as does one
that lacks a capability, with an error that says which. Only the
ambient set passes through `execve` to `setpriv`, so a runner that got
the capabilities from file capabilities on `node` is refused too. On
Windows, and any platform other than Linux, the setting is a startup
error; without it, the runner runs on Windows unchanged.

#### Capabilities must not reach the script

Under the rules of `capabilities(7)`, a change of uid between two
non-zero uids clears no capability, and `execve` passes the ambient set
on to the new program. Node's `child_process`, and execa over it, can
not clear capabilities between the fork and the exec. The experiment
confirmed it: a script that Node spawned with its `uid` and `gid`
options showed `CapInh`, `CapPrm`, `CapEff` and `CapAmb` of
`00000000000000e0` in `/proc/self/status`, that is `CAP_SETUID`,
`CAP_SETGID` and `CAP_KILL`. Such a script could switch back to the
runner's uid and read the key. Issue 18 therefore does not use those
options. It starts each script through `setpriv`, with the script
account's uid `U` and gid `G`:

```bash
setpriv --reuid U --regid G --init-groups \
  --inh-caps=-all --ambient-caps=-all --no-new-privs -- <script>
```

`setpriv` replaces itself with the script, so the runner still
signals the script's own pid. In the experiment, the script so started
showed every `Cap*` line of `/proc/self/status` at zero and
`NoNewPrivs: 1`. With the no-new-privs bit set, `execve` grants no new
privileges (`setpriv(1)`), so neither a setuid binary nor a file
capability can raise the script's privilege again.

`--bounding-set=-all` must not be added: without `CAP_SETPCAP`, which
the runner does not hold, it fails with "Operation not permitted".
No-new-privs makes it unnecessary.

The experiment ran the line above with `--reset-env` as well; the
script launch leaves it out. `--reset-env` clears every variable but
`TERM` (`setpriv(1)`), which would drop the script context. The runner
builds the whole environment of the script itself (see
[Environment](#environment)), and `setpriv` passes it on unchanged. The
experiment verified the capabilities and the groups, not the
environment, so issue 18's end-to-end test,
`test/e2e/script-user.spec.ts`, also shows that the script sees
`RUNNER_URL`, `RUNNER_TOKEN`, and the `HOME` of the script account.

### Layout Verified, Never Imposed

At startup with the setting on, the runner checks the files against
the script account and names each path that fails, in one error:

| Path                                  | Must be, for the script account                                 |
| :------------------------------------ | :-------------------------------------------------------------- |
| `runner.yaml`                         | not readable, not writable, no writable ancestor                |
| the key of `auth.key`                 | not readable, not writable, no writable ancestor                |
| the state machine file                | not readable, not writable, no writable ancestor                |
| the database's directory              | no permission at all (no `r`, `w` or `x`), no writable ancestor |
| the database file, when it exists     | not readable, not writable                                      |
| the scripts directory and every entry | not writable, no writable ancestor                              |
| the run directory                     | writable (`w` and `x`), every ancestor searchable               |

A path counts as readable or writable only if the account can search
every directory above it; a symbolic link is judged by its target. An
ancestor that the account can write lets it rename the path away and
put its own in its place, unless the ancestor has the sticky bit and
the account owns neither it nor the entry, as in `/tmp`. The database
directory must grant nothing, as SQLite creates its journal there with
the runner's umask after the check. The check does not see ACLs,
AppArmor, or accounts from NSS sources other than `/etc/passwd` and
`/etc/group` (`src/scripts/layout.ts`).

The runner's own environment needs no check of files: on Linux
`/proc/<pid>/environ` of the runner is readable only by its own account
and by processes allowed to trace it, which the script account is not
once its uid differs. The runner never runs `chmod` or `chown`; the
layout is the orchestrator's (see [Orchestrator Requirements](#orchestrator-requirements)).

### Working Directory

The setting `scripts.runDirectory` names the run directory, relative to
`runner.yaml` or absolute. It is required: the scripts location, the
default first settled, can never pass the layout check, which wants the
scripts not writable and the run directory writable. It becomes the
working directory of every script and the one place the script account
may write. Its files are shared between runs by design. Without the
setting, a script runs in the runner's own working directory.

### Environment

With the setting on, a script gets an allow-list instead of the whole
of the runner's environment:

- `HOME`, `USER` and `LOGNAME` from the script account's entry in
  `/etc/passwd`, not the runner's;
- `PATH` set to a fixed default, `/usr/local/bin:/bin:/usr/bin`, the
  value that `setpriv(1)` gives a regular user when `/etc/login.defs`
  sets no `ENV_PATH`;
- `TMPDIR` and `LANG` with the runner's values;
- then the runner variables, the file's `env` and the state's `env`.

`scriptEnvironment` in `src/fsm/script-context.ts` builds the whole map
and `src/execa-runner.ts` passes it with `extendEnv` off, so only the
inherited base changes (`scriptBase` in `src/scripts/launch.ts`). With
the setting off, nothing changes.

`setpriv` holds the three capabilities from its start until it
switches, without the secure-execution mode that would make the dynamic
loader ignore `LD_PRELOAD` and its kin, as the capabilities come from
the ambient set only. So with the setting on, a state machine file
whose `env`, or a state's `env`, declares a name that the loader or the
C library reads a file from (`LD_*`, `MALLOC_*`, the rest of glibc's
`unsecvars.h`, `LANG`, `LANGUAGE` and `LC_*`) is refused at startup.
That the loader would honour them was reasoned from the kernel and
glibc, not tried (_unverified_).

### Stop

A stop sends `SIGTERM`, then `SIGKILL` after `stopGrace`, as now (D18).
`CAP_KILL` lets the runner signal a process of another account. A kill
of the whole tree is not planned by 17b, which measures the tree only.

### Measurements

17a and 17b read `/proc/<pid>/stat` and `/proc/<pid>/status`, and 17b
also `/proc/<pid>/task/*/children` or the list of `/proc`, which any
account may read, so they are unaffected by the second account.

### Supplementary Groups

The script must not keep the runner's supplementary groups, or it may
read what the runner's group can. libuv resets the supplementary groups
when Node changes the uid of a child: in the experiment, the script
that Node spawned with its `uid` and `gid` options showed only its own
group. The script launch does not rely on that, as it goes through
`setpriv`, which sets the script account's own groups with
`--init-groups`.

### RUNNER_TOKEN

The script token is unchanged: the same role, the same lifetime and
the same limits as in the table under
[Accepted Residual Risks](#accepted-residual-risks).

### Testing

- Unit tests with fakes for the resolution of the account, the spawn
  options, the checks of capabilities and of the layout, and the
  allow-listed environment.
- An end-to-end test on Linux CI that creates a script account, starts
  the runner under `setpriv` with the three capabilities, and shows
  that a script runs as that account with only its own group, holds no
  capability, has `NoNewPrivs: 1`, sees `RUNNER_URL`, `RUNNER_TOKEN`
  and the script account's `HOME`, and can not read the key.
- The test is skipped on Windows through `process.platform`, and on a
  Linux host without `CI=true` and a passwordless `sudo -n`, where the
  runner can not get the capabilities: in WSL, for one.

## Implementation Technologies

| Need                     | Technology                                                                                                                                                                                                                                                                                              |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| spawn as another account | execa (`^9.6.1` in `package.json`, on Node `>=24`) spawns util-linux `setpriv` as the runner's account, and `setpriv` switches to the script account and clears the capabilities, as above; not the `uid` and `gid` options of Node's `child_process.spawn`, which leave the capabilities in the script |
| resolve the account      | read and parse `/etc/passwd` (`name:x:uid:gid:gecos:home:shell`) and `/etc/group` (`name:x:gid:members`); no dependency                                                                                                                                                                                 |
| grant the rights         | Linux ambient capabilities: util-linux `setpriv --reset-env --inh-caps --ambient-caps` (verified), or systemd's `AmbientCapabilities=` (_unverified_)                                                                                                                                                   |
| check the rights         | `/proc/self/status`: `CapEff` and `CapAmb` as bit masks; `CAP_KILL` is bit 5, `CAP_SETGID` bit 6, `CAP_SETUID` bit 7; `process.getuid()`                                                                                                                                                                |
| check the layout         | `fs.stat` of each path: compare its `uid`, `gid` and `mode` with the script account's uid, gid and groups. The other-bits apply unless the account owns the file or is in its group. ACLs are not seen this way (_unverified_ need)                                                                     |
| tell the platform        | `process.platform`                                                                                                                                                                                                                                                                                      |
| stop                     | the existing path: execa's `kill()` with `forceKillAfterDelay` (`src/execa-runner.ts`)                                                                                                                                                                                                                  |

A check that a path is not readable by the script account must also
consider its parent directories: without search permission on a
directory, the account can not reach the files under it whatever their
mode. Issue 18 checks every directory up to `/`, as
[Layout Verified, Never Imposed](#layout-verified-never-imposed) says.

## Orchestrator Requirements

The contract the runner expects from whatever starts it, for the deploy
issue to copy:

- [ ] Create the runner account and the script account; neither is
      root, and the script account is in none of the runner account's
      groups.
- [ ] Own `runner.yaml`, the key, the database and the scripts
      directory by the runner account. Give `runner.yaml` and the key
      mode `600`. Make the scripts readable and executable by the
      script account and writable by no one but the runner account.
- [ ] Put the database in a directory that the script account can not
      read or write, as SQLite writes its journal beside the file.
- [ ] Create a run directory writable by the script account.
- [ ] Start the runner as its account with the ambient capabilities
      `CAP_SETUID`, `CAP_SETGID` and `CAP_KILL`.
- [ ] Keep loopback reachable, so that `RUNNER_URL` at `127.0.0.1`
      reaches the runner.
- [ ] Route the broker, the peers, the webhook and the DT's devices as
      the DT needs; the runner adds no proxy or filter.
- [ ] Deliver `SIGTERM` to the runner, and wait at least the longest
      `stopGrace` plus the time of a script's clean-up before a kill.
- [ ] For a microVM (B3): a kernel and a root filesystem with Node and
      the runner, port forwarding for the runner's port, and a graceful
      shutdown that delivers `SIGTERM` to the runner.
- [ ] For Docker: the lines below.

[PRIVILEGE-SETUP.md](privilege-setup.md) carries out this list on
Ubuntu, with the commands and the modes.

```yaml
services:
  runner:
    user: root # the entrypoint drops to the runner account
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
      - --reuid=dt-runner
      - --regid=dt-runner
      - --init-groups
      - --inh-caps=+setuid,+setgid,+kill
      - --ambient-caps=+setuid,+setgid,+kill
      - --
      - node
      - dist/src/main.js
      - --config
      - runner.yaml
```

Docker does not give ambient capabilities to a process that runs as a
non-root `USER`, so `cap_add` alone does not reach a runner that the
image starts as such a user. The container therefore starts as root,
and `setpriv` drops to the runner account with the three capabilities
ambient. `no-new-privileges` does not stop that, as `setpriv` is not a
setuid binary. These lines are _unverified_: the experiment ran the
`setpriv` line under `sudo` on WSL, not in a container. The entrypoint
leaves out `--reset-env`, which would also drop the variables that
compose sets; the runner then keeps root's `HOME`, which the deploy
issue is to settle.

What DTaaS has today: `compose.runner.yml` and `compose.runner.dev.yml`
in `servers/execution/runner`, and the image of
`developer/check/runner.dockerfile`, run the runner as `node`, uid 1000,
with Docker's default capabilities and no entrypoint of their own. To
use `scripts.user` they need the lines above and the two accounts in
the image, which the deploy issue is to add.

## Decided Since the Design

The owner settled these on 2026-10-27, after this guide was first
written:

- `GET /health` reports `scripts: { user }`, the script account, with
  the setting on, and `scripts: null` without it.
- Issue 18's decision is D35, and it does not bump the runner's
  version.
- The hospital demo gets a Linux shell variant, recorded in WSL with
  the setting on, from a copy of the demo inside the WSL filesystem.
  Postponed from issue 18 to the recording of issue 16, which records
  both platforms with the setting on.
- The deploy issue is one issue with three deliverables: the compose
  files and image of today, a systemd unit for a bare host, and the
  microVM (B3) contract that a future Execution Manager must provide.
- An operator help document is a task of issue 18; it is
  [PRIVILEGE-SETUP.md](privilege-setup.md), beside the other guides.
- The configuration keys are `scripts.user`, `scripts.group` and
  `scripts.runDirectory`, the last required.
- The spawn clears the capabilities through the `setpriv` launch of
  [Capabilities must not reach the script](#capabilities-must-not-reach-the-script).

## Not Decided Yet

- The `HOME` of a runner that a Docker entrypoint starts without
  `--reset-env`, which the deploy issue is to settle; PRIVILEGE-SETUP.md
  keeps `--reset-env`, as the runner reads none of compose's variables.

Further reading:
[the script sandbox research](../../../../developer/system/servers/execution/runner/Sandbox.md),
[the Firecracker microVM research](../../../../developer/system/servers/execution/runner/Firecracker.md),
and the
[plan of the script account](../../../../developer/plans/servers/execution/runner/issues/18-script-user.md).
