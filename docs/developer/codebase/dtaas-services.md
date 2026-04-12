# DTaaS Services Codebase

This page documents the implementation codebase for the `dtaas-services` CLI
used to provision and operate DTaaS platform services.

## Location and Purpose

Source package:

- `deploy/services/cli`

Primary responsibilities:

- generate a runnable services project structure,
- set up certificates and service permissions,
- start/stop/restart/remove/clean service containers,
- install post-start workflows for ThingsBoard and GitLab,
- create users and reset service passwords from CSV/env configuration.

## Runtime Command Surface

CLI entrypoint is defined in `dtaas_services/cmd.py` and exposes:

- `generate-project`
- `setup`
- `install`
- `start`
- `stop`
- `restart`
- `status`
- `remove`
- `clean`
- `user add`
- `user reset-password`

Poetry script mapping (`pyproject.toml`):

```toml
[tool.poetry.scripts]
dtaas-services = "dtaas_services.cmd:services"
```

## Package Layout

```text
deploy/services/cli/
├── dtaas_services/
│   ├── cmd.py
│   ├── commands/
│   │   ├── setup_ops.py
│   │   ├── service_ops.py
│   │   ├── user_ops.py
│   │   └── utility.py
│   ├── pkg/
│   │   ├── config.py
│   │   ├── cert.py
│   │   ├── template.py
│   │   ├── utils.py
│   │   ├── password_store.py
│   │   ├── lib/
│   │   │   ├── manager.py
│   │   │   ├── docker_executor.py
│   │   │   ├── status.py
│   │   │   ├── cleanup.py
│   │   │   └── initialization.py
│   │   └── services/
│   │       ├── mongodb.py
│   │       ├── rabbitmq.py
│   │       ├── influxdb/
│   │       ├── postgres/
│   │       ├── thingsboard/
│   │       └── gitlab/
│   └── templates/
├── tests/
├── README.md
└── pyproject.toml
```

## Layered Design

### Command Layer

Files in `dtaas_services/commands/` define Click commands and high-level flows:

- `setup_ops.py`: project generation, TLS setup, service install flows.
- `service_ops.py`: lifecycle operations (`start`, `stop`, `status`, `remove`,
  `clean`).
- `user_ops.py`: user provisioning and password reset orchestration.

### Core Library Layer

Files in `dtaas_services/pkg/` provide reusable logic:

- `config.py`: environment/config loading.
- `template.py`: generated project scaffolding and template copying.
- `cert.py`: certificate placement and normalization.
- `password_store.py`: current admin-password tracking for supported services.
- `lib/*`: compose command execution and service-state management.

### Service Modules Layer

`dtaas_services/pkg/services/` implements service-specific behavior:

- `gitlab/`: health checks, root password setup, PAT creation, OAuth app setup,
  and GitLab user provisioning.
- `thingsboard/`: setup, sysadmin/tenant workflows, credential-driven user setup.
- `influxdb/`, `rabbitmq.py`, `mongodb.py`, `postgres/`: permissions,
  readiness checks, and account/bootstrap routines.

## Configuration Inputs

Generated projects are driven by:

- `config/services.env`: ports, hostnames, SSL behavior, service credentials.
- `config/credentials.csv`: user list (`username,password,email`).
- TLS certificates copied into generated `certs/` layout.

Critical GitLab-related environment variables include `HOSTNAME`,
`GITLAB_PORT`, `SSL_VERIFY`, and `GITLAB_ROOT_NEW_PASSWORD`.

## Typical Workflow

1. Generate project files:
   - `dtaas-services generate-project`
2. Edit configuration:
   - `config/services.env`
   - `config/credentials.csv`
3. Set up certs and permissions:
   - `dtaas-services setup`
4. Start selected services:
   - `dtaas-services start [-s ...]`
5. Run post-install setup where needed:
   - `dtaas-services install -s thingsboard`
   - `dtaas-services install -s gitlab`
6. Provision users:
   - `dtaas-services user add`

## Testing and Quality

The package uses pytest with strict markers and test discovery rooted in
`deploy/services/cli/tests`.

Common developer checks:

```bash
cd deploy/services/cli
poetry install
poetry run pytest
```

## Contributor Notes

- Keep command modules thin and push business logic into `pkg/`.
- Add service-specific behavior in `pkg/services/<service>/` or peer modules,
  not in generic command handlers.
- Preserve CLI ergonomics: commands should return actionable messages and avoid
  partial side effects without clear status output.
- When adding new service operations, include tests under `tests/test_services`
  and command-level coverage under `tests/test_commands`.
