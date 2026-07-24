# :notebook: Logger microservice

The logger microservice ingests workflow log events produced by the DTaaS
client and stores them as JSON Lines (`.jsonl`), which is easy to process with
`jq`.

## API

- `GET /logger/health` returns service status.
- `POST /logger` ingests one event and appends it to a JSONL file.

## Configuration

The service loads configuration in this order:

1. CLI `--config <file>` or `-c <file>`
2. `LOGGER_CONFIG_PATH` environment variable
3. `logger.yaml` in the current working directory (if present)
4. Built-in defaults

Environment variables always override YAML values.

### YAML fields

- `hostname` (default: `127.0.0.1`; set `0.0.0.0` for Docker/reverse-proxy
  deployments)
- `port` (default: `4003`)
- `cors-allow-origin` (default: disabled; set to a single origin or YAML list
  of origins for browser clients)
- `cors-allow-credentials` (default: `false`; enable only with explicit
  allowed origins, never `*`)
- `auth-token` (default: empty string) — a static bearer token for non-browser
  producers. When set, `POST /logger` requires an
  `Authorization: Bearer <auth-token>` header matching this value; requests
  without it are rejected with `401 Unauthorized`. Leave empty to accept
  unauthenticated requests (the default). **Note:** the bundled DTaaS client
  posts events via `navigator.sendBeacon`, which cannot set custom headers, so
  enabling this setting will block ingestion from that client. Browser ingest
  security is delegated to the reverse proxy.
- `tls` (default: `false`)
- `certs` (default: `./certs`)
- `log-file-path` (default: `./logs/workflow-logs.jsonl`)
- `max-payload-bytes` (default: `65536`)
- `log-max-bytes` (default: `52428800`)
- `log-retention-files` (default: `5` rotated files)
- `throttle-ttl` (default: `60000` milliseconds)
- `throttle-limit` (default: `120` requests per throttle window)

Use `logger.yaml.sample` as a template.

### Environment variables

- `LOGGER_CONFIG_PATH`
- `LOGGER_HOSTNAME` (default: `127.0.0.1`; use `0.0.0.0` in containers)
- `LOGGER_PORT` (default: `4003`)
- `LOGGER_CORS_ALLOW_ORIGIN` (default: disabled)
- `LOGGER_CORS_ALLOW_CREDENTIALS` (default: `false`)
- `LOGGER_AUTH_TOKEN`
- `LOGGER_TLS`
- `LOGGER_CERTS_DIR`
- `LOGGER_LOG_FILE_PATH` (default: `logs/workflow-logs.jsonl`)
- `LOGGER_MAX_PAYLOAD_BYTES` (default: `65536`)
- `LOGGER_LOG_MAX_BYTES` (default: `52428800`)
- `LOGGER_LOG_RETENTION_FILES` (default: `5`)
- `LOGGER_THROTTLE_TTL` (default: `60000` milliseconds)
- `LOGGER_THROTTLE_LIMIT` (default: `120`)

External authentication and edge rate limiting are provided by the reverse
proxy in the deployment compose files. The service also applies an internal
request throttle for callers that bypass the proxy.

The logger identifies callers by their TCP peer address and deliberately does
not trust forwarded client-address headers. Behind Traefik, requests therefore
share the proxy container's throttle budget. Set `throttle-limit` (or
`LOGGER_THROTTLE_LIMIT`) high enough for the combined request volume of all
expected users during `throttle-ttl`.

The service sends `Access-Control-Allow-Credentials: true` only when
`cors-allow-credentials` is enabled. Credentials cannot be enabled with a
wildcard CORS origin.

## TLS support

Set `tls: true` (or `LOGGER_TLS=true`) to enable HTTPS.

Certificates are read from the configured cert directory:

- `<certs>/fullchain.pem`
- `<certs>/privkey.pem`

If either file is missing and TLS is enabled, the service auto-generates a
self-signed certificate using OpenSSL with RSA-4096 + SHA-256 and stores the
files in the certs directory.

## Log storage format

Each request is appended as one JSON object per line (`.jsonl`). This format is
append-efficient and can be queried directly:

```bash
jq -c '.event' logs/workflow-logs.jsonl
```

The active log rotates at `log-max-bytes` and keeps the configured number of
rotated files. The defaults are 50 MiB and 5 rotated files, so capacity should
allow for the active file plus those retained rotated files.

Log writes are best-effort analytics storage. Graceful shutdown closes the
write stream, but recent events may be lost on hard container termination
because writes are not fsynced per request.

## Run locally

```bash
yarn install
yarn build
yarn start
```

For non-Docker development, point the client at the logger's direct port:

```javascript
LOGGER_URL: 'http://localhost:4003/logger';
```

The `/logger` suffix is required. The client validates logger reachability by
appending `/health`, so `http://localhost:4003/logger` checks
`http://localhost:4003/logger/health`. A bare host such as
`http://localhost:4003` would check `/health`, which is not a logger endpoint.
