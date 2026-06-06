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

- `hostname` (default: `0.0.0.0`)
- `port` (default: `4003`)
- `cors-allow-origin` (default: `0.0.0.0:<port>`, e.g. `0.0.0.0:4003`)
- `jwt` (default: empty string)
- `tls` (default: `false`)
- `certs` (default: `./certs`)
- `log-file-path` (default: `./logs/workflow-logs.jsonl`)
- `max-payload-bytes` (default: `65536`)

Use `logger.yaml.sample` as a template.

### Environment variables

- `LOGGER_CONFIG_PATH`
- `LOGGER_HOSTNAME`
- `LOGGER_PORT` (default: `4003`)
- `LOGGER_CORS_ALLOW_ORIGIN` (default: `0.0.0.0:<port>`)
- `LOGGER_JWT`
- `LOGGER_TLS`
- `LOGGER_CERTS_DIR`
- `LOGGER_LOG_FILE_PATH` (default: `logs/workflow-logs.jsonl`)
- `LOGGER_MAX_PAYLOAD_BYTES` (default: `65536`)

The service always sets `Access-Control-Allow-Credentials: true` for CORS
responses.

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

## Run locally

```bash
yarn install
yarn build
yarn start
```
