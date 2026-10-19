# DTaaS Services Codebase

This page describes the code of the `dtaas-services` CLI, which sets up
and runs the DTaaS platform services.

## Location and Purpose

Source package:

- `deploy/services/cli`

The CLI:

- generates a services project structure that is ready to run,
- sets up certificates and service permissions,
- installs, starts, stops, restarts, removes and cleans service
  containers,
- runs the post-start setup for ThingsBoard and GitLab,
- creates users and resets service passwords from the CSV and
  environment configuration.

## Runtime Command Surface

Every command follows the grammar `dtaas-services <noun> <verb>`. The
entry point is `dtaas_services/cmd.py`, which registers the nouns in
install order:

- `project generate`
- `host setup`
- `service install`, `service start`, `service stop`,
  `service restart`, `service status`, `service remove`,
  `service clean`
- `user add`
- `user reset-password`
- `user add-signals`, in `commands/signals_ops.py`, which creates the
  read-only RabbitMQ user of the signals gateway

The old top-level spellings (`generate-project`, `setup`, `start` and so
on) are registered by `commands/aliases.py`. They print a deprecation
warning and forward to the `<noun> <verb>` command.

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
│   │   ├── project_ops.py
│   │   ├── host_ops.py
│   │   ├── service_ops.py
│   │   ├── install_helpers.py
│   │   ├── user_ops.py
│   │   ├── aliases.py
│   │   └── utility.py
│   ├── pkg/
│   │   ├── build.py
│   │   ├── config.py
│   │   ├── cert.py
│   │   ├── template.py
│   │   ├── force_overwrite.py
│   │   ├── docker_utils.py
│   │   ├── formatter.py
│   │   ├── sanitize.py
│   │   ├── utils.py
│   │   ├── password_store.py
│   │   ├── lib/
│   │   │   ├── manager.py
│   │   │   ├── docker_executor.py
│   │   │   ├── status.py
│   │   │   ├── cleanup.py
│   │   │   ├── initialization.py
│   │   │   └── utils.py
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

The files in `dtaas_services/commands/` define the Click commands and
the high-level flows:

- `project_ops.py`: project scaffold generation (`project generate`).
- `host_ops.py`: TLS certificate and permission setup (`host setup`).
- `service_ops.py`: the service verbs (`install`, `start`, `stop`,
  `restart`, `status`, `remove`, `clean`).
- `install_helpers.py`: selector validation and the ThingsBoard and
  GitLab install flows used by `service install`.
- `user_ops.py`: user provisioning and password reset.
- `aliases.py`: deprecated top-level spellings that warn and forward to
  their `<noun> <verb>` replacement.

### Core Library Layer

The files in `dtaas_services/pkg/` hold reusable logic:

- `config.py`: environment and configuration loading.
- `template.py`: project scaffolding and template copying.
- `force_overwrite.py`: what `project generate --force` may replace,
  what it must never replace, and copies that preserve permissions.
- `cert.py`: certificate placement and normalization.
- `password_store.py`: tracks the current admin password of each
  supported service.
- `lib/*`: compose command execution and service state management.

### Service Modules Layer

`dtaas_services/pkg/services/` implements service-specific behaviour:

- `gitlab/`: health checks, root password setup, PAT creation, OAuth
  application setup and GitLab user provisioning.
- `thingsboard/`: setup, sysadmin and tenant workflows, and user setup
  from the credentials file.
- `influxdb/`, `rabbitmq.py`, `mongodb.py`, `postgres/`: permissions,
  readiness checks and account bootstrap routines.

### Shared GitLab Layer

`gitlab_common` holds GitLab operations that do not depend on the
deployment (`get_gitlab_client`, `validate_user_row`, `create_user`,
`create_user_pat`). Every function takes explicit arguments and changes
no environment, filesystem, console or process-global state.

Its single source of truth is `lib/gitlab_common/`, a standalone Poetry
package with its own tests. Each consumer **copies** it into its own
tree instead of depending on it:

```text
lib/gitlab_common/gitlab_common/     <-- edit and test here
        |  copied by dtaas_services/pkg/build.py
        v
dtaas_services/gitlab_common/        <-- gitignored, never committed
```

Run `poetry run python -m dtaas_services.pkg.build` before testing or
packaging. CI does this through `run-build-script: true`. It is a plain
script, not a Poetry build hook, because a hook makes poetry-core emit a
platform-specific wheel instead of `py3-none-any`. Copying the code
instead of using a path dependency keeps `dtaas-services` and the DTaaS
CLI independent of each other. It also keeps local paths out of the
published wheel metadata, which PyPI rejects.

Deployment-specific glue stays in `pkg/services/gitlab/`: URL derivation
from `GITLAB_PORT` and `HOSTNAME`, token-file persistence, docker health
checks and Rich console output. Two consequences are deliberate:

- `pkg/services/gitlab/_api.py` suppresses urllib3's
  `InsecureRequestWarning` when `SSL_VERIFY=false`. `gitlab_common` does
  not, so importing the shared module never silences warnings for
  unrelated consumers.
- `gitlab_common` defaults Personal Access Tokens to least-privilege
  repository-only scopes. `pkg/services/gitlab/users.py` asks for the
  broader `api` scope explicitly through `PatOptions`.

## Configuration Inputs

A generated project is driven by:

- `config/services.env`: ports, hostnames, SSL behaviour and service
  credentials.
- `config/credentials.csv`: user list (`username,password,email`).
- TLS certificates copied into the generated `certs/` layout.

The main GitLab-related environment variables are `HOSTNAME`,
`GITLAB_PORT`, `SSL_VERIFY` and `GITLAB_ROOT_NEW_PASSWORD`.

## Typical Workflow

1. Generate project files:
   - `dtaas-services project generate`
2. Edit configuration:
   - `config/services.env`
   - `config/credentials.csv`
3. Set up certs and permissions:
   - `dtaas-services host setup`
4. Start selected services:
   - `dtaas-services service start [-s ...]`
5. Run post-install setup where needed:
   - `dtaas-services service install -s thingsboard`
   - `dtaas-services service install -s gitlab`
6. Provision users:
   - `dtaas-services user add`

## Testing and Quality

The package uses pytest with strict markers, and test discovery starts
in `deploy/services/cli/tests`.

Run the checks from `deploy/services/cli`:

```bash
poetry install
poetry run python -m dtaas_services.pkg.build
CI=true poetry run pytest --ignore=tests/system_tests
```

The build step vendors `gitlab_common`; without it the tests cannot be
collected. The CLI checks for root before it validates arguments, so a
non-root run needs `CI=true`. The tests in `tests/system_tests` call
`docker` and are excluded here.

## Contributor Notes

- Keep command modules thin and put business logic in `pkg/`.
- Add service-specific behaviour in `pkg/services/<service>/` or peer
  modules, not in generic command handlers.
- Commands should print messages the user can act on, and should not
  leave partial side effects without reporting them.
- When adding service operations, include tests under
  `tests/test_services` and command-level tests under
  `tests/test_commands`.
