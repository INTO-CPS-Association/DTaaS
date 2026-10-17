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

The utility requires config specified in YAML format.
A sample configuration is given below. Copy it into a file named
_runner.yaml_, and update the values for your setup:

```yaml
port: 5000
location: 'scripts'  # directory of scripts, relative to this config file
commands:  # list of permitted scripts
  - create
  - execute
  - terminate
```

With this configuration, the scripts are placed in a `scripts` directory
next to _runner.yaml_, and only the _create_, _execute_ and _terminate_
scripts can be run.

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

### Command History

The runner keeps the commands it receives, with their results, in an
SQLite database. The database is in memory unless the configuration
names a database file, relative to the configuration file:

```yaml
database: 'runner.db'
```

With a database file, the history, the status of the last command and
the request keys of [repeated requests](#repeated-requests) survive a
restart of the runner.

### MQTT

The runner serves the same API over MQTT when the configuration
has an `mqtt` section. HTTP remains available on `port`.

```yaml
mqtt:
  url: 'mqtt://localhost:1883'  # mqtt://, mqtts://, ws:// or wss://
  topic: 'dtaas/user1/runner'   # base topic of this runner
  username: 'runner'            # optional
  password: 'secret'            # optional
  protocolVersion: 5            # optional; 5 (default) or 4 for MQTT 3.1.1
```

The `topic` must be unique to each runner that shares a broker,
and must not contain the `+` or `#` wildcards.
The runner keeps reconnecting while the broker is unavailable or
refuses the connection, and serves HTTP in the meantime. The runner does not start
if the `mqtt` section is invalid.

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
The runner executes it with `powershell.exe -ExecutionPolicy Bypass -File`.
A directory can hold both versions of a script, so that the same
commands work on Linux and Windows.

The `DOCKER.md` file in the
[runner source](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/servers/execution/runner)
describes running the runner in a docker container.

## Use

Display help.

```bash
$runner -h
Usage: runner [options]

Remote code execution for humans

Options:
  -v --version          package version
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

Three REST API methods are active. The route paths and the responses given
for these two sources are:

| REST API Route         | HTTP Method | Return Value                                                            | Comment                                                                                                 |
| :--------------------- | :---------- | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| localhost:port         | POST        | Returns the execution status of command                                 | Executes the command provided. All the commands sent in the right JSON format gets stored in _history_. |
| localhost:port         | GET         | Returns the execution status of the last command sent via POST request. |                                                                                                         |
| localhost:port/history | GET         | Returns the array of valid POST requests received so far.               |                                                                                                         |

#### POST Request to /

Executes a command. The command name given here must exist
in _location_ directory.

```http
{
  "name": "<command name>"
}
```

If the command is in the permitted list of commands specified
in _runner.yaml_ and the matching command / script exists in _location_,
a successful execution takes place. The API response will be

```http
{
  "status": "success"
}
```

If the command is neither permitted nor available, the response will be

```http
{
  "status": "invalid command"
}
```

#### GET Request to /

Shows the status of the command last executed. If the execution
was successful, the status will be

```http
{
  "name": "<command-name>",
  "status": "valid",
  "logs": {
    "stdout": "<output log of command>",
    "stderr": "<error log of command>"
  }
}
```

If the execution is unsuccessful, the status will be

```http
{
  "name": "<command-name>",
  "status": "invalid",
  "logs": {
    "stdout": "",
    "stderr": ""
  }
}
```

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

Returns the array of POST requests received so far.
Both valid and invalid commands are recorded in the history.

```http
[
  {
    "name": "valid command"
  },
  {
    "name": "invalid command"
  },
  {
    "name": "valid command"
  }
]
```

#### Repeated Requests

The runner does not run a command again for a repeated request:

- A request may carry an `Idempotency-Key` HTTP header, or an
  `idempotency-key` user property over MQTT 5, with a value unique to
  that request. A later request with the same key gets the response of
  the first one, and the command does not run again.
- A request for a command that is still running gets the result of
  that run, and does not start the command a second time.

A repeated request is not added to the history. The runner keeps the
request keys in its [database](#command-history).

```bash
curl -X POST http://localhost:5000 \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 7d1e4a36-0b8a-4c51-9c0e-2b8f1e6f2a10' \
  -d '{"name": "create"}'
```

### MQTT API

With MQTT enabled, the runner subscribes to one request topic
for each REST API route. A request and its response carry the same
JSON as the matching HTTP request and response.

| Request Topic     | Matching HTTP Request | Request Payload              |
| :---------------- | :-------------------- | :--------------------------- |
| `<topic>/execute` | POST /                | `{"name": "<command name>"}` |
| `<topic>/status`  | GET /                 | ignored                      |
| `<topic>/history` | GET /history          | ignored                      |

The runner publishes each response with QoS 1:

- to the response topic of an MQTT 5 request, along with its
  correlation data, when the request has a response topic;
- otherwise to the request topic followed by `/response`,
  for example `<topic>/execute/response`.

The runner uses the default response topic instead when the
requested one is empty, holds a wildcard, starts with `$`,
or is one of its request topics.

MQTT has no status codes, so the response payload alone tells
the outcome. A request payload that is not a JSON object with a `name`
gets the validation error of the HTTP API, and an unexpected failure
gets the body of an HTTP 500 response.

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

Anyone who can publish to the request topics can run the permitted
commands. Use the access control of the broker to limit publishing
on the request topics, and to limit the topics the runner may publish
to. Use `mqtts://` or `wss://` with a username and password when the
broker is not on the same computer.

## License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under
[the INTO-CPS License](https://odin.cps.digit.au.dk/into-cps/LICENSE.md).
