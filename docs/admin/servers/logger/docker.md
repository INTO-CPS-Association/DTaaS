# Host Logger Microservice

The **logger microservice** ingests workflow log events produced by the
DTaaS client and stores them as JSON Lines (`.jsonl`) files.

This page explains how to run the logger microservice as a standalone
docker container.

## Setup

Place a `logger.yaml` configuration file in the directory from which
`compose.logger.yml` will be run. Download the
[sample configuration](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/logger/config/logger.yaml.sample)
and use it as a template:

```bash
curl -o logger.yaml \
  https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/servers/logger/config/logger.yaml.sample
```

The captured events go to a `logs` directory in the same location.
The logger runs as the `node` user (uid 1000), so create the directory
and, on Linux hosts, give it to uid 1000:

```bash
mkdir logs
sudo chown -R 1000:1000 logs
```

If the `logs` directory does not exist, Docker creates it as `root`.
Images before 0.1.2 cannot write into such a directory.

## Use

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
