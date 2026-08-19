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
│   ├── gitlab_common/      # vendored from lib/gitlab_common (gitignored)
│   │   ├── client.py
│   │   ├── users.py
│   │   └── validators.py
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

`dtaas_services/pkg/services/` implements service-specific behaviour:

- `gitlab/`: health checks, root password setup, PAT creation, OAuth app setup,
  and GitLab user provisioning.
- `thingsboard/`: setup, sysadmin/tenant workflows, credential-driven user setup.
- `influxdb/`, `rabbitmq.py`, `mongodb.py`, `postgres/`: permissions,
  readiness checks, and account/bootstrap routines.

### Shared GitLab Layer

`gitlab_common` holds provider-agnostic GitLab operations
(`get_gitlab_client`, `validate_user_row`, `create_user`, `create_user_pat`).
Every function takes explicit arguments and performs no environment,
filesystem, console, or process-global state changes.

Its single source of truth is `lib/gitlab_common/`, a standalone Poetry
package with its own tests. Each consumer **copies** it into its own tree
rather than depending on it:

```text
lib/gitlab_common/gitlab_common/     <-- edit and test here
        |  copied by dtaas_services/pkg/build.py
        v
dtaas_services/gitlab_common/        <-- gitignored, never committed
```

Run `poetry run python -m dtaas_services.pkg.build` before testing or
packaging; CI does this via `run-build-script: true`. It is a plain script,
not a Poetry build hook, because a hook makes poetry-core emit a
platform-specific wheel instead of `py3-none-any`. Copying (rather than a
path dependency) keeps `dtaas-services` and the DTaaS CLI independent of each
other and keeps local paths out of published wheel metadata, which PyPI
rejects.

Deployment-specific glue stays in `pkg/services/gitlab/`: URL derivation from
`GITLAB_PORT`/`HOSTNAME`, token-file persistence, docker health checks, and
Rich console output. Two consequences are deliberate:

- Suppressing urllib3's `InsecureRequestWarning` when `SSL_VERIFY=false`
  happens in `pkg/services/gitlab/_api.py`, not in `gitlab_common`, so
  importing the shared module never silences warnings for unrelated consumers.
- `gitlab_common` defaults Personal Access Tokens to least-privilege
  repository-only scopes. `pkg/services/gitlab/users.py` opts into the broader
  `api` scope explicitly via `PatOptions`.

## Configuration Inputs

Generated projects are driven by:

- `config/services.env`: ports, hostnames, SSL behaviour, service credentials.
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
- Add service-specific behaviour in `pkg/services/<service>/` or peer modules,
  not in generic command handlers.
- Preserve CLI ergonomics: commands should return actionable messages and avoid
  partial side effects without clear status output.
- When adding new service operations, include tests under `tests/test_services`
  and command-level coverage under `tests/test_commands`.
