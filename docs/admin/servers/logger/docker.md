# Host Logger Microservice

The **logger microservice** ingests workflow log events produced by the
DTaaS client and stores them as JSON Lines (`.jsonl`) files.

This page explains how to run the logger microservice as a standalone
docker container.

## Setup

Place the following two items in the directory from which
`compose.logger.yml` will be run.

* A `logger.yaml` configuration file. Download the
  [sample configuration](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/logger/config/logger.yaml.sample)
  and use it as a template:

  ```bash
  curl -o logger.yaml \
    https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/servers/logger/config/logger.yaml.sample
  ```

* A `logs` directory for the captured events. The logger runs as uid
  1000; if that user cannot write to the directory, the container makes
  it the owner at start-up (image version 0.1.2 and later).

  ```bash
  mkdir logs
  ```

## :rocket: Use

Use the [docker compose](compose.logger.yml) file to start the service.

```bash
# To bring up the container
docker compose -f compose.logger.yml up -d
# To bring down the container
docker compose -f compose.logger.yml down
```

## Service Endpoints

The health check URL: `localhost:4003/logger/health`

The event ingestion URL: `localhost:4003/logger`

The configuration options are described in the
[npm package](npm.md) page and the service is described on the
[user page](../../../user/servers/logger/LOGGER-MS.md).
