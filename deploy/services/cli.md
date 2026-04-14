# DTaaS Platform Services: CLI and Manual Operations

This guide merges CLI usage and manual Docker Compose operations for platform
services.

Source package:

- `deploy/services/cli`

## Managed Services

- InfluxDB
- Grafana
- RabbitMQ (with MQTT plugin)
- MongoDB
- ThingsBoard (with PostgreSQL)
- GitLab

## CLI-First Workflow

### Install and Verify

```bash
pip install dtaas_services-0.3.0-py3-none-any.whl
dtaas-services --help
```

### Generate and Configure Project

```bash
dtaas-services generate-project
```

Then edit:

- `config/services.env`
- `config/credentials.csv`

### Prepare and Start

```bash
dtaas-services setup
dtaas-services start
```

## Core CLI Commands

### Project and setup

```bash
dtaas-services generate-project [--path <dir>]
dtaas-services setup
```

### Service lifecycle

```bash
dtaas-services start [-s influxdb,rabbitmq]
dtaas-services stop [-s influxdb]
dtaas-services restart [-s mongodb]
dtaas-services status [-s gitlab]
dtaas-services remove [-s service1,service2] [-v]
```

### User operations

```bash
dtaas-services user add
dtaas-services user add -s rabbitmq
dtaas-services user reset-password -s thingsboard
dtaas-services user reset-password -s gitlab
```

## Manual Compose Operations

Use this mode for explicit compose-level control after project
generation.

### Generated files

- `compose.services.yml`
- `compose.thingsboard.yml`
- `compose.gitlab.yml`
- `config/services.env`

### Start

```bash
docker compose -f compose.services.yml --env-file config/services.env up -d
docker compose -f compose.thingsboard.yml --env-file config/services.env up -d
docker compose -f compose.gitlab.yml --env-file config/services.env up -d
```

### Stop

```bash
docker compose -f compose.services.yml --env-file config/services.env down
docker compose -f compose.thingsboard.yml --env-file config/services.env down
docker compose -f compose.gitlab.yml --env-file config/services.env down
```

### Status and logs

```bash
docker compose -f compose.services.yml --env-file config/services.env ps
docker compose -f compose.services.yml --env-file config/services.env logs -f
```

## GitLab and ThingsBoard Notes

- GitLab install and post-install setup are supported by CLI.
- ThingsBoard install depends on PostgreSQL readiness.
- GitLab integration guide: `deploy/services/cli/GITLAB_INTEGRATION.md`
- Runner guide: `deploy/services/runner/GITLAB-RUNNER.md`

## Troubleshooting

### Permissions (Linux/macOS)

```bash
sudo -E env PATH="$PATH" dtaas-services setup
```

### Docker connectivity

```bash
docker ps
```
