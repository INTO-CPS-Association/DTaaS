# Overview

The **logger microservice** ingests workflow log events produced by the
DTaaS client and stores them as JSON Lines (`.jsonl`) files. The Docker
image exposes the NestJS logger ingestion API on port `4003` by default.

## Use in Docker Environment

### Create Docker Compose File

Create an empty file named `compose.logger.yml` and copy
the following into the file:

```yml
services:
  logger-ms:
    image: intocps/logger-ms:latest
    restart: unless-stopped
    volumes:
      - ./logger.yaml:/dtaas/logger/logger.yaml
      - ./logs:/dtaas/logger/logs
    ports:
      - "4003:4003"
```

### Create Logs Directory

The logger microservice appends the captured events to
`logs/workflow-logs.jsonl`. Create a directory named `logs`
in the same file system location as that of the `compose.logger.yml` file.

The logger container runs as the `node` user (uid 1000). On Linux hosts,
give the directory to uid 1000:

```bash
mkdir logs
sudo chown -R 1000:100 logs
```

If the `logs` directory does not exist, Docker creates it as `root`, and
the logger cannot write into it.

## :gear: Configure

The microservice reads its configuration from `logger.yaml`.
The template configuration file is:

```yaml
hostname: 127.0.0.1
port: 4003
cors-allow-origin: http://localhost
cors-allow-credentials: false
auth-token: ''
tls: false
certs: ./certs
log-file-path: ./logs/workflow-logs.jsonl
max-payload-bytes: 65536
log-max-bytes: 52428800
log-retention-files: 5
throttle-ttl: 60000
throttle-limit: 120
```

Replace the default values with the appropriate values for your setup.
Please save this config in `logger.yaml`, in the same location as the
`compose.logger.yml` file.

Environment variables always override the values in `logger.yaml`.
The image sets two of them:

- `LOGGER_HOSTNAME=0.0.0.0`, so the service listens on all container
  interfaces.
- `LOGGER_LOG_FILE_PATH=/dtaas/logger/logs/workflow-logs.jsonl`, so the
  events are written into the mounted `logs` directory.

The other runtime variables are:

- `LOGGER_CONFIG_PATH`
- `LOGGER_PORT`
- `LOGGER_CORS_ALLOW_ORIGIN`
- `LOGGER_CORS_ALLOW_CREDENTIALS`
- `LOGGER_AUTH_TOKEN`
- `LOGGER_TLS`
- `LOGGER_CERTS_DIR`
- `LOGGER_MAX_PAYLOAD_BYTES`
- `LOGGER_LOG_MAX_BYTES`
- `LOGGER_LOG_RETENTION_FILES`
- `LOGGER_THROTTLE_TTL`
- `LOGGER_THROTTLE_LIMIT`

The throttle uses the TCP peer address. When the service is behind a reverse
proxy, this is a shared budget for all proxied requests; size
`LOGGER_THROTTLE_LIMIT` for the expected aggregate workload.

When `LOGGER_TLS=true`, also mount a cert directory to
`/dtaas/logger/certs` (or another directory pointed to by
`LOGGER_CERTS_DIR`). Missing cert/key files are generated automatically.

The
[logger README](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/logger/README.md)
describes all the configuration fields.

### Run

Use the following commands to start and stop the container respectively:

```bash
docker compose -f compose.logger.yml up -d
docker compose -f compose.logger.yml down
```

The logger microservice becomes available at <http://localhost:4003/logger>.

## Application Programming Interface (API)

- `GET /logger/health` returns the service status.
- `POST /logger` ingests one event and appends it to the JSONL file.

A sample event is:

```bash
curl -X POST http://localhost:4003/logger \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "userHash": "a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
    "timestamp": "2026-03-24T20:00:00.000Z",
    "event": "click",
    "page": "/preview/digitaltwins",
    "element": "button",
    "label": "Start"
  }'
```

A successful request returns `204 No Content`. The captured events can be
queried with `jq`:

```bash
jq -c '.event' logs/workflow-logs.jsonl
```
