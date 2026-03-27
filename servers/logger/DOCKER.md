# Logger microservice container

The logger microservice Docker image exposes the NestJS logger ingestion API
on port `4003` by default.

## Runtime variables

- `LOGGER_PORT`
- `LOGGER_LOG_FILE_PATH`
- `LOGGER_MAX_PAYLOAD_BYTES`

Mount a host directory to `/dtaas/logger/logs` to persist captured events.

