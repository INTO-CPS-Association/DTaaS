# DTaaS Services CLI

The DTaaS Services CLI manages platform services from a generated project
structure.

This page now includes both CLI and manual compose operations.
Canonical repository copy: `deploy/services/cli.md`.

Source package:

- `deploy/services/cli`

## Managed Services

- InfluxDB
- Grafana
- RabbitMQ (with MQTT plugin)
- MongoDB
- ThingsBoard (with PostgreSQL)
- GitLab

## Installation

Install the wheel package:

```bash
pip install dtaas_services-0.3.0-py3-none-any.whl
```

Verify:

```bash
dtaas-services --help
```

## Quick Start

1. Generate a services project:

   ```bash
   dtaas-services generate-project
   ```

2. Edit generated config files:

   - `config/services.env`
   - `config/credentials.csv`

3. Prepare certificates/permissions:

   ```bash
   dtaas-services setup
   ```

4. Start services:

   ```bash
   dtaas-services start
   ```

## Manual Compose Operations

After generating a services project, services may be operated manually with
compose files:

- `compose.services.yml`
- `compose.thingsboard.yml`
- `compose.gitlab.yml`

Start manually:

```bash
docker compose -f compose.services.yml --env-file config/services.env up -d
docker compose -f compose.thingsboard.yml --env-file config/services.env up -d
docker compose -f compose.gitlab.yml --env-file config/services.env up -d
```

Stop manually:

```bash
docker compose -f compose.services.yml --env-file config/services.env down
docker compose -f compose.thingsboard.yml --env-file config/services.env down
docker compose -f compose.gitlab.yml --env-file config/services.env down
```

## Core Commands

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

## GitLab and ThingsBoard Notes

- GitLab install and post-install setup are supported in the CLI.
- ThingsBoard installation depends on PostgreSQL readiness.
- For GitLab integration and runner setup, see:
  - `deploy/services/cli/GITLAB_INTEGRATION.md`
  - `deploy/services/runner/GITLAB-RUNNER.md`

## Troubleshooting

### Permissions (Linux/macOS)

```bash
sudo -E env PATH="$PATH" dtaas-services setup
```

### Docker connectivity

```bash
docker ps
```

### Source of truth

For full and latest command details, use:

- `deploy/services/cli/README.md`
- `deploy/services/cli.md`
