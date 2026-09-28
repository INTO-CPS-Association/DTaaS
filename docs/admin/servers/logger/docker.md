# Host Logger Microservice

The **logger microservice** ingests workflow log events produced by the
DTaaS client and stores them as JSON Lines (`.jsonl`) files.

This document provides instructions for running a docker container
to provide a standalone logger microservice.

## Setup

Place the following two items in the directory from which
`compose.logger.yml` will be run.

* A `logger.yaml` configuration file. The
  [sample configuration](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/logger/logger.yaml.sample)
  can be used as a template.
* A `logs` directory for the captured events. The container runs as
  uid 1000, so on Linux hosts give the directory to that user:

  ```bash
  mkdir logs
  sudo chown -R 1000:100 logs
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
