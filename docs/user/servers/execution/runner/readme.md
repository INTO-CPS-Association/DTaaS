# Runner

A utility service for the safe execution of remote scripts and
commands. The runner manages one digital twin (DT): it runs the
permitted scripts of the DT, keeps their history, and can move the DT
from one script to the next with a state machine. It serves a REST API
and, optionally, an MQTT API, and can take part in a network of digital
twins that a Manager steers.

Several runners can be active at the same time on one computer. The
runner works on Linux and Windows; on Windows it runs the PowerShell
version of each script.

## Documentation

This page gives the basics. The
[runner's source directory](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/servers/execution/runner)
holds the full documentation:

- [CONFIG.md](config.md):
  every configuration key, with four complete examples.
- [STATE-MACHINE.md](state-machine.md):
  writing and running a state machine, with worked examples.
-
  [API.md](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/execution/runner/api/API.md):
  every route, MQTT topic and notification, with examples.
-
  [DOCKER.md](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/execution/runner/DOCKER.md):
  running the runner in a container.
- [SECURITY-MODEL.md](security-model.md):
  what the runner protects from its scripts, and what it expects of the
  system that starts it.
- [PRIVILEGE-SETUP.md](privilege-setup.md):
  running the scripts as a second account on Linux.
-
  [The hospital demo](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/servers/execution/runner/demo/hospital):
  two digital twins of hospitals, steered by a Manager.

## Install

The runner needs Node.js 24 or later.

### NPM Registry

The package is available on
[npmjs](https://www.npmjs.com/package/@into-cps-association/runner).
Install it with:

```bash
sudo npm install -g @into-cps-association/runner
```

### GitHub Registry

The package is also available in the GitHub
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages).
Set the registry and install the package with:

```bash
sudo npm config set @into-cps-association:registry https://npm.pkg.github.com
sudo npm install -g @into-cps-association/runner
```

The _npm install_ command asks for a username and a password. The
username is your GitHub username and the password a GitHub
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
with the _read:packages_ scope.

## Configure

The runner reads its configuration from a YAML file. Copy the sample
below into a file named _runner.yaml_ and change the values for your
setup:

```yaml
id: 'my-dt' # names the digital twin that this runner serves
port: 5000
location: 'scripts' # directory of scripts, relative to this config file
commands: # list of permitted scripts
  - create
  - execute
  - terminate
```

With this configuration the scripts are in a _scripts_ directory next
to _runner.yaml_, and only _create_, _execute_ and _terminate_ may run.

- `id`, `port`, `location` and `commands` are required. `id` has up to
  64 letters, digits, `_`, `.` or `-`, and starts with a letter or
  digit.
- The runner does not start when a required key is missing, a value is
  invalid, or the file has a key that the runner does not know; the
  error message names every problem.
- Paths in the file, such as `location`, are relative to the directory
  of _runner.yaml_.

Optional keys add the rest:

| Key            | Adds                                                                   |
| :------------- | :--------------------------------------------------------------------- |
| `attributes`   | facts about the digital twin, such as its city, for a Manager          |
| `stateMachine` | the [state machine](#state-machine) file of the digital twin           |
| `database`     | an SQLite file that keeps the history and state across restarts        |
| `stopGrace`    | the milliseconds from `SIGTERM` to `SIGKILL` when a script is stopped  |
| `mqtt`         | the same API over an MQTT broker, and notifications on MQTT topics     |
| `notify`       | a webhook that receives the notifications                              |
| `auth`         | callers verified by their Ed25519 keys, in roles, and signed output    |
| `peers`        | the other digital twins that this one follows                          |
| `scripts`      | on Linux, a second account that runs the scripts                       |

[CONFIG.md](config.md)
describes each key and gives four complete configurations.

Warning: without `principals` in an `auth` section, anyone who can
reach the runner's port or its MQTT request topics can run its commands
and drive its state machine. List the callers under `auth.principals`
on any network that others share.

## Create Commands

Each command is a script in the `location` directory, named in
`commands`. A request for any other name is refused as an invalid
command.

- On Linux a command is an executable file of the command's name, such
  as _create_. Give it execute permission.
- On Windows a command is a PowerShell script with the `.ps1`
  extension, such as _create.ps1_. The runner runs it with
  `powershell.exe -NoProfile -ExecutionPolicy Bypass -File`.
- A directory can hold both versions of a script, so that the same
  commands work on Linux and Windows.

A command request may carry an `input` object. The script reads it from
stdin as one line of JSON followed by a newline; nothing is passed on
the command line. Without input, stdin is empty and closed, so a script
that reads stdin never waits. For example, `cat` in a shell script or
`[Console]::In.ReadToEnd()` in a PowerShell script reads the whole
input. Windows PowerShell decodes stdin in the console code page, so a
PowerShell script may garble input that is not ASCII.

The runner does not store the input, as it may hold personal data. It
does store the output of each script, so a script that prints its input
puts it in the command history.

### Script Environment

Each script inherits the environment of the runner, and gets these
variables as well:

| Variable          | Value                                                                   |
| :---------------- | :---------------------------------------------------------------------- |
| `RUNNER_URL`      | `http://127.0.0.1:<port>`, the runner's own HTTP API                    |
| `RUNNER_TOKEN`    | the bearer token of the scripts, with access control; else unset        |
| `DT_ID`           | `id` of _runner.yaml_                                                   |
| `DT_STATE`        | the current state of the state machine, or empty                        |
| `DT_ENTRY`        | the entry number of that state, or `0`                                  |
| `DT_PARAM_<NAME>` | the value of each parameter of the state machine when the script starts |

For a script that the state machine runs, `DT_STATE` and `DT_ENTRY`
name the state it enters and the number of that entry. Without a state
machine a script gets only `RUNNER_URL`, `DT_ID` and, with access
control, `RUNNER_TOKEN`. A script may call the runner's API on
`RUNNER_URL`, for example to raise an event of the state machine. The
state machine file may declare more variables.

## State Machine

A state machine moves a digital twin from one script to the next. A
client starts it with a transition to a state, and from then on events
and the exit of each script decide which script runs next. The
`stateMachine` key of _runner.yaml_ names its file:

```yaml
stateMachine: 'state-machine.yaml' # relative to runner.yaml, or absolute
```

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
      stop: { state: terminate, stop: true } # stops execute first
  terminate:
    transitions:
      reset: create
```

- Each state is a script, and must be one of the `commands`. Entering
  a state runs its script.
- `transitions` gives the next state for each event of a state.
  `stop: true` stops the running script of the state that the machine
  leaves.
- The runner raises `$success`, `$failure` or `$stopped` itself when
  the script of the current state exits. Clients can not send them.
- The file may also declare parameters that a Manager can read and set,
  environment variables for the scripts, conditions that escalate to a
  Manager, subscriptions to peers, and the commands that a Manager may
  run.

The runner reads the file once, at startup, and does not start if the
file is missing or invalid.
[STATE-MACHINE.md](state-machine.md)
explains every part of it, with examples.

## Use

Display the help:

```bash
$ runner -h
Usage: runner [options]

Remote code execution for humans

Options:
  -c --config <string>  runner config file specified in yaml format (default: "runner.yaml")
  -h --help             display help
```

Without `-c`, the runner reads _runner.yaml_ of the directory in which
it is started:

```bash
runner                    # runner.yaml of the present working directory
runner -c FILE-PATH       # absolute or relative path to the config file
runner --config FILE-PATH # absolute or relative path to the config file
```

The runner serves its API on the `port` of _runner.yaml_, at
`http://localhost:<port>` on the same computer and at
`http://<ip or hostname>:<port>` on the network.

### HTTP API

The routes take and return JSON:

| Route                  | Method | Purpose                                                                 |
| :--------------------- | :----- | :---------------------------------------------------------------------- |
| `/`                    | POST   | run a command, `{"name": "create", "input": {}}`, and return its result |
| `/`                    | GET    | the status and logs of the latest command                               |
| `/history`             | GET    | the commands received, with status, times and resources                 |
| `/stop`                | POST   | stop a running command, `{"name": "execute"}`, or all of them           |
| `/fsm/transition`      | POST   | move an idle state machine to a state, `{"state": "create"}`            |
| `/fsm/event`           | POST   | send an event to the state machine, `{"event": "stop"}`                 |
| `/fsm`                 | GET    | the state of the machine and the status of its script                   |
| `/parameters`          | GET    | the parameter values of the state machine                               |
| `/parameters`          | PUT    | set controllable parameters, `{"scope": "multi"}`                       |
| `/dt`                  | GET    | the descriptor of the digital twin                                      |
| `/state`               | GET    | the whole state of the digital twin in one document                     |
| `/health`              | GET    | liveness, uptime and the status of MQTT and the database                |
| `/metrics`             | GET    | counts and resources of the commands since the start                    |
| `/escalate`            | POST   | escalate to the Manager, `{"reason": "no free bed"}`                    |
| `/peers`               | GET    | the peers and what they last reported                                   |
| `/peers`               | PUT    | enable or disable peers, `{"hospital-2": false}`                        |

Run a command and read the result:

```bash
curl -X POST http://localhost:5000 \
  -H 'Content-Type: application/json' -d '{"name": "create"}'
```

```json
{
  "status": "success",
  "result": {
    "exitCode": 0,
    "stdout": "created\n",
    "stderr": "",
    "resources": { "cpuSeconds": 0.002, "peakRssBytes": 1572864, "processes": 1 }
  }
}
```

The `status` is `success` or `failed` with HTTP status 200 for a
script that ran, `stopped` for one that a stop request ended,
`invalid command` with 400 for a command that is not permitted, and
`command running` with 409 for a request with `input` while the command
runs. A request with an `Idempotency-Key` header runs once; a repeat
gets the first reply.

Start the state machine, send it an event, and read its state:

```bash
curl -X POST http://localhost:5000/fsm/transition \
  -H 'Content-Type: application/json' -d '{"state": "create"}'
curl -X POST http://localhost:5000/fsm/event \
  -H 'Content-Type: application/json' -d '{"event": "stop"}'
curl http://localhost:5000/state
```

A transition or an event is answered `202` with
`{"status": "accepted", "state": "<state>"}` once the script of the new
state has started, and with another status, such as `busy` or
`no transition`, when the machine can not move.

With access control, every request but `GET /health` carries
`Authorization: Bearer <token>`, a token that the caller signs.
[API.md](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/execution/runner/api/API.md)
gives every request and reply, the token format and the error bodies.

### MQTT API

With an `mqtt` section in _runner.yaml_, the runner subscribes to one
request topic for each route, under its base `topic`: `<topic>/execute`
for `POST /`, `<topic>/status` for `GET /`, `<topic>/transition`,
`<topic>/event`, `<topic>/state` and so on. A request and its response
carry the same JSON as over HTTP. The runner publishes each response
with QoS 1 to the response topic of an MQTT 5 request, or else to the
request topic followed by `/response`:

```bash
mosquitto_sub -h localhost -t 'dtaas/user1/runner/+/response' &
mosquitto_pub -h localhost -t 'dtaas/user1/runner/execute' \
  -m '{"name": "create"}'
```

The runner ignores retained requests, so that a command does not run
again each time the runner connects. Use the access control of the
broker as well: it decides who may publish on the request topics and
read the responses at all.

### Notifications

The runner announces changes without being asked, over MQTT under
`<topic>/notify/<kind>` and to the webhook of the `notify` section:

- `state`: the state document of `GET /state`, whenever it changes;
- `escalation`: the digital twin asks its Manager for help;
- `presence`: the runner is online or, through the MQTT will, offline.

Each notification is one JSON object with `kind`, `id`, `time` and
`data`. With a signing key in the `auth` section, it is a compact JWS
of that object.

## Security

The runner runs scripts on the computer that hosts it, so limit who can
call it and what its scripts can reach:

- `auth.principals` lets only the listed callers in, each in the role
  `client` or `manager`, and `auth.key` signs what the runner sends.
- On Linux, the `scripts` section runs the scripts as a second account
  that can read neither the configuration, the signing key nor the
  database.
- The runner's account should own nothing that its callers must not
  change, and the port should be reachable only by those who need it.

[SECURITY-MODEL.md](security-model.md)
explains the threats, and
[PRIVILEGE-SETUP.md](privilege-setup.md)
gives the setup of the second account.

## License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under
[the INTO-CPS License](https://odin.cps.digit.au.dk/into-cps/LICENSE.md).
