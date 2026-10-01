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
A script that exits with a non-zero code is reported as an invalid command.

### Configure

Copy the sample configuration:

```bash
cp config/runner.yaml.sample config/runner.yaml
```

The sample configuration file is:

```yaml
port: 5000
location: 'scripts'  # directory of scripts, relative to this config file
commands:  # list of permitted scripts
  - create
  - execute
  - terminate
```

Only the commands listed in `commands` can be executed, and only if
a matching script exists in the `scripts` directory.
The `compose.runner.yml` file mounts `config/runner.yaml` as
`/dtaas/runner/runner.yaml` and the `scripts` directory as
`/dtaas/runner/scripts`, so keep `location: 'scripts'`.
If you change the `port`, change the port mapping in `compose.runner.yml`
as well.

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
- `GET /history` returns the commands received so far.

A sample request is:

```bash
curl -X POST http://localhost:5000 \
  -H 'Content-Type: application/json' \
  -d '{"name": "create"}'
curl http://localhost:5000
```

The [README](./README.md) describes the API responses in detail.
