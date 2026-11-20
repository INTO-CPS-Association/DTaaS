# Runner Configuration

This guide is for operators who set up a runner. It describes every
key of _runner.yaml_, the configuration file of the runner, and ends
with four complete configurations for common setups. The state machine
of a digital twin (DT) has a file of its own, described in
[STATE-MACHINE.md](STATE-MACHINE.md).

## The Configuration File

The runner reads _runner.yaml_ from the directory in which it is
started, or the file that the `-c` option names:

```bash
runner                      # runner.yaml of the working directory
runner -c /etc/dt/runner.yaml
runner --config ../hospital/runner.yaml
```

The runner checks the whole file at startup. It does not start when a
required key is missing, a value is invalid, or the file has a key that
the runner does not know; the error message names every problem. The
runner reads the file once, so a change takes a restart.

Paths in the file are relative to the directory of _runner.yaml_:

| Key                    | Relative path              | Absolute path            |
| :--------------------- | :------------------------- | :----------------------- |
| `location`             | from the file's directory  | joined to the directory  |
| `database`             | from the file's directory  | joined to the directory  |
| `stateMachine`         | from the file's directory  | used as it is            |
| `auth.key`             | from the file's directory  | used as it is            |
| `scripts.runDirectory` | from the file's directory  | used as it is            |

`location` and `database` are always taken below the directory of
_runner.yaml_, even when they start with `/`. Keep the scripts and the
database beneath that directory.

## Keys at a Glance

| Key            | Required | Default   | Purpose                                                      |
| :------------- | :------- | :-------- | :----------------------------------------------------------- |
| `id`           | yes      |           | names the digital twin that the runner serves                |
| `attributes`   | no       | `{}`      | describes the digital twin to a Manager                      |
| `port`         | yes      |           | the HTTP port of the API                                     |
| `location`     | yes      |           | the directory of the scripts                                 |
| `commands`     | yes      |           | the scripts that may run                                     |
| `stateMachine` | no       | off       | the state machine file of the digital twin                   |
| `database`     | no       | in memory | the SQLite file of the history, state and parameters         |
| `stopGrace`    | no       | `5000`    | milliseconds from `SIGTERM` to `SIGKILL` when a script stops |
| `mqtt`         | no       | off       | serves the API over MQTT as well                             |
| `notify`       | no       | off       | posts the notifications to a webhook                         |
| `auth`         | no       | open      | verifies the callers, signs the output, or both              |
| `peers`        | no       | `[]`      | the digital twins that this one interacts with               |
| `scripts`      | no       | off       | runs the scripts as a second account, on Linux               |

Warning: without `principals` in an `auth` section, anyone who can
reach the runner's port or its MQTT request topics can run its commands
and drive its state machine. List the callers under `auth.principals`
([Access Control](#access-control)) on any network that others share.

## Digital Twin

```yaml
id: 'hospital-1'
attributes: # optional; strings, numbers or booleans
  city: 'Aarhus'
  beds: 120
```

- `id` names the digital twin, so that a Manager can tell runners
  apart. It has up to 64 letters, digits, `_`, `.` or `-`, and starts
  with a letter or digit. Give each runner its own `id`.
- `attributes` is a flat map of facts about the digital twin: a value
  is a string, a number or a boolean, never a list or a map. The names
  follow the pattern of `id`. The runner does not read them; it hands
  them to a Manager.

`GET /dt` returns the `id`, the `attributes` and the enabled
[peers](#peers).

## Port, Scripts and Commands

```yaml
port: 5000
location: 'scripts' # directory of scripts, relative to this file
commands: # the scripts that may run
  - create
  - execute
  - terminate
```

- `port` is the TCP port of the HTTP API, from 0 to 65535. Each runner
  on a computer needs a port of its own. The scripts reach the runner
  on it through `RUNNER_URL`.
- `location` is the directory of the scripts.
- `commands` lists the scripts that may run. A request for any other
  name is refused as an invalid command. Every state of the state
  machine must be one of them.

On Linux a command is an executable file of that name in `location`,
such as _create_; give it execute permission. On Windows it is a
PowerShell script with the `.ps1` extension, such as _create.ps1_. A
directory may hold both, so that the same commands work on Linux and
Windows.

## State Machine File

```yaml
stateMachine: 'scripts/state-machine.yaml'
```

The file declares the events, states, parameters, environment,
escalation conditions, peer subscriptions and Manager commands of the
digital twin. Without the key the state machine is off, and its routes
answer `404`. The runner does not start when the file is missing or
invalid. [STATE-MACHINE.md](STATE-MACHINE.md) describes the file.

## Command History

```yaml
database: 'runner.db'
```

The runner keeps the commands it receives, with their results, in an
SQLite database. The database is in memory unless `database` names a
file. With a file, the following survive a restart of the runner:

- the command history and the status of the last command;
- the request keys of repeated requests;
- the state of the state machine and its entry counter;
- the parameter values;
- the switches that `PUT /peers` set.

No script survives a restart: a command that was running when the
runner stopped is `interrupted` after it. The runner creates the
directory of the database file if needed. Give each runner a database
file of its own.

## Stop Grace Period

```yaml
stopGrace: 5000
```

A stop sends `SIGTERM` to a script and, if the script still runs after
the grace period, `SIGKILL`. `stopGrace` is the period in milliseconds,
a positive integer; it is five seconds without the key. On Windows the
runner ends `powershell.exe` at once, without a grace period.

## MQTT

The runner serves the same API over MQTT when the configuration has an
`mqtt` section. HTTP remains available on `port`.

```yaml
mqtt:
  url: 'mqtt://localhost:1883' # mqtt://, mqtts://, ws:// or wss://
  topic: 'dtaas/user1/runner' # base topic of this runner
  username: 'runner' # optional
  password: 'secret' # optional
  protocolVersion: 5 # optional; 5 (default) or 4 for MQTT 3.1.1
```

- `url` is the broker, with the scheme `mqtt`, `mqtts`, `ws` or `wss`.
  Use `mqtts://` or `wss://` with a username and password when the
  broker is not on the same computer.
- `topic` is the base of the runner's request topics, such as
  `dtaas/user1/runner/execute`, and of its notifications, such as
  `dtaas/user1/runner/notify/state`. It must be unique to each runner
  that shares a broker, must not contain the `+` or `#` wildcards, and
  must not start with `$` or end with `/`.
- `username` and `password` authenticate the runner to the broker.
- `protocolVersion` is `5` unless given. Use `4` for a broker that
  speaks only MQTT 3.1.1; request keys then need MQTT 5 and are not
  available.

The runner keeps reconnecting while the broker is unavailable or
refuses the connection, and serves HTTP in the meantime. It registers a
retained will on `<topic>/notify/presence` that tells its peers and
Manager when it disappears. Use the access control of the broker as the
outer wall: the broker decides who may publish on the request topics
and read the responses and notifications at all.

## Webhook

The runner posts its notifications to a webhook when the configuration
has a `notify` section:

```yaml
notify:
  url: 'https://manager.example.org/dt-events' # http:// or https://
  token: 'secret' # optional; sent as Authorization: Bearer <token>
```

The runner posts a notification when its state changes, when it
escalates, and its presence at startup. At shutdown it posts its
offline notice once, with a 2 s timeout and no retry, so that a slow
webhook does not hold the shutdown. With a [signing key](#signed-output)
each body is a signed JWS of type `application/jose`; the token still
authenticates the runner to the webhook.

## Access Control

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

- `name` follows the pattern of `id`, is unique, and is not `script`,
  which names the runner's own scripts.
- `role` is `client` or `manager`. A `client` may call every route. A
  `manager` may read, set parameters, enable and disable
  [peers](#peers) and run the Manager commands of the state machine
  file. The runner's scripts call it in the role `script` with the
  token in `RUNNER_TOKEN`: they may read, raise events and escalate.
- `publicKey` is an Ed25519 public key as the base64url of its 32 raw
  bytes, the `x` of its JWK. The caller keeps the private key; the file
  holds no secret, and deleting a principal revokes it at the next
  start. [tools/keygen.mjs](tools/keygen.mjs), in the runner's source
  directory, writes a key pair: `node tools/keygen.mjs alice keys`
  gives `keys/alice.key` and prints the public key.

Each request carries `Authorization: Bearer <token>`, a token that the
caller signs for that one request and at most one minute; over MQTT the
request payload is the token. [API.md](api/API.md#access-control) gives
the token format and a signing example, and
[tools/sign.mjs](tools/sign.mjs) signs a request with a key of
_keygen.mjs_. `GET /health` and the MQTT
`health` topic stay open, for liveness probes. A request without a
valid token gets `401`, and a role that may not call the route `403`.
The runner logs each accepted request with its principal at `debug`
level, and stores the principal of each command it runs.

Without `auth.principals` every route is open, and the runner ignores
any `Authorization` header.

## Signed Output

With `key` in the `auth` section, the runner signs what it sends on its
own or in reply, so that a receiver that holds its public key can check
that a message came from this digital twin and was not changed:

```yaml
auth:
  # an Ed25519 private key, PEM PKCS#8, relative to this file
  key: 'keys/hospital-1.key'
```

- `key` is independent of `principals`: a runner may sign without
  verifying its callers, and the reverse. An `auth` section needs one
  of the two at least. An absolute path, such as one in a mounted
  secret directory, works too.
- [tools/keygen.mjs](tools/keygen.mjs) writes the key:
  `node tools/keygen.mjs hospital-1 keys` gives `keys/hospital-1.key` and
  prints the public key, which it also writes to `keys/hospital-1.pub`.
- The runner does not start when the file cannot be read, is
  encrypted, or holds a key that is not an Ed25519 private key; the
  error names the file, never its content.
- Every MQTT payload of the runner, its responses, notifications and
  will, and every webhook body is then a compact JWS (RFC 7515) whose
  payload is the same JSON as without a key. Its header is
  `{"alg":"Ed25519","kid":"<id>"}`. HTTP replies stay plain JSON.
- `GET /dt` and the online notice give the public key as `publicKey`,
  in the encoding of the principals' keys. Another runner lists it as
  the `publicKey` of this digital twin among its [peers](#peers).

A signature proves origin and integrity, not that a message is new: a
receiver that must not go back in time compares `time` with that of the
last message it took. A new key takes a restart, and a new public key
for every receiver. [API.md](api/API.md#signatures) shows a signed
notification and how to verify it.

## Peers

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
  `mqtt.topic`; it is unique and not the runner's own. `url` is an
  `http://` or `https://` URL.
- `attributes` describe the relationship, such as a distance, with the
  rules of the runner's own [attributes](#digital-twin). The runner
  never reads them.
- `enabled` is `true` unless given. `PUT /peers` overrides it at
  runtime, and a [database file](#command-history) keeps the override.
- `publicKey` is the key with which the peer signs its notifications,
  in the encoding of [access control](#access-control). With it, the
  runner takes only notices that this key signed.

With an [mqtt section](#mqtt), the runner subscribes to the presence
and state notifications of each enabled peer with a `topic`, on its own
broker, and remembers whether the peer is online, its descriptor and
its last state document. A notification counts only if it is an
envelope of its topic's kind and of the peer's `id`; for a peer with a
`publicKey`, only if it is a JWS of the envelope that the key signed,
with the peer's `id` as `kid`. The runner logs and drops any other. A
peer's notification raises an event only through a subscription of the
state machine file. Without MQTT, the peers are listed but never
followed.

`GET /peers` shows the peers and what they told. A Manager can not add
a peer: only the operator, in _runner.yaml_, lists them.

## Script User

On Linux, the runner can run its scripts as a second account, so that
a script reaches neither _runner.yaml_, the signing key, the database
nor the runner's own environment. An optional `scripts` section turns
it on:

```yaml
scripts:
  user: 'dt-script' # the account of the scripts: a name or a uid
  group: 'dt-script' # optional; instead of the account's primary group
  runDirectory: '/var/lib/dt/hospital-1/run' # where the scripts run
```

- `user` is a name or a uid of `/etc/passwd`. A uid needs its entry in
  `/etc/passwd`.
- `group` is a name of `/etc/group` or a gid. It replaces the
  account's primary group.
- `runDirectory` is the working directory of every script and the one
  place where a script may write; its files are shared between runs.
- Each script starts through `/usr/bin/setpriv` as the account, with
  its groups, without any capability and with no-new-privs. `setpriv`
  becomes the script in the same process, so stopping and resource
  measurement work as without the section.
- A script's environment starts from an allow-list instead of the
  runner's environment: `TMPDIR` and `LANG` are inherited, `HOME`,
  `USER` and `LOGNAME` are those of the account, and `PATH` is
  `/usr/local/bin:/bin:/usr/bin`.
- The runner refuses to start when an `env` of the state machine file
  declares a variable that the dynamic loader or the C library reads
  from a file: a name starting with `LD_`, `MALLOC_` or `LC_`, `LANG`,
  `LANGUAGE`, `TMPDIR`, or one of `GCONV_PATH`, `GETCONF_DIR`,
  `GLIBC_TUNABLES`, `HOSTALIASES`, `LOCALDOMAIN`, `LOCPATH`,
  `NIS_PATH`, `NLSPATH`, `RESOLV_HOST_CONF`, `RES_OPTIONS` and
  `TZDIR`. `setpriv` holds the runner's capabilities until it switches,
  and its loader would honour them.

The runner must run as its own unprivileged account, with `CAP_SETUID`,
`CAP_SETGID` and `CAP_KILL` as ambient capabilities. At startup it
refuses to start on any platform other than Linux, as root, without
`/usr/bin/setpriv`, without the three capabilities, for root's or its
own account, and when the account could read or replace _runner.yaml_,
the key, the state machine file, the database or the scripts, or could
not write the run directory. It never changes a mode or an owner: the
error names every offending path. `GET /health` names the account.
[PRIVILEGE-SETUP.md](PRIVILEGE-SETUP.md) shows the accounts, the modes
and the start commands, and [SECURITY-MODEL.md](SECURITY-MODEL.md)
explains what the separation protects.

Without the section, the scripts run as the runner's account, in its
working directory, with its whole environment, on Linux and Windows
alike.

## Examples

### 1. Scripts on a Workstation

One user runs a few scripts on their own computer and calls them with
`curl`:

```yaml
id: 'my-dt'
port: 5000
location: 'scripts'
commands:
  - create
  - execute
  - terminate
```

This is the smallest valid configuration. The scripts live in
_scripts/_ next to _runner.yaml_, and only the three listed may run.
There is no state machine, so a client runs each script with
`POST /` and reads its result from the reply. The history is in memory
and is lost when the runner stops. The API is open to anyone who can
reach port 5000, so keep this setup on a computer that no one else
uses, or bind the port to the local interface with a firewall.

### 2. A Digital Twin With a State Machine

A digital twin runs a pipeline of scripts by itself, keeps its state
across restarts, and gives its long-running scripts one second to stop:

```yaml
id: 'pipeline-1'
attributes:
  owner: 'lab-a'
port: 5300
location: 'scripts'
commands:
  - create
  - execute
  - terminate
stateMachine: 'state-machine.yaml'
database: 'data/pipeline-1.db'
stopGrace: 1000
```

- `stateMachine` loads _state-machine.yaml_ next to _runner.yaml_. Its
  states must be among `commands`. A client starts the machine with
  `POST /fsm/transition` and moves it with events;
  [STATE-MACHINE.md](STATE-MACHINE.md#example-a-pipeline) has the file
  for this pipeline.
- `database` keeps the history, the current state and the parameter
  values in _data/pipeline-1.db_. After a restart the machine is back
  in its state, and a script that was running is `interrupted`.
- `stopGrace: 1000` sends `SIGKILL` one second after `SIGTERM`, for
  scripts that need little time to clean up.

### 3. A Digital Twin in a Network

A hospital's digital twin takes part in a network of digital twins. A
Manager drives it over MQTT and receives its notifications on a
webhook; a neighbouring hospital is its peer:

```yaml
id: 'hospital-1'
attributes:
  name: 'Hospital 1'
  city: 'Aarhus'
  wards: 2
port: 5100
location: 'scripts'
commands: [open, full, closed, admit, discharge]
stateMachine: 'hospital.fsm.yaml'
database: 'run/hospital-1.db'
mqtt:
  url: 'mqtts://broker.example.org:8883'
  topic: 'dtaas/hospital-1'
  username: 'hospital-1'
  password: 'change-me'
notify:
  url: 'https://manager.example.org/dt-events'
  token: 'change-me-too'
auth:
  principals:
    - name: 'manager-1'
      role: 'manager'
      publicKey: 'mCpoaytWvGJ9K0lxNlSNw6sjUG7UezRWtxPvL1pyxKA'
  key: 'keys/hospital-1.key'
peers:
  - id: 'hospital-2'
    topic: 'dtaas/hospital-2'
    url: 'https://hospital-2.example.org:5200'
    attributes:
      distance: 12.4
    publicKey: 'o-YAagcjoyUxT2xcgULS22sCK6N_cJ-op8Jh7yukXMk'
```

- The `attributes` tell the Manager where the hospital is and how many
  wards it has; `GET /dt` returns them.
- The `mqtt` section serves the API on `dtaas/hospital-1/<route>` over
  TLS, and publishes the state, escalation and presence notifications
  under `dtaas/hospital-1/notify/`. The `notify` webhook receives the
  same notifications for a Manager that does not use MQTT.
- `auth.principals` lets only `manager-1` call the runner, with the
  rights of the `manager` role. `auth.key` signs every MQTT payload and
  webhook body, so the Manager and `hospital-2` can check that they
  came from `hospital-1`. Give `hospital-2` the public key that
  _tools/keygen.mjs_ printed.
- The peer `hospital-2` is followed on its MQTT topic, and its
  notices count only when its own key signed them. The state machine
  file can then raise an event, such as `neighbour-full`, when the
  peer reports the state `full`.
- The broker password and webhook token are secrets: keep
  _runner.yaml_ readable by the runner's account only.

### 4. A Hardened Runner on Linux

An operator runs a digital twin whose scripts should not reach the
runner's secrets. The runner runs as the account `dt-runner`, and its
scripts as `dt-script`:

```yaml
id: 'hospital-1'
port: 5000
location: 'scripts'
commands: [open, admit, discharge]
stateMachine: '/etc/dt/hospital-1/hospital.fsm.yaml'
database: 'db/hospital.db'
auth:
  principals:
    - name: 'manager-1'
      role: 'manager'
      publicKey: 'mCpoaytWvGJ9K0lxNlSNw6sjUG7UezRWtxPvL1pyxKA'
  key: '/etc/dt/hospital-1/keys/hospital-1.key'
scripts:
  user: 'dt-script'
  runDirectory: '/var/lib/dt/hospital-1/run'
```

- The `scripts` section starts each script as `dt-script`, without
  capabilities, in _/var/lib/dt/hospital-1/run_, with a minimal
  environment. A script can not read _runner.yaml_, the signing key,
  the database or the runner's environment, nor rewrite the scripts.
- The state machine file and the key have absolute paths, so they can
  sit in a directory that only `dt-runner` reads. `location` and
  `database` are always below the directory of _runner.yaml_.
- The runner checks the layout at startup and refuses to start, naming
  each path, if `dt-script` could read a secret or change a script.
  It must run with the ambient capabilities `CAP_SETUID`, `CAP_SETGID`
  and `CAP_KILL`; [PRIVILEGE-SETUP.md](PRIVILEGE-SETUP.md) gives the
  systemd unit, the Docker command and the file modes.
- `auth` is still needed: the second account protects the runner from
  its scripts, and access control protects it from its callers.
