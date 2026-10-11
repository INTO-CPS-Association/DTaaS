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

The logger runs as the `node` user (uid 1000). If that user cannot write
to the `logs` directory, for example because Docker created it as `root`,
the container makes `node` its owner at start-up and then drops root
privileges. No manual `chown` is needed. This applies from version 0.1.2
of the image.

## :gear: Configure

The microservice reads its configuration from `logger.yaml`.
Download the sample configuration and save it as `logger.yaml`,
in the same location as the `compose.logger.yml` file:

```bash
curl -o logger.yaml \
  https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/servers/logger/config/logger.yaml.sample
```

The sample configuration file is:

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

Environment variables always override the values in `logger.yaml`.
The image sets three of them:

- `LOGGER_HOSTNAME=0.0.0.0`, so the service listens on all container
  interfaces.
- `LOGGER_LOG_FILE_PATH=/dtaas/logger/logs/workflow-logs.jsonl`, so the
  events are written into the mounted `logs` directory.
- `LOGGER_CERTS_DIR=/dtaas/logger/certs`, so a generated certificate
  lands in the `certs` directory, mounted or not.

The other runtime variables are:

- `LOGGER_CONFIG_PATH`
- `LOGGER_PORT`
- `LOGGER_CORS_ALLOW_ORIGIN`
- `LOGGER_CORS_ALLOW_CREDENTIALS`
- `LOGGER_AUTH_TOKEN`
- `LOGGER_TLS`
- `LOGGER_MAX_PAYLOAD_BYTES`
- `LOGGER_LOG_MAX_BYTES`
- `LOGGER_LOG_RETENTION_FILES`
- `LOGGER_THROTTLE_TTL`
- `LOGGER_THROTTLE_LIMIT`

The throttle uses the TCP peer address. When the service is behind a reverse
proxy, this is a shared budget for all proxied requests; size
`LOGGER_THROTTLE_LIMIT` for the expected aggregate workload.

When `LOGGER_TLS=true`, the logger serves HTTPS with the `fullchain.pem`
and `privkey.pem` files in `/dtaas/logger/certs` and generates a
self-signed pair with `openssl` when they are missing. Mount a directory
there to keep the certificate across restarts or to provide your own;
like the `logs` directory, the container gives it to `node` at start-up.

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
