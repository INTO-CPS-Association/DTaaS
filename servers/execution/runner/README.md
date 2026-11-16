# Runner

A utility service for the safe execution of remote scripts and commands.
Users launch this from the command line and the utility manages
command execution.

The runner runs as a service and provides a
REST API, and optionally an MQTT API, for safe remote command execution.
Multiple runner instances can be active simultaneously on one machine.
Commands are submitted via the API and executed on the host
running the runner.

Warning: Thanks for trying out this software.
This software is in early stages of development and is not
recommended for production use. Each released package will have
a working API and matching documentation in this README.
However, there will be breaking changes in the API across each release
until the package reaches version 1.0.0.

The runner works on Linux and Windows. On Windows, it runs
the PowerShell version of each script (see [Create Commands](#create-commands)).

Other documents of the runner:

- [STATE-MACHINE.md](STATE-MACHINE.md): writing and running a state
  machine.
- [api/API.md](api/API.md): every route, topic and notification, with
  examples.
- [DOCKER.md](DOCKER.md): running the runner in a container.
- [SECURITY-MODEL.md](SECURITY-MODEL.md): what the runner protects from
  its scripts, and what it expects of the system that starts it.
- [PRIVILEGE-SETUP.md](PRIVILEGE-SETUP.md): running the scripts as a
  second account on Linux.
- [DEVELOPER.md](DEVELOPER.md) and the
  [design document](docs/state-machine-design.md): for developers.
- [docs/sandbox-runtime-research.md](docs/sandbox-runtime-research.md)
  and [docs/firecracker-research.md](docs/firecracker-research.md): the
  research behind the security model.

## Install

The runner needs Node.js 24 or later.

### NPM Registry

The package is available on
[npmjs](https://www.npmjs.com/package/@into-cps-association/runner).

Install the package with the following command:

```bash
sudo npm install -g @into-cps-association/runner
```

### Github Registry

The package is available in Github
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages).

Set the registry and install the package with the following commands

```bash
sudo npm config set @into-cps-association:registry https://npm.pkg.github.com
sudo npm install -g @into-cps-association/runner
```

The _npm install_ command asks for username and password. The username is
your Github username and the password is your Github
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
In order for the npm to download the package, your personal access token
needs to have _read:packages_ scope.

## Configure

Warning: without `principals` in an `auth` section, anyone who can
reach the runner's port or its MQTT request topics can run its commands
and drive its state machine. List the callers under `auth.principals`
([Access Control](#access-control)) on any network that others share.

The utility requires config specified in YAML format.
A sample configuration is given below. Copy it into a file named
_runner.yaml_, and update the values for your setup:

```yaml
id: 'my-dt' # names the digital twin that this runner serves
port: 5000
location: 'scripts' # directory of scripts, relative to this config file
commands: # list of permitted scripts
  - create
  - execute
  - terminate
```

With this configuration, the scripts are placed in a `scripts` directory
next to _runner.yaml_, and only the _create_, _execute_ and _terminate_
scripts can be run.

`id`, `port`, `location` and `commands` are required. The runner does
not start when one of them is missing, when a value is invalid, or
when _runner.yaml_ has a key that the runner does not know; the error
message names every problem.

Version 0.5.0 made `id` required and replaced the fixed
_state-machine.yaml_ in `location` with the `stateMachine` key (see
[State Machine](#state-machine)). A _runner.yaml_ of an earlier version
needs both changes.

It is suggested that the configuration file be named as _runner.yaml_
and placed in the directory in which the _runner_ microservice is run.

The `location` refers to the relative location of the scripts directory
with respect to the location of _runner.yaml_ file.

However, there is no limitation on either the configuration filename or
the `location`. The path to _runner.yaml_ can either be relative or
absolute path. However, the `location` path is always relative path
with respect to the path of _runner.yaml_ file.

Warning: Ensure that the commands have execute permission
on Linux platforms.

### Digital Twin

The `id` names the digital twin that the runner serves, so that a
Manager can tell runners apart. It has up to 64 letters, digits, `_`,
`.` or `-`, and starts with a letter or digit. Optional `attributes`
describe the digital twin to a Manager:

```yaml
id: 'hospital-1'
attributes: # optional; strings, numbers or booleans
  city: 'Aarhus'
  beds: 120
```

The attributes are a flat map: a value can not be a list or a map.
Their names follow the pattern of `id`. The runner returns `id`,
`attributes` and its enabled [peers](#peers) on
[GET /dt](#get-request-to-dt).

### Command History

The runner keeps the commands it receives, with their results, in an
SQLite database. The database is in memory unless the configuration
names a database file, relative to the configuration file:

```yaml
database: 'runner.db'
```

With a database file, the history, the status of the last command,
the request keys of [repeated requests](#repeated-requests), the
[state machine](#restarts), the [parameter values](#parameters) and
the switches of [PUT /peers](#peers-requests) survive a restart of the
runner. No script survives one: a command that
was running when the runner stopped is `interrupted` after the restart.
The runner creates the directory of the database file if needed. Give
each runner a database file of its own.

[GET /history](#get-request-to-history) returns the commands with their
status, exit code, times, caller and [resources](#resources), and
[GET /metrics](#metrics) counts them by status and totals their
resources since the runner started.

Version 0.10.0 made `GET /history` return these records instead of the
names of the commands, with the `since` and `limit` parameters, and
added `GET /metrics`.

### MQTT

The runner serves the same API over MQTT when the configuration
has an `mqtt` section. HTTP remains available on `port`.

```yaml
mqtt:
  url: 'mqtt://localhost:1883' # mqtt://, mqtts://, ws:// or wss://
  topic: 'dtaas/user1/runner' # base topic of this runner
  username: 'runner' # optional
  password: 'secret' # optional
  protocolVersion: 5 # optional; 5 (default) or 4 for MQTT 3.1.1
```

The `topic` must be unique to each runner that shares a broker,
must not contain the `+` or `#` wildcards, and must not start with `$`
or end with `/`.
The runner keeps reconnecting while the broker is unavailable or
refuses the connection, and serves HTTP in the meantime. The runner does not start
if the `mqtt` section is invalid.

With a [signing key](#signed-output), the runner signs every payload it
publishes: its responses, its notifications and its will.

### Stop Grace Period

A [stop](#stopping-scripts) sends `SIGTERM` to a script and, if the
script is still running after a grace period, `SIGKILL`. The optional
`stopGrace` sets the period in milliseconds; it is five seconds
without it:

```yaml
stopGrace: 5000
```

### Webhook

The runner posts its [notifications](#notifications) to a webhook
when the configuration has a `notify` section:

```yaml
notify:
  url: 'https://manager.example.org/dt-events' # http:// or https://
  token: 'secret' # optional; sent as Authorization: Bearer <token>
```

The runner posts its [presence](#presence) at startup and, at
shutdown, its offline notice once, with a 2 s timeout and no retry, so
that a slow webhook does not hold the shutdown.

With a [signing key](#signed-output), each body is a signed JWS, of
type `application/jose`. The token still authenticates the runner to
the webhook; the signature lets the receiver check every body,
including those it stores or forwards.

### Access Control

With `principals` in an `auth` section, the runner answers only the
callers it lists, each in a role:

```yaml
auth:
  principals:
    - name: manager-1
      role: manager # manager or client
      publicKey: 'mCpoaytWvGJ9K0lxNlSNw6sjUG7UezRWtxPvL1pyxKA'
    - name: alice
      role: client
      publicKey: 'o-YAagcjoyUxT2xcgULS22sCK6N_cJ-op8Jh7yukXMk'
```

- `name` follows the pattern of `id`, is unique, and is not `script`.
  The section needs one principal at least, or a
  [signing key](#signed-output).
- `publicKey` is an Ed25519 public key as the base64url of its 32 raw
  bytes, the `x` of its JWK. The caller keeps the private key; the file
  holds no secret, and deleting a principal revokes it at the next
  start. The demo's
  [tools/keygen.mjs](demo/hospital/tools/keygen.mjs) writes a key pair.
- Each request carries `Authorization: Bearer <token>`, a token that
  the caller signs for that one request and at most one minute; over
  MQTT the request payload is the token. [API.md](api/API.md#access-control)
  gives the token format and a signing example.
- A `client` may call every route. A `manager` may read, set
  parameters, enable and disable [peers](#peers) and run the
  [manager commands](#manager-commands). The
  runner's own scripts call it in the role `script` with the token in
  `RUNNER_TOKEN` (see [Script Environment](#script-environment)): they
  may read, raise events and escalate.
- `GET /health` and MQTT `health` stay open, for liveness probes.
- A request without a valid token gets `401`, and a role that may not
  call the route `403`. The runner logs each accepted request with its
  principal at `debug` level, and stores the principal of each command
  it runs.

Without `auth.principals` every route is open and the runner ignores
any `Authorization` header; so is an `auth` section with only a
[key](#signed-output).

Version 0.9.0 added access control. It changes no route without
`auth`; a database file of an earlier version gains a `by` column for
the principal of each command at the first start.

### Signed Output

With `key` in the `auth` section, the runner signs what it sends on its
own or in reply, so that a receiver that holds its public key can check
that a message came from this DT and was not changed:

```yaml
auth:
  # an Ed25519 private key, PEM PKCS#8, relative to this file
  key: 'keys/hospital-1.key'
```

- `key` is independent of `principals`: a runner may sign without
  verifying its callers, and the reverse. A relative path is taken
  from the directory of _runner.yaml_; an absolute path, such as one
  in a mounted secret directory, works too.
- [tools/keygen.mjs](demo/hospital/tools/keygen.mjs) writes the key:
  `node keygen.mjs hospital-1 keys` gives `keys/hospital-1.key` and
  prints the public key, which it also writes to `keys/hospital-1.pub`.
- The runner does not start when the file cannot be read, is
  encrypted, or holds a key that is not an Ed25519 private key; the
  error names the file, never its content.
- Every MQTT payload of the runner, the responses, the
  [notifications](#notifications) and the will, and every webhook body
  is then a compact JWS (RFC 7515) whose payload is the same JSON as
  without a key. Its header is `{"alg":"Ed25519","kid":"<id>"}`. HTTP
  replies stay plain JSON.
- [GET /dt](#get-request-to-dt) and the online notice give the public
  key as `publicKey`, in the encoding of the principals' keys, which
  another runner lists as the `publicKey` of this DT among its
  [peers](#peers).

A signature proves origin and integrity, not that a message is new: a
receiver that must not go back in time compares `time` with that of
the last message it took. A new key takes a restart, and a new public
key for every receiver. [API.md](api/API.md#signatures) shows a signed
notification and how to verify it.

Without `key` every payload is plain JSON, as before.

### Peers

A digital twin lists the peers it is willing to interact with in an
optional `peers` section; nothing else is a peer, and the runner
discovers none:

```yaml
peers:
  - id: 'hospital-2'
    topic: 'dtaas/hospital-2' # its MQTT base topic, on this broker
    url: 'http://localhost:5200' # its HTTP base URL
    attributes: # optional; strings, numbers or booleans
      distance: 12.4
    enabled: true # optional; true by default
    publicKey: 'mCpoaytWvGJ9K0lxNlSNw6sjUG7UezRWtxPvL1pyxKA' # optional
```

- `id` follows the pattern of the runner's `id`, is unique, and is not
  the runner's own.
- A peer has a `topic`, a `url` or both. `topic` follows the rules of
  `mqtt.topic`; it is unique and not the runner's own.
- `attributes` describe the relationship, such as a distance, with the
  rules of the runner's own [attributes](#digital-twin). The runner
  never reads them.
- `publicKey` is the key with which the peer signs its notifications,
  in the encoding of [access control](#access-control).

With an [mqtt section](#mqtt), the runner subscribes to the
[presence](#presence) and state [notifications](#notifications) of each
enabled peer with a `topic`, on its own broker, and remembers whether
the peer is online, its descriptor and its last state document. Both
are retained, so they arrive as soon as the runner subscribes. A
notification counts only if it is an envelope of its topic's kind and
of the peer's `id`; for a peer with a `publicKey`, only if it is a JWS
of the envelope that the key signed, with the peer's `id` as `kid`.
The runner logs and drops any other. A peer's notification sends
nothing; it raises an event only through a
[subscription](#peer-events) of the state machine file. Without MQTT,
the peers are listed but never followed.

[GET /peers](#peers-requests) shows the peers and what they told, and
[PUT /peers](#peers-requests) enables and disables them. A Manager can
not add a peer: only the operator, in _runner.yaml_, lists them. The
peers, their subscriptions, the signed output and the `resources` of
the commands were added at version 0.10.0 without a version bump, as
they change no route.

### Script User

On Linux, the runner can run its scripts as a second account, so that a
script reaches neither _runner.yaml_, the signing key, the database nor
the runner's own environment. An optional `scripts` section turns it
on:

```yaml
scripts:
  user: 'dt-script' # the account of the scripts: a name or a uid
  group: 'dt-script' # optional; instead of the account's primary group
  runDirectory: '/var/lib/dt/hospital-1/run' # where the scripts run
```

- `user` is a name or a uid of `/etc/passwd`, and `group` a name of
  `/etc/group` or a gid. A uid needs its entry in `/etc/passwd`.
- `runDirectory` is relative to _runner.yaml_, or absolute. It is the
  working directory of every script and the one place where a script
  may write; its files are shared between runs.
- Each script starts through `/usr/bin/setpriv` as the account, with
  its groups, without any capability and with no-new-privs. `setpriv`
  becomes the script in the same process, so
  [stopping](#stopping-scripts) and [resources](#resources) work as
  before.
- A script's environment starts from an allow-list instead of the
  runner's environment (see [Script Environment](#script-environment)),
  and the state machine file may not declare the variables that the
  dynamic loader reads (see [Declared Environment](#declared-environment)).

The runner must run as its own unprivileged account, with `CAP_SETUID`,
`CAP_SETGID` and `CAP_KILL` as ambient capabilities. At startup it
refuses to start on Windows and any platform other than Linux, as root,
without `/usr/bin/setpriv`, without the three capabilities, for root's
or its own account, and when the account could read or replace
_runner.yaml_, the key, the state machine file, the database or the
scripts, or could not write the run directory. It never changes a mode
or an owner: the error names every offending path, and
[PRIVILEGE-SETUP.md](PRIVILEGE-SETUP.md) shows the accounts, the modes
and the start commands. [GET /health](#health) names the account.

Without the section, the scripts run as the runner's account, in its
working directory, with its whole environment, on Linux and Windows
alike. The section was added at version 0.10.0 without a version bump,
as it changes no route.

## Create Commands

The runner requires commands / scripts to be run.
These need to be placed in the `location` specified in
_runner.yaml_ file.

For example, the `location` directory might contain
the two scripts: _create_ and _execute_. These two become
valid command names that consumers of REST API can invoke.
All other command execution requests result in invalid status.

On Windows, each command needs a PowerShell script with the `.ps1`
extension, for example _create.ps1_ for the _create_ command.
The runner executes it with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File`.
A directory can hold both versions of a script, so that the same
commands work on Linux and Windows.

A command request may carry an `input` object (see
[POST /](#post-request-to-)). The script reads it from stdin as one
line of JSON followed by a newline; nothing is passed on the command
line. Without input, and for the scripts that the
[state machine](#state-machine) starts, stdin is empty and closed, so a
script that reads stdin never waits. For example, `cat` in a shell
script or `[Console]::In.ReadToEnd()` in a PowerShell script reads the
whole input. Windows PowerShell decodes stdin in the console code page,
so a PowerShell script may garble input that is not ASCII.

The runner does not store the input, as it may hold personal data. It
does store the output of each script, so a script that prints its
input puts it in the [command history](#command-history).

### Script Environment

Each script inherits the environment of the runner. With a
[script account](#script-user) it inherits only `TMPDIR` and `LANG`,
and gets `HOME`, `USER` and `LOGNAME` of that account and `PATH` set to
`/usr/local/bin:/bin:/usr/bin`. The runner adds its own variables:

| Variable          | Value                                                             |
| :---------------- | :---------------------------------------------------------------- |
| `RUNNER_URL`      | `http://127.0.0.1:<port>`, the runner's own HTTP API              |
| `RUNNER_TOKEN`    | the bearer token of the scripts, with [auth](#access-control)     |
| `DT_ID`           | `id` of _runner.yaml_                                             |
| `DT_STATE`        | the state of the [state machine](#state-machine), as below        |
| `DT_ENTRY`        | the entry number of that state, as below                          |
| `DT_PARAM_<NAME>` | the value of each [parameter](#parameters) when the script starts |

For a script that the state machine runs, `DT_STATE` and `DT_ENTRY` name
the state it enters and the number of that entry. For a script of `POST
/` they name the current state and entry, or are empty and `0` before
the first transition. Without a state machine a script gets only
`RUNNER_URL`, `DT_ID` and, with access control, `RUNNER_TOKEN`.
`RUNNER_URL` uses the port that the runner listens on. `RUNNER_TOKEN` is
drawn anew at each start and is unset without `auth.principals`. The
state machine file may [declare more variables](#declared-environment).

The `DOCKER.md` file in the
[runner source](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/servers/execution/runner)
describes running the runner in a docker container.

### Resources

The runner measures what each script run uses, the commands of
`POST /` and the scripts of the state machine alike, and reports it
as `resources` on [POST /](#post-request-to-), [GET /](#get-request-to-),
[GET /history](#get-request-to-history) and [GET /metrics](#metrics):

```http
"resources": { "cpuSeconds": 0.469, "peakRssBytes": 115646464, "processes": 2 }
```

The figures cover the process tree of a run: the process that the
runner starts and every process below it. `cpuSeconds` is the user
plus system CPU time of every process seen in the tree, rounded to the
millisecond. `peakRssBytes` is the largest resident memory of the tree
in one sample, summed over its processes. `processes` is the largest
number of processes seen in one sample, the first one included. The
runner reports the figures and decides nothing; a Manager reads them
and acts.

| Platform | Tree found through                                                                                        | CPU time and memory of each process                                                 | Root of the tree                    |
| :------- | :-------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :---------------------------------- |
| Linux    | `/proc/<pid>/task/*/children`, or the parent in every `/proc/<pid>/stat` where the kernel lacks that file | fields 14 and 15 of `/proc/<pid>/stat`; `VmRSS` and `VmHWM` of `/proc/<pid>/status` | the script                          |
| Windows  | one `Get-CimInstance Win32_Process` per sample                                                            | `UserModeTime` and `KernelModeTime`; `WorkingSetSize` and `PeakWorkingSetSize`      | `powershell.exe` running the script |
| other    | none                                                                                                      | `null`                                                                              | none                                |

On Windows the tree holds `powershell.exe`, the `conhost.exe` that
Windows gives it, and the processes that the script starts, so the
figures include PowerShell's own: an idle PowerShell loop peaks at
about 110 MB, and `processes` is at least 2. On Linux every account
may read these files, so a script that runs as another account is
measured the same way.

A process that has exited can no longer be read, so the runner samples
the tree while it runs, finding it afresh each time: on Linux at the
start and every 500 ms, on Windows through one `powershell.exe` per
run, which needs a second or more to start and about half a second for
each query. A pid and a start time name a process, so a pid reused
during a run counts as a new process. The figures are lower bounds:

- A process that starts and exits between two samples is never seen,
  and one that exits loses the CPU time it used after the last sample
  that saw it. A script that runs many short commands loses most of
  them; their CPU time is small.
- A spike in memory shorter than the interval is missed, but the peak
  is never below the peak that the system kept for one process
  (`VmHWM`, `PeakWorkingSetSize`).
- A process whose parent exits leaves the tree, and so does every
  process once the script's own process exits, when sampling ends.

Resident memory counts shared pages, such as libraries, once for each
process, so the sum over a tree overstates them. A script that ends
before its first sample, such as a short PowerShell script, reports
`null`, as does a refused command, a command that is still running,
and one recorded before the runner measured resources. `processes`
alone is `null` for a run recorded before the runner measured the
tree. Measuring never fails, delays or stops a script.

## State Machine

[STATE-MACHINE.md](STATE-MACHINE.md) is a guide to writing and running
a state machine, with two worked examples.

A state machine moves a digital twin from one script to the next.
The user starts it with a transition to a script, and from then on
events and the exit of each script decide which script runs next.
The state machine of a digital twin is in a file that the
`stateMachine` key of _runner.yaml_ names. A relative path is relative
to _runner.yaml_, and an absolute path works too:

```yaml
stateMachine: 'scripts/state-machine.yaml'
```

The file holds the events and the states, and may declare
[parameters](#parameters), an [environment](#declared-environment)
and the conditions that [escalate](#escalation):

```yaml
events: # the events that clients may send
  - stop
  - reset
states: # each state runs the script of the same name
  create:
    transitions:
      $success: execute # when the create script succeeds
      $failure: terminate # when the create script fails
  execute:
    transitions:
      stop: terminate # when a client sends the stop event
  terminate:
    transitions:
      reset: create
```

- Each state is a script, and must be one of the `commands` of
  _runner.yaml_. Entering a state runs its script.
- `transitions` gives the next state for each event of a state.
- `events` lists the events that clients may send. It may be left out
  when only the completion events move the machine.
- A state without transitions may be left empty, as in `terminate:`.
- The runner raises the completion events itself when the script of
  the current state exits: `$success`, `$failure`, or `$stopped` when
  the runner [stopped](#stopping-scripts) it. Clients can not send
  them.
- A transition may stop the script of the state that the machine
  leaves, as described in [stopping scripts](#stopping-scripts).
- State and event names have up to 64 letters, digits, `_`, `.` or
  `-`, and start with a letter or digit.

The runner does not start if the file is invalid, for example when a
state is not a permitted command, a transition leads to an undeclared
state or uses an undeclared event, or `$success` and `$failure`
transitions alone form a loop, or if the file does not exist. Without
the `stateMachine` key, the state machine is off. The runner reads the
file when it starts.

A plain transition does not stop the script of the state that the
machine leaves; the script of the next state, such as _terminate_, has
to do that, unless the transition has `stop: true`. Nor does the runner
enter a state whose script is still running: a completion transition
into such a state is skipped with a warning in the log, and the machine
stays idle in its state.

A transition request waits until the machine is idle, so give each
state whose script may run long an event that leads out of it, as
_execute_ has `stop` above. Otherwise only a
[stop request](#post-request-to-stop) moves the machine while that
script hangs, and only when the state has no `$stopped` transition;
with one, the machine moves on and is busy again.

### Stopping Scripts

The runner stops a script on a [stop request](#post-request-to-stop)
and on a transition with `stop: true`. It sends `SIGTERM` and, if the
script still runs after the [grace period](#stop-grace-period),
`SIGKILL`. A script that the runner stopped is `stopped` in the
history and in `GET /`; a script killed from outside the runner has
failed.

When the runner stops the script of the current state, it raises
`$stopped`. A state without a `$stopped` transition stays idle in that
state, with the script status `stopped`. A loop through `$stopped` is
allowed, as it needs a stop request each time.

A transition stops the script of the state that the machine leaves
when its value names the next state and `stop: true`:

```yaml
events:
  - restart
  - stop
states:
  execute:
    transitions:
      restart: { state: execute, stop: true } # restarts the script
      stop: { state: terminate, stop: true }
  terminate:
```

On such an event the runner enters the next state at once and answers
`accepted`, then stops the script of the state it left, waits until
that script has exited, and runs the script of the next state. The
stopped script raises no `$stopped`, as the machine has left its
state. A transition to the same state thus restarts its script, which
a plain transition refuses while the script runs. A transition to
another state whose script runs is refused with `script running`.
`stop: true` is not allowed on `$success`, `$failure` and `$stopped`,
whose script has already exited.

Scripts must let a stop end them:

- The runner waits until the stdout and stderr of a script close. A
  child process that keeps them open, such as a foreground `sleep`
  under `sh`, which survives the `SIGTERM` of its shell, holds up the
  stop until it exits. End such children on `SIGTERM`, for example by
  starting the last command with `exec`, or with a `trap`.
- On Windows, the runner ends `powershell.exe` at once, without a
  grace period, and the processes that the script started keep
  running.

A stopped run reports the [resources](#resources) of its process tree
up to the last sample before the script's own process exited. The
processes that survive a stop are not measured.

### Restarts

The runner stores the state, the entry counter and the status of the
script in its [database](#command-history) at each entry and each
script exit, and resumes them when it starts again. With the database
in memory, a restarted runner has no state until the next transition
request.

- A state whose script was running when the runner stopped comes back
  with the status `interrupted`. The runner does not run that script
  again; the machine is idle, so a transition request or an event moves
  it on.
- A script that exits while the runner shuts down keeps its status, but
  the runner does not follow its completion transition.
- A stored state that the state machine file no longer has is dropped
  with a warning in the log, and the machine starts without a state.
  The entry counter is kept, so entry numbers never repeat.
- Without the `stateMachine` key, the runner logs the stored state and
  keeps it for a later start with the state machine.

Version 0.8.0 added the restore and the status `interrupted`; a runner
of an earlier version always started without a state.

### Parameters

The state machine file may also declare parameters: settings of the
digital twin that a Manager can read and, where the DT author allows
it, change.

```yaml
events:
  - restart
  - scope-changed
parameters:
  scope:
    type: enum
    values: [single, multi]
    default: single
    controllable: true # a Manager may change it
    event: scope-changed # raised when the value changes
  capacity:
    type: number
    default: 20
    controllable: false
states:
  create:
    transitions:
      $success: execute
  execute:
    transitions:
      restart: create
      scope-changed: { state: execute, stop: true }
```

- `type` is `string`, `number`, `boolean` or `enum`. An `enum` has
  `values`, a non-empty list of strings.
- `default` is required and must have the type of the parameter; the
  default of an `enum` must be one of its `values`. YAML reads `20` as
  a number, so a `string` parameter needs quotes, as in `'20'`. A
  `number` parameter refuses `"20"`, a string, and `.inf` and `.nan`.
- `controllable` is `false` unless given. Only controllable parameters
  can be [set over the API](#parameters-requests); the others are
  configuration that the digital twin shares with a Manager.
- `event`, if given, must be in `events`. The runner raises it when a
  request changes the value.
- Parameter names follow the rules of state and event names. Two names
  that differ only in case or in `.`, `-` and `_`, such as `a-b` and
  `A_B`, are refused, as both become the variable name `DT_PARAM_A_B`.

The runner never restarts a script on its own. A script that is
running keeps the values it started with. A DT author who wants a
change to take effect at once links the parameter to an event whose
transition restarts the script, as `scope-changed` does above with a
self-transition and `stop: true`.

The runner records each change, with its time, in its
[database](#command-history), and restores the latest values when it
starts again. A stored value of a parameter that is no longer declared,
or that no longer fits its declaration, such as a removed enum value,
is dropped with a warning in the log, and the parameter starts at its
default. A restored value raises no event.

No parameter name has a meaning to the runner. A DT that lets its
Manager trade accuracy for computing power declares a `fidelity`
parameter by convention, as
[STATE-MACHINE.md](STATE-MACHINE.md#pattern-fidelity) describes.

### Declared Environment

The state machine file may add variables to the
[script environment](#script-environment), for every script and for
the script of one state:

```yaml
env:
  LOG_LEVEL: info
  HINT: '${DT_ID}-${DT_PARAM_SCOPE}'
states:
  monitor:
    env:
      INTERVAL: 5
    transitions:
      stop: idle
```

- Names have upper-case letters, digits and `_`, start with a letter,
  and may not start with `DT_` or `RUNNER_`. Values are strings,
  numbers or booleans; the script reads them as strings.
- A value may use `${NAME}` for `RUNNER_URL`, `RUNNER_TOKEN`, `DT_ID`,
  `DT_STATE`, `DT_ENTRY` or the `DT_PARAM_` variable of a declared parameter. Any
  other name, such as another declared variable or a variable of the
  runner's own environment, stops the runner at startup, so the file
  means the same on every host. There is no escape for a literal `${`.
- Later wins: the runner's environment, the runner variables, the
  `env` of the file, the `env` of the state. A script of `POST /` gets
  the `env` of its command when the command is a state, even another
  state than the current one, which `DT_STATE` still names.
- On Windows, where names ignore case, a variable of the runner's
  environment such as `Path` gives way to a declared `PATH`.
- With a [script account](#script-user), the runner refuses to start
  when either `env` names a variable that the dynamic loader or the C
  library reads from a file: a name starting with `LD_`, `MALLOC_` or
  `LC_`, `LANG`, `LANGUAGE`, `TMPDIR`, or one of `GCONV_PATH`,
  `GETCONF_DIR`, `GLIBC_TUNABLES`, `HOSTALIASES`, `LOCALDOMAIN`,
  `LOCPATH`, `NIS_PATH`, `NLSPATH`, `RESOLV_HOST_CONF`, `RES_OPTIONS`
  and `TZDIR`. `setpriv` holds the runner's capabilities until it
  switches, and its loader would honour them.

### Raising Events From Scripts

A script raises a declared event as any client does, over HTTP:
`POST ${RUNNER_URL}/fsm/event` with `{ "event": "<name>" }`,
`Content-Type: application/json` and
`Authorization: Bearer ${RUNNER_TOKEN}`. The runner ignores the header
without [access control](#access-control), so a script may always send
it. The reply tells the script:

| Reply                                                                | For the script                                                                                                                                                        |
| :------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `202` `accepted`                                                     | its state is being left: the next state's script starts, and the exit of this one no longer moves the machine; with `stop: true` on the transition, `SIGTERM` follows |
| `400` `invalid event`, `Validation Failed`, `404` `no state machine` | a bug in the script or the state machine file; a retry does not help                                                                                                  |
| `409` `no transition`, `script running`                              | not now: the current state has no transition for the event, or the next state's script still runs                                                                     |
| `503` `stopping`                                                     | the runner is shutting down; the script should exit                                                                                                                   |

A shell script with `curl`; the code is `000` when the runner can not
be reached:

```sh
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $RUNNER_TOKEN" -d '{"event": "done"}' \
  "$RUNNER_URL/fsm/event")
case "$code" in
  202 | 503) exit 0 ;;
  409) echo "not now" ;;
  *) echo "event refused: $code" >&2 && exit 1 ;;
esac
```

The runner's container image has neither `curl` nor `wget`
([DOCKER.md](DOCKER.md)). A script that runs in it uses `node`, which
prints `0` when the runner can not be reached:

```sh
code=$(node -e "fetch(process.env.RUNNER_URL + '/fsm/event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + (process.env.RUNNER_TOKEN ?? ''),
  },
  body: JSON.stringify({ event: 'done' }),
}).then((reply) => console.log(reply.status), () => console.log(0))")
```

The runner starts a `.ps1` script with Windows PowerShell 5.1, whose
`Invoke-RestMethod` throws on a `4xx` or `5xx` reply and has no
`-SkipHttpErrorCheck`. `202` is the only success of the route, and
`$code` is `0` when the runner can not be reached:

```powershell
$headers = @{ Authorization = "Bearer $env:RUNNER_TOKEN" }
try {
  Invoke-RestMethod -Method Post -Uri "$env:RUNNER_URL/fsm/event" `
    -Headers $headers -ContentType 'application/json' `
    -Body '{"event": "done"}' | Out-Null
  $code = 202
} catch { $code = [int]$_.Exception.Response.StatusCode }
```

A script reads the current parameter values with
`GET ${RUNNER_URL}/parameters`; its `DT_PARAM_` variables keep the
values it started with.

### Escalation

A digital twin escalates to its Manager when it can not adapt by
itself any more, or wants a shared setting changed. The runner can not
judge that, so the DT author declares which conditions the runner
escalates by itself, and scripts or other clients can
[ask for an escalation](#escalation-requests) at any time:

```yaml
escalation:
  # the script of a state failed and the state has no $failure transition
  onFailure: true
  # a client event has no transition in the current state
  onNoTransition: true
```

- The section is optional, and both flags are `false` unless given;
  without them, only requests escalate. An unknown key or a value
  that is not a boolean stops the runner at startup.
- `onFailure`: the script of the current state ends `failed` and the
  state has no `$failure` transition. A `$failure` transition that the
  runner skips, as its state's script is still running, does not
  escalate, nor does a stopped script or `$success`.
- `onNoTransition`: a client event, over `POST /fsm/event` or MQTT,
  from a script too, gets `409 no transition` after the first
  transition. The runner escalates each event once per entry into a
  state, so a client that repeats an event does not flood the
  Manager. An invalid event, a request refused while the runner
  stops, and an event that a [parameter](#parameters) raises do not
  escalate.

The runner sends each escalation as a
[notification](#notifications) of kind `escalation`. An escalation
raises no event and does not change the state.

### Peer Events

A digital twin can react to its [peers](#peers) without a script that
polls them. The state machine file subscribes to a condition on a peer,
and the runner raises an event of the file when that condition turns
true:

```yaml
subscriptions:
  - peer: hospital-2 # the id of a peer of runner.yaml
    when:
      state: full # the peer's last state document is in state full
    event: neighbour-full # one of the events of the file
  - peer: hospital-2
    when:
      online: false # the peer's last presence notice is offline
    event: neighbour-down
```

- The section is optional. `when` holds exactly one of `state: <name>`,
  a state of the peer's machine, and `online: true` or `online: false`.
- The runner does not start when an entry has an unknown or a missing
  key, `when` has no condition or both, `peer` is not listed under
  `peers` (enabled or not), `event` is not under `events`, or two
  entries have the same `peer`, `when` and `event`. The same `peer`
  and `when` may raise two events, in file order.
- The runner keeps, for each subscription, whether its condition held
  in the last notice of the peer, and raises the event only when it
  turns from not holding, or unknown, to holding. The first notice
  after the start, such as a retained `full`, counts as a change. A
  state condition reads state documents only, and an `online` one
  presence notices only; a duplicate notice raises nothing. A machine
  that is `null` holds no state.
- The event takes the path of a client's `POST /fsm/event` without a
  request key, and nothing replies. Its transition is taken, a
  `stop: true` self-transition too; without one, it escalates with
  `onNoTransition` as a client's event does. Before the first
  transition it finds no transition, and during shutdown it is
  refused `stopping`; neither is raised again for that change. Each
  accepted event is logged with the peer and the condition.
- A disabled peer's notices do not arrive, and the runner forgets what
  it saw of a peer when it is disabled, so its first notice after an
  enable counts as a change. Notices that the runner drops, such as an
  unsigned one from a peer with a `publicKey`, raise nothing.

### Manager Commands

The state machine file may list the commands that a Manager of a
network of digital twins may submit:

```yaml
manager:
  commands:
    - admit
```

Each must be one of the `commands` of _runner.yaml_, or the runner does
not start. The list appears on [GET /dt](#get-request-to-dt); it is
empty without a state machine, without a `manager` section, or for a
bare `manager:` key. With [access control](#access-control), a
principal in the role `manager` may run only these commands and gets
`403` for any other; a `client` may run every permitted command.
Without access control the list is not enforced.

## Use

Display help.

```bash
$runner -h
Usage: runner [options]

Remote code execution for humans

Options:
  -c --config <string>  runner config file specified in yaml format (default: "runner.yaml")
  -h --help             display help
```

The config option is not mandatory. If it is not used, **runner** looks for
_runner.yaml_ in the directory from which it is being run.
Once launched, the utility runs at the port specified in
_runner.yaml_ file.

```bash
runner  #use runner.yaml of the present working directory
runner -c FILE-PATH       #absolute or relative path to config file
runner --config FILE-PATH #absolute or relative path to config file
```

If launched on one computer,
you can access the same at `http://localhost:<port>`.

Access to the service on network is available at `http://<ip or hostname>:<port>/`.

### Application Programming Interface (API)

[API.md](api/API.md) is the full reference of the HTTP and MQTT APIs and of
the notifications, with examples from the
[hospital demo](demo/hospital/README.md).

The runner serves sixteen routes. Four run and stop commands, three
drive the [state machine](#state-machine-requests), two read and set
its [parameters](#parameters-requests), one
[describes the digital twin](#get-request-to-dt), one returns
[its state](#get-request-to-state), one its [health](#health), one
[metrics](#metrics), one
[escalates to the Manager](#escalation-requests) and two
[read and switch its peers](#peers-requests). The routes for commands
and their responses are:

| REST API Route         | HTTP Method | Return Value                                                            | Comment                                                                                                 |
| :--------------------- | :---------- | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| localhost:port         | POST        | Returns the execution status of command                                 | Executes the command provided. All the commands sent in the right JSON format gets stored in _history_. |
| localhost:port         | GET         | Returns the execution status of the last command sent via POST request. |                                                                                                         |
| localhost:port/history | GET         | Returns the commands received, with their status and times.             |                                                                                                         |
| localhost:port/stop    | POST        | Returns the names of the stopped commands                               | Stops one running command, or all of them.                                                              |

#### POST Request to /

Executes a command. The command name given here must exist
in _location_ directory. The optional `input` is a JSON object that
the script reads from stdin, as described in
[create commands](#create-commands):

```http
{
  "name": "<command name>",
  "input": { "patient": "p-17", "ward": "B" }
}
```

`input` may be `{}` but not a list, a string or `null`, nor have a
`__proto__` key, and its JSON may be at most 64 KiB (65 536 bytes); any
other `input` gets the validation error below. A request body over
100 kB is refused with HTTP status 413 before that check, by the JSON
parser of the HTTP server.

The response tells how the command ended, with its result:

```http
{
  "status": "failed",
  "result": {
    "exitCode": 3,
    "stdout": "",
    "stderr": "no free bed",
    "resources": { "cpuSeconds": 0.002, "peakRssBytes": 1572864, "processes": 1 }
  }
}
```

| Status            | HTTP Status | Meaning                                                                   |
| :---------------- | :---------- | :------------------------------------------------------------------------ |
| `success`         | 200         | the script exited with 0                                                  |
| `failed`          | 200         | a permitted script exited with another code, was killed, or did not start |
| `stopped`         | 200         | a [stop request](#post-request-to-stop) stopped the script                |
| `invalid command` | 400         | the command is not permitted, or the request key is of another command    |
| `command running` | 409         | the request has `input` and the command is already running                |

`result` comes with `success`, `failed` and `stopped`, and holds the
logs of the script whatever its outcome. `exitCode` is `null` for a
stopped script. On Linux it is also `null` for a script that could not
start or was killed by a signal. On Windows, a missing script is
reported with the exit code of `powershell.exe`, and a script killed
from outside with 1. `resources` holds what the script used, as
described in [Resources](#resources).

Version 0.7.0 added `input`, `result` and the `failed` status; before
it, a script that failed was answered `invalid command` with HTTP
status 400. Versions before 0.6.0 could not stop a command and had no
`stopped` response.

#### GET Request to /

Shows the status of the command last executed, with its logs and exit
code:

```http
{
  "name": "<command-name>",
  "status": "valid",
  "logs": {
    "stdout": "<output log of command>",
    "stderr": "<error log of command>"
  },
  "exitCode": 0,
  "resources": { "cpuSeconds": 0.469, "peakRssBytes": 115646464, "processes": 2 }
}
```

The status is `valid` for a script that succeeded, `failed` for one
that failed, `stopped` for one that a stop request stopped,
`interrupted` for one that was running when the runner stopped (see
[Command History](#command-history)), and `invalid` for a command that
is not permitted, whose logs are empty and whose `exitCode` is `null`.
Before the first command, the name is `none` and the status `invalid`.
While the latest command runs, its status is `invalid` too, with empty
logs and `exitCode` `null`, until it finishes;
[GET /state](#get-request-to-state) shows it as `running`.
The [resources](#resources) are `null` before the first command and
while the latest one runs.

If an incorrectly formatted JSON is sent via POST request,
a validation error is returned.

```http
{
  "message": "Validation Failed",
  "error": "Bad Request",
  "statusCode": 400
}
```

#### GET Request to /history

Returns the commands received, oldest first, both valid and invalid
ones; a repeated request is not recorded again. Each record has the
status, exit code and times of the command, the principal that sent
it (see [Access Control](#access-control)), or `null` without access
control and for a state's script, and the [resources](#resources) its
script used:

```http
[
  {
    "id": 1,
    "name": "create",
    "status": "valid",
    "exitCode": 0,
    "receivedAt": "2026-10-26T14:55:51.000Z",
    "finishedAt": "2026-10-26T14:55:52.000Z",
    "by": null,
    "resources": { "cpuSeconds": 0.469, "peakRssBytes": 115646464, "processes": 2 }
  },
  {
    "id": 2,
    "name": "execute",
    "status": "running",
    "exitCode": null,
    "receivedAt": "2026-10-26T14:55:59.000Z",
    "finishedAt": null,
    "by": "alice",
    "resources": { "cpuSeconds": null, "peakRssBytes": null, "processes": null }
  }
]
```

The status is `running` until the command finishes, then as
[GET /](#get-request-to-), and the logs stay on `GET /`. Two optional
query parameters select the records:

- `since`, an ISO 8601 time with `Z` or an offset: the records received
  at that second or later, as times are stored to the second. In a URL,
  write the `+` of an offset as `%2B`, as in
  `since=2026-10-26T16:56:00%2B02:00`; a plain `+` arrives as a space,
  and the request is refused with `400`.
- `limit`, from 1 to 1000, by default 100: the newest records of the
  selection, still oldest first.

```bash
curl 'http://localhost:5000/history?since=2026-10-26T14:56:00Z&limit=2'
```

Any other value of either gets the validation error.

#### GET Request to /dt

Describes the digital twin that the runner serves, from its
[configuration](#digital-twin):

```http
{
  "id": "hospital-1",
  "attributes": { "city": "Aarhus", "beds": 120 },
  "commands": ["create", "execute"],
  "stateMachine": true,
  "manager": { "commands": ["execute"] },
  "peers": ["hospital-2"],
  "publicKey": null
}
```

`attributes` is `{}` when _runner.yaml_ has none, `commands` lists the
permitted commands, `stateMachine` tells whether a state machine
is loaded, `manager` lists the
[manager commands](#manager-commands), `peers` the ids of the
enabled [peers](#peers) in the order of _runner.yaml_, `[]` without
any, and `publicKey` the public key of the
[signing key](#signed-output), `null` without one.

#### GET Request to /state

Returns the state of the digital twin in one document, with HTTP
status 200 whether or not a state machine is loaded:

```http
{
  "id": "hospital-1",
  "time": "2026-10-25T10:00:00.000Z",
  "machine": {
    "state": "execute",
    "status": "running",
    "entry": 3,
    "events": ["restart"]
  },
  "parameters": {},
  "command": {
    "name": "execute",
    "status": "running",
    "receivedAt": "2026-10-25T09:59:58.000Z",
    "finishedAt": null
  }
}
```

- `id` is the [identity](#digital-twin) of the digital twin, and
  `time` the time of the document.
- `machine` is the body of [GET /fsm](#state-machine-requests), or
  `null` without a state machine.
- `parameters` holds the value of each [parameter](#parameters), and
  is `{}` without a state machine.
- `command` is the latest command, or `null` before the first one. Its
  `status` is `running` until it finishes, and then `valid`, `failed`,
  `invalid`, `stopped` or `interrupted` as in
  [GET /](#get-request-to-), with `finishedAt` set.
  The logs stay on `GET /`. The latest command may be one of `POST /`
  while the script of the state machine runs; `machine.status` tells
  the status of that script.

The times are in ISO 8601 UTC.

```bash
curl http://localhost:5000/state
```

#### POST Request to /stop

Stops the running command of the given name:

```http
{
  "name": "<command name>"
}
```

Without a `name`, or without a request body, it stops every running
command. The runner stops each one as described in
[stopping scripts](#stopping-scripts), and answers with HTTP status 200
once they have exited, which can take the grace period and more:

```http
{
  "stopped": ["<command name>"]
}
```

The list is empty when nothing was running. The response does not wait
for the state machine to follow `$stopped`, so `GET /fsm` straight
after it may still show the old state for a moment. A request key is
not needed: a repeated stop request finds nothing running.

```bash
curl -X POST http://localhost:5000/stop
curl -X POST http://localhost:5000/stop \
  -H 'Content-Type: application/json' -d '{"name": "execute"}'
```

#### Repeated Requests

The runner does not run a command again for a repeated request:

- A request may carry an `Idempotency-Key` HTTP header, or an
  `idempotency-key` user property over MQTT 5, with a value of up to
  255 characters unique to that request. A later request with the same
  key gets the response of the first one, and the command does not
  run again, whatever the `input` of the repeat. A request whose key
  belongs to another command is refused as an invalid command.
- A request for a command that is still running gets the result of
  that run, and does not start the command a second time. A request
  with `input` is refused instead with `command running` and HTTP
  status 409, as the run in progress did not get that input; it is not
  added to the history, and its key is not kept.

A repeated request is not added to the history. The runner keeps the
history, the logs and the request keys in its
[database](#command-history) without a time limit. A command that was
running when the runner stopped is `interrupted` after the restart, and
a repeat of its request gets `failed` with `exitCode` `null`. A repeat
of a request whose command a stop request stopped gets `stopped`, as
does a request that joined that run.

```bash
curl -X POST http://localhost:5000 \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 7d1e4a36-0b8a-4c51-9c0e-2b8f1e6f2a10' \
  -d '{"name": "create"}'
```

#### State Machine Requests

Three more routes drive the [state machine](#state-machine).

| REST API Route                | HTTP Method | Request Body          | Comment                          |
| :---------------------------- | :---------- | :-------------------- | :------------------------------- |
| localhost:port/fsm/transition | POST        | `{"state": "create"}` | Moves an idle machine to a state |
| localhost:port/fsm/event      | POST        | `{"event": "stop"}`   | Sends an event to the machine    |
| localhost:port/fsm            | GET         |                       | Returns the state of the machine |

The machine is idle before its first transition and whenever the
script of its current state has finished. An event moves the machine
along the transition of its current state for that event, even while
the script of that state runs. The runner answers a transition or an
event as soon as the script of the new state has started:

```http
{
  "status": "accepted",
  "state": "terminate"
}
```

The `status` tells the outcome, and `state` the state of the machine
after the request, or `null` before the first transition.

| Status                | HTTP Status | Meaning                                                 |
| :-------------------- | :---------- | :------------------------------------------------------ |
| `accepted`            | 202         | the machine entered the state and started its script    |
| `invalid state`       | 400         | the state is not in the state machine file              |
| `invalid event`       | 400         | the event is not in `events`                            |
| `invalid request key` | 400         | the request key belongs to another request              |
| `busy`                | 409         | a transition request while the script of the state runs |
| `no transition`       | 409         | the current state has no transition for the event       |
| `script running`      | 409         | the script of the next state is still running           |
| `no state machine`    | 404         | _runner.yaml_ has no `stateMachine`                     |
| `stopping`            | 503         | the runner is shutting down                             |

A request body without a `state` or `event` gets the validation error
of `POST /`, before any other check. A transition or event request may
carry an `Idempotency-Key`. The runner gives a repeat of an accepted
request the reply to the first one, for the latest 256 keys; a refused
request changed nothing, so its repeat is checked again. These keys are
kept in memory, apart from the keys of `POST /`. An older key is
forgotten, and a repeat of it counts as a new request.

`GET /fsm` returns the state, the status of its script (`none`,
`running`, `valid`, `invalid`, `stopped` or `interrupted` after a
[restart](#restarts)), the number of entries
into states so far, and the events of the digital twin:

```http
{
  "state": "execute",
  "status": "running",
  "entry": 3,
  "events": ["reset", "stop"]
}
```

`entry` is `0` before the first transition. It tells two entries into
the same state apart, such as a restart of its script.

The scripts that the machine runs appear in the _history_ and in
`GET /` like any other command.

```bash
curl -X POST http://localhost:5000/fsm/transition \
  -H 'Content-Type: application/json' -d '{"state": "create"}'
curl -X POST http://localhost:5000/fsm/event \
  -H 'Content-Type: application/json' -d '{"event": "stop"}'
```

#### Parameters Requests

Two routes read and set the [parameters](#parameters).

| REST API Route            | HTTP Method | Request Body         | Comment                                    |
| :------------------------ | :---------- | :------------------- | :----------------------------------------- |
| localhost:port/parameters | GET         |                      | Returns the parameters and their values    |
| localhost:port/parameters | PUT         | `{"scope": "multi"}` | Sets the values of controllable parameters |

`GET /parameters` returns the value and the declaration of each
parameter, without its `event`:

```http
{
  "scope": {
    "value": "multi",
    "type": "enum",
    "values": ["single", "multi"],
    "default": "single",
    "controllable": true
  },
  "capacity": {
    "value": 20,
    "type": "number",
    "default": 20,
    "controllable": false
  }
}
```

Without a state machine, both routes answer `404` with the body of
`GET /fsm`, `{"status": "no state machine", "state": null}`.

The body of `PUT /parameters` maps parameter names to new values,
which are strings, numbers or booleans. The runner applies the whole
body or none of it:

1. It checks every entry. An unknown name, a parameter that is not
   controllable or a value of the wrong type is refused with `400`,
   and `message` lists every problem:

   ```http
   {
     "message": [
       "parameter capacity is not controllable",
       "parameter size is not declared"
     ],
     "error": "Bad Request",
     "statusCode": 400
   }
   ```

1. It stores the new values, all of them or, if the database fails,
   none, so that a script that starts afterwards sees them.
1. It raises the `event` of each changed parameter, in the order of the
   declarations, each in the state that the one before left. An event
   that two changed parameters declare is raised once.

The reply is then `200` with the body of `GET /parameters`, whatever
the events did; `GET /state` tells where the machine went, and shows
the new values under `parameters`. An event that
the machine refuses is logged. A value equal to the current one changes
nothing and raises no event, so a repeated request and `{}` change
nothing, and the route takes no `Idempotency-Key`. A body that is not
an object of such values gets the validation error of `POST /`.

```bash
curl http://localhost:5000/parameters
curl -X PUT http://localhost:5000/parameters   -H 'Content-Type: application/json' -d '{"scope": "multi"}'
```

#### Peers Requests

Two routes read the [peers](#peers) and enable or disable them.

| REST API Route       | HTTP Method | Request Body            | Comment                                |
| :------------------- | :---------- | :---------------------- | :------------------------------------- |
| localhost:port/peers | GET         |                         | Returns the peers and what they told   |
| localhost:port/peers | PUT         | `{"hospital-2": false}` | Enables and disables peers of the list |

`GET /peers` maps each peer's id to its entry, and is `{}` without
peers; here with the descriptor and the state document shortened:

```http
{
  "hospital-2": {
    "topic": "dtaas/hospital-2",
    "url": "http://localhost:5200",
    "attributes": { "distance": 12.4 },
    "enabled": true,
    "online": true,
    "descriptor": { "id": "hospital-2", "peers": ["hospital-1"] },
    "state": { "id": "hospital-2", "machine": { "state": "full" } }
  }
}
```

`descriptor` and `state` are those of the peer's last
[presence](#presence) and state notifications; an offline notice keeps
the descriptor. `online`, `descriptor` and `state` are `null` until a
notification tells them, and stay `null` without MQTT, for a disabled
peer and for one without `topic`. An absent `topic` or `url` is `null`;
`publicKey` is not shown.

The body of `PUT /peers` maps peer ids to booleans. The runner checks
the whole body first: an unknown id or a value that is not a boolean
is refused with `400`, and `message` lists every problem, as for
[PUT /parameters](#parameters-requests). Otherwise it stores the
changes, all of them or none, and replies `200` with the body of
`GET /peers`. A body that is not an object gets the validation error
of `POST /`. A value equal to the current one changes nothing, so `{}`
changes nothing.

A stored change overrides the `enabled` of _runner.yaml_ at the next
start, with a [database file](#command-history). Disabling a peer
unsubscribes from it and forgets what it told; enabling it subscribes
again, and its retained notifications fill the entry shortly after the
reply. No notification is sent: the [presence](#presence) notice keeps
the peers of the last connection, while `GET /dt` is current.

```bash
curl http://localhost:5000/peers
curl -X PUT http://localhost:5000/peers   -H 'Content-Type: application/json' -d '{"hospital-2": false}'
```

#### Escalation Requests

`POST /escalate` sends an [escalation](#escalation) to the Manager,
for example from a script that finds that the digital twin can not
cope:

```json
{ "reason": "capacity", "proposal": { "scope": "multi" } }
```

- `reason` is required: a non-empty string of up to 1 KiB.
- `proposal` is optional: a JSON object of up to 4 KiB, by convention
  the parameter values that the digital twin would like. The runner
  passes it on as it was received and does not read it.
- Each size is that of the value as JSON text, in bytes of UTF-8,
  quotes included.

The runner answers `202` with `{"status": "accepted"}`, with or without
a state machine, so that a digital twin without one can escalate too.
Any other body gets the validation error of `POST /`. Once the runner
has begun to stop, it still answers `202` but sends nothing.

A request may carry an `Idempotency-Key`, as in
[repeated requests](#repeated-requests). The keys of escalations are
apart from those of the other routes, and every escalation counts as
the same request, so a repeated key gets the first reply and escalates
nothing, even with another body. The runner keeps the last 256 keys in
memory.

```bash
curl -X POST http://localhost:5000/escalate   -H 'Content-Type: application/json'   -H 'Idempotency-Key: 3f2b9c4e'   -d '{"reason": "capacity", "proposal": {"scope": "multi"}}'
```

#### Health

`GET /health` tells whether the runner answers and whether its
connections are up. It is a liveness check only: it does not tell
whether the digital twin does its job.

```http
{
  "status": "ok",
  "uptime": 3724,
  "mqtt": "connected",
  "database": "file",
  "scripts": null
}
```

- `uptime` is the number of whole seconds since the runner started.
- `mqtt` is `connected`, `disconnected` while the runner is not
  connected to its broker, including while it reconnects, or `disabled`
  without an `mqtt` section in the configuration.
- `database` is `file` with a [database file](#command-history), else
  `memory`.
- `scripts` is `{ "user": "dt-script" }`, with the name of the account
  that the [scripts run as](#script-user), also when _runner.yaml_
  gives a uid; `null` without it. `GET /health` is open, so any caller
  learns that name.
- `status` is `degraded` while `mqtt` is `disconnected`, else `ok`.

The runner answers `200` in both cases. It connects to the broker after
it starts, so the first replies may say `degraded`.

```bash
curl http://localhost:5000/health
```

#### Metrics

`GET /metrics` counts what the runner did since it started: the
commands by status, the [resources](#resources) of each command, and
with a state machine the entries into each
state, the seconds spent there, the scripts that finished, and the
transition and event requests; and the escalations by trigger.

```http
{
  "since": "2026-10-26T14:55:41.402Z",
  "uptime": 42,
  "commands": {
    "valid": 6,
    "failed": 2,
    "stopped": 1,
    "invalid": 0,
    "interrupted": 0,
    "running": 1
  },
  "resources": {
    "admit": { "cpuSeconds": 2.031, "peakRssBytes": 117440512, "processes": 2 },
    "open": { "cpuSeconds": 0.812, "peakRssBytes": 115646464, "processes": 2 }
  },
  "machine": {
    "entries": { "open": 3, "full": 1 },
    "seconds": { "open": 34.4, "full": 4.6 },
    "completions": { "$success": 0, "$failure": 1, "$stopped": 0 },
    "transitions": { "requested": 1, "accepted": 1 },
    "events": { "requested": 5, "accepted": 3, "noTransition": 2 }
  },
  "escalations": { "request": 1, "failure": 1, "no-transition": 1 }
}
```

`resources` sums the CPU seconds of each command's runs and keeps the
largest peak and the largest tree of one run; a command without a
measured run is left out.
`machine` is `null` without a state machine. `completions` counts the
scripts that finished in the entry they started in: a transition with
`stop: true` enters its next state before the stopped script ends, so
it counts nothing, and only a [POST /stop](#post-request-to-stop),
which keeps the entry, counts as `$stopped`. The counters live in
memory, so a restart, which `since` shows, sets them back to zero; they
are not part of the state document and send no notification.
[API.md](api/API.md#get-metrics) describes each field.

```bash
curl http://localhost:5000/metrics
```

### MQTT API

With MQTT enabled, the runner subscribes to one request topic
for each REST API route. A request and its response carry the same
JSON as the matching HTTP request and response; with a
[signing key](#signed-output), the response is a JWS of that JSON.

| Request Topic            | Matching HTTP Request | Request Payload                            |
| :----------------------- | :-------------------- | :----------------------------------------- |
| `<topic>/execute`        | POST /                | `{"name": "<command name>", "input": {}}`  |
| `<topic>/status`         | GET /                 | ignored                                    |
| `<topic>/history`        | GET /history          | `{"since": "<time>", "limit": 10}` or none |
| `<topic>/transition`     | POST /fsm/transition  | `{"state": "<state>"}`                     |
| `<topic>/event`          | POST /fsm/event       | `{"event": "<event>"}`                     |
| `<topic>/fsm`            | GET /fsm              | ignored                                    |
| `<topic>/dt`             | GET /dt               | ignored                                    |
| `<topic>/state`          | GET /state            | ignored                                    |
| `<topic>/health`         | GET /health           | ignored                                    |
| `<topic>/stop`           | POST /stop            | `{"name": "<command name>"}`               |
| `<topic>/parameters`     | GET /parameters       | ignored                                    |
| `<topic>/set-parameters` | PUT /parameters       | `{"<name>": <value>}`                      |
| `<topic>/escalate`       | POST /escalate        | `{"reason": "<reason>"}`                   |
| `<topic>/metrics`        | GET /metrics          | ignored                                    |
| `<topic>/peers`          | GET /peers            | ignored                                    |
| `<topic>/set-peers`      | PUT /peers            | `{"<peer id>": <boolean>}`                 |

The runner also publishes [notifications](#notifications) under
`<topic>/notify/<kind>`, among them its [presence](#presence) on
`<topic>/notify/presence`, which is also the topic of its MQTT will.
It subscribes as well to the presence and state notifications of its
[peers](#peers).

The runner answers a `health` request only while it is connected, so
the reply always says `"mqtt": "connected"`; that a reply arrives at
all tells that the runner is alive.

The runner publishes each response with QoS 1:

- to the response topic of an MQTT 5 request, along with its
  correlation data, when the request has a response topic;
- otherwise to the request topic followed by `/response`,
  for example `<topic>/execute/response`.

The runner uses the default response topic instead when the
requested one is empty, holds a wildcard, starts with `$`,
or is one of its request topics.

MQTT has no status codes, so the response payload alone tells
the outcome. An `execute` payload has no 100 kB limit, but its `input`
has the 64 KiB limit of `POST /`. A request payload that is not a JSON
object with a `name` gets the validation error of the HTTP API, and an
unexpected failure gets the body of an HTTP 500 response. A stop
request may have an empty payload, or `{}`, to stop every running
command.

The runner subscribes with QoS 1, so the broker may deliver a request
twice. An MQTT 5 request with an `idempotency-key` user property runs
once, as described in [repeated requests](#repeated-requests); MQTT
3.1.1 has no user properties. Requests published while the runner is
disconnected are lost, and the runner ignores retained requests,
so that a command does not run again each time the runner connects.

Every client subscribed to `<topic>/<route>/response` receives every
response on it. A client that must tell its own responses apart
should connect with MQTT 5 and give a response topic of its own.

The commands below use the
[Mosquitto clients](https://mosquitto.org/download/)
to run the _create_ command and wait for its response.

```bash
mosquitto_sub -h localhost -t 'dtaas/user1/runner/+/response' &
mosquitto_pub -h localhost -t 'dtaas/user1/runner/execute' \
  -m '{"name": "create"}'
# MQTT 5, with a request key
mosquitto_pub -h localhost -V mqttv5 -t 'dtaas/user1/runner/execute' \
  -D publish user-property idempotency-key 7d1e4a36 \
  -m '{"name": "create"}'
```

With [principals](#access-control) in the `auth` section, the payload
of each request but `health` is a signed token that holds the request topic and the
JSON above as its `body`; a plain payload gets the `401` body of the
HTTP API, and a refused role the `403` body, on the response topic.
[API.md](api/API.md#mqtt-access-control) describes the envelope.

Without it, anyone who can publish to the request topics can run the
permitted commands. Either way, use the access control of the broker
as the outer wall: `auth` decides who may act, the broker who may
publish on the request topics and read the responses and
notifications at all, and which topics the runner may publish to. Use
`mqtts://` or `wss://` with a username and password when the broker is
not on the same computer.

### Notifications

The runner sends its [state document](#get-request-to-state) whenever
the document changes: when the state machine enters a state, when the
script of a state finishes, when a command starts or finishes, when a
parameter changes, and once at startup. A document that differs from the
last one sent only in its `time` is not sent again. Each notification is
one JSON object:

```json
{
  "kind": "state",
  "id": "hospital-1",
  "time": "2026-10-25T10:00:00.000Z",
  "data": { "id": "hospital-1", "time": "2026-10-25T10:00:00.000Z" }
}
```

`data` is the whole state document, shortened here; `id` and `time` are
those of the document. Documents built within the same millisecond can
share `time`.

With a [signing key](#signed-output), each notification is a compact
JWS whose payload is this JSON, over MQTT and the webhook alike. A
retained notification stays verifiable, as a JWS of the runner has no
expiry. A plain notification retained from an earlier run without a
key is replaced as soon as the runner connects, so a receiver that
requires signatures drops it and waits.

`kind` is `state` for a state document, `presence` for the notices of
[presence](#presence), or `escalation` for an
[escalation](#escalation):

```json
{
  "kind": "escalation",
  "id": "hospital-1",
  "time": "2026-10-25T10:00:00.000Z",
  "data": {
    "trigger": "request",
    "state": "execute",
    "entry": 3,
    "event": null,
    "reason": "capacity",
    "proposal": { "scope": "multi" }
  }
}
```

- `trigger` is `failure` (`onFailure`), `no-transition`
  (`onNoTransition`) or `request` (`POST /escalate`).
- `state` and `entry` are those of the machine when the escalation
  happened; `null` and `0` without a machine or before its first
  transition.
- `event` names the event of a `no-transition`, from a client or a
  [peer subscription](#peer-events), else `null`.
- `reason` is that of the request, or the runner's own text, such as
  `script of state execute failed` or
  `no transition for restart in state execute`. `proposal` is that of
  the request, else `null`.

With MQTT enabled, the runner publishes each notification with QoS 1 on
`<topic>/notify/<kind>`, for example `<topic>/notify/state`. A state
notification is retained, so that a Manager that subscribes later
receives the current state at once; an escalation is not, so that a
Manager that subscribes later does not act on an old one. The
notification topics are two levels under the base topic, so
`<topic>/+/response` does not match them; subscribe to
`<topic>/notify/+` instead. While the broker is unreachable, the runner
queues the notifications in memory and publishes them in order when it
connects again; a long outage holds every queued document in memory.

```bash
mosquitto_sub -h localhost -v -t 'dtaas/user1/runner/notify/+'
```

With a [webhook](#webhook), the runner posts each notification as
`application/json`, or `application/jose` with a signing key, with a
5 s timeout. It retries after 1 s, 2 s and
4 s on a network error, a timeout or a `5xx` response, and not on any
other response. Posts are independent, so they may arrive out of
order; a receiver that needs a strict order uses MQTT, which delivers
the notifications in order. A failure is logged
once, with the host of the webhook only, until a post succeeds again.
At shutdown, the runner abandons the posts still in progress or waiting
for a retry, and posts only its offline notice.

Without MQTT and a webhook, [GET /state](#get-request-to-state) is the
only way to observe the state.

#### Presence

The runner announces that it joins and leaves, with notifications of
kind `presence`. The online notice carries the
[descriptor](#get-request-to-dt) of the DT:

```json
{
  "kind": "presence",
  "id": "hospital-1",
  "time": "2026-10-25T10:00:00.000Z",
  "data": { "online": true, "descriptor": { "id": "hospital-1" } }
}
```

The offline notice has `"data": { "online": false }` and the time the
runner left.

With MQTT enabled, the runner publishes the online notice on
`<topic>/notify/presence`, retained, each time it connects to the
broker, the first time and after each reconnect. It connects with a
will on the same topic: the offline notice, retained, with
`"time": null`, as the will is fixed when the runner connects. The
broker publishes the will only when the runner disappears without
leaving: a crash, a kill or a lost connection. The will is the one
notification without a time.

At shutdown the runner leaves the broker in steps of at most 2 s each:

1. It publishes the offline notice, retained, with the current time.
1. Once the broker acknowledged the notice, or the publish failed, the
   runner disconnects gracefully, so that the broker drops the will.
1. Otherwise, or if the disconnect does not finish, it closes the
   connection and logs a warning that the broker did not confirm the
   leave. The broker may then publish the will, which replaces the
   retained notice with one without a time; it still says offline.

Leaving the broker thus adds at most 4 s to the shutdown.

With a [webhook](#webhook), the runner posts the online notice once at
startup, not on a reconnect, and the offline notice once at shutdown.
Without MQTT and a webhook, nothing is announced.

## License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under
[the INTO-CPS License](https://odin.cps.digit.au.dk/into-cps/LICENSE.md).
