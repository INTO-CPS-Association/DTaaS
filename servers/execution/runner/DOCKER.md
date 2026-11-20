# Overview

The **runner microservice** executes a fixed set of permitted scripts
and provides a REST API for their remote execution.
This document describes running the runner in a docker container.

The runner image is not published to a container registry yet.
The docker compose files in this directory build the image from the
`developer/check/runner.dockerfile` of the DTaaS repository.
Run the commands below from the `servers/execution/runner` directory.

## Use in Docker Environment

### Create Scripts

The runner executes only the scripts present in its scripts directory.
Create a directory named `scripts`, and place one script in it for each
command that the REST API consumers may run. The name of a script is the
name of its command. For example, the `create` script below becomes the
`create` command.

```bash
mkdir scripts
cat > scripts/create <<'EOF'
#!/bin/bash
echo "hello world"
EOF
chmod +x scripts/create
```

The container runs Linux, so the scripts must be executable shell scripts
with Unix (LF) line endings. The container runs as the `node` user
(uid 1000), so the scripts must be readable and executable by that user.

The output of a script is available in the `logs` of the command status.
A script that exits with a non-zero code is reported as `failed`, with
its exit code and logs; `invalid command` is for a command that is not
permitted.

### Configure

Copy the sample configuration:

```bash
cp config/runner.yaml.sample config/runner.yaml
```

The sample configuration file is:

```yaml
id: 'my-dt' # names the digital twin; letters, digits, _, . or -, up to 64
port: 5000
location: 'scripts' # directory of scripts, relative to this config file
commands: # list of permitted scripts
  - create
  - execute
  - terminate
```

The sample also lists the optional keys, commented out. The runner
does not start without an `id`, so a `config/runner.yaml` copied from
a sample older than version 0.5.0 needs one.

Only the commands listed in `commands` can be executed, and only if
a matching script exists in the `scripts` directory.
The `compose.runner.yml` file mounts `config/runner.yaml` as
`/dtaas/runner/runner.yaml` and the `scripts` directory as
`/dtaas/runner/scripts`, so keep `location: 'scripts'`.
If you change the `port`, change the port mapping in `compose.runner.yml`
as well. A `stateMachine` file, such as `scripts/state-machine.yaml`,
must be in the mounted `scripts` directory, as only that directory and
`runner.yaml` are in the container. So must the private key of
`auth.key`, or another volume must mount it: with the sample's
`key: 'keys/my-dt.key'` and only these two mounts, the runner does not
start.

### Run

Use the following commands to start and stop the container respectively:

```bash
docker compose -f compose.runner.yml up -d --build
docker compose -f compose.runner.yml down
```

The runner becomes available at <http://localhost:5000>.

### Try with the Test Scripts

The `compose.runner.dev.yml` file runs the runner with the test scripts
in `test/data/scripts` and the `config/runner.test.yaml` configuration.

```bash
cp config/runner.test.yaml.sample config/runner.test.yaml
docker compose -f compose.runner.dev.yml up -d --build
docker compose -f compose.runner.dev.yml down
```

## Application Programming Interface (API)

- `POST /` with `{"name": "<command name>"}` executes a command.
- `GET /` returns the status and logs of the last command.
- `GET /history` returns the commands received so far, with their
  status, exit code, times and the CPU time and peak memory of their
  scripts.
- `GET /metrics` returns counters since the runner started.
- `GET /dt` returns the `id`, `attributes` and `commands` of the
  digital twin, whether a state machine is loaded, the commands of its
  Manager, its enabled peers and the public key of its signatures.
- `GET /health` returns whether the runner and its connections are up.

The state machine, parameters, state document, peers, stop and
escalation routes are in the [README](./README.md#use) and
[API.md](./api/API.md).

A sample request is:

```bash
curl -X POST http://localhost:5000 \
  -H 'Content-Type: application/json' \
  -d '{"name": "create"}'
curl http://localhost:5000
```

The runner keeps its command history in memory unless
`config/runner.yaml` names a `database` file. To keep the history
across container restarts, mount a directory for the database and
name a file in it, for example `database: 'data/runner.db'` with the
volume `./data:/dtaas/runner/data`. The runner runs as uid 1000 and
must be able to write to that directory, so create it before starting
the container, and run `sudo chown 1000 data` if your user id is not 1000.

At shutdown the runner waits for the commands in progress to finish.
Docker stops a container forcibly after ten seconds, so set a longer
`stop_grace_period` in the compose file for commands that take longer.
With MQTT, leaving the broker can take up to 4 s of that period.

The `compose.runner.yml` file has a Docker health check that asks
`GET /health` with node, as the image has neither curl nor wget:

```yaml
healthcheck:
  test:
    - CMD
    - node
    - -e
    - "fetch('http://127.0.0.1:5000/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
```

If you change the `port` in `config/runner.yaml`, change it in the
health check as well. The runner answers `200` also when its `status`
is `degraded`, for example while it is not connected to its MQTT
broker, so the check tells only whether the runner is alive.

The runner serves the same API over MQTT when `config/runner.yaml`
has an `mqtt` section. Inside the container, `localhost` refers to the
container itself, so give the broker's hostname or IP address in its
`url`. The [README](./README.md) describes the API responses and
the MQTT topics in detail.

The container is the boundary between the runner and the host, but the
scripts in it run as the runner's own account and can read
`runner.yaml` and the key. A `scripts` section in `config/runner.yaml`
runs them as a second account instead; the image then needs that
account, and the container needs the start that
[PRIVILEGE-SETUP.md](./PRIVILEGE-SETUP.md) describes for Docker.
[SECURITY-MODEL.md](./SECURITY-MODEL.md) describes the threat model
behind it.
