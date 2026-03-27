# :notebook: Logger microservice

The logger microservice ingests workflow log events produced by the DTaaS
client and stores them as JSON Lines (`.jsonl`).

## API

- `GET /logger/health` returns service status.
- `POST /logger` ingests one event and appends it to a JSONL file.

## Environment variables

- `LOGGER_PORT` (default: `4003`)
- `LOGGER_LOG_FILE_PATH` (default: `logs/workflow-logs.jsonl`)
- `LOGGER_MAX_PAYLOAD_BYTES` (default: `65536`)

## Run locally

```bash
yarn install
yarn build
yarn start
```

