# Developer Guide

This guide covers development setup, testing, and contribution workflows
for the DTaaS Services CLI package.

## Development Setup

### Prerequisites

* Python 3.10 or higher
* Poetry package manager
* Docker and Docker Compose
* Git

### Setup

```bash
cd DTaaS/deploy/services/cli
python -m venv venv
venv\Scripts\activate
pip install poetry

# Install dependencies
poetry install
```

## Development Workflow

### Running Commands in Development

```bash
poetry run dtaas-services <command>
```

## Project Structure

```text
cli/
├── pyproject.toml          # Poetry configuration and dependencies
├── README.md               # User documentation
├── DEVELOPER.md            # This file
├── templates/              # Template source files (mirrors dtaas_services/templates/)
│   ├── compose.services.yml
│   ├── compose.thingsboard.yml
│   ├── compose.gitlab.yml
│   ├── certs/
│   ├── config/
│   │   ├── services.env.template
│   │   ├── credentials.csv.template
│   │   ├── mongod.conf.secure
│   │   ├── influxdb/
│   │   ├── rabbitmq/           # rabbitmq.conf + rabbitmq.enabled_plugins
│   │   └── gitlab/
│   ├── data/
│   │   ├── grafana/
│   │   ├── gitlab/
│   │   ├── influxdb/
│   │   ├── mongodb/
│   │   ├── postgres/
│   │   ├── rabbitmq/
│   │   └── thingsboard/
│   └── log/
│       ├── gitlab/
│       └── thingsboard/
├── dtaas_services/         # Main package directory
│   ├── __init__.py
│   ├── cmd.py              # CLI entry point (imports from commands/)
│   ├── commands/           # CLI command modules
│   │   ├── __init__.py
│   │   ├── service_ops.py  # Service lifecycle commands (start, stop, restart, status, remove, clean)
│   │   ├── setup_ops.py    # Setup commands (generate-project, setup, install)
│   │   ├── user_ops.py     # User management commands (user add, user reset-password)
│   │   └── utility.py      # Command utilities
│   ├── templates/          # Package-bundled templates used by generate-project (committed)
│   └── pkg/
│       ├── __init__.py
│       ├── config.py       # Configuration loader
│       ├── cert.py         # TLS certificate operations
│       ├── formatter.py    # Output formatting utilities
│       ├── password_store.py # Tracks current service passwords in current.passwords.env
│       ├── template.py     # Project structure and template file management
│       ├── utils.py        # Shared utilities (Docker, file operations)
│       ├── lib/            # Core service management
│       │   ├── __init__.py
│       │   ├── manager.py  # Docker Compose service management
│       │   ├── docker_executor.py  # Docker command execution
│       │   ├── initialization.py   # Service initialization
│       │   ├── status.py   # Service status operations
│       │   ├── cleanup.py  # Service cleanup operations
│       │   └── utils.py    # Library utilities
│       └── services/       # Service-specific modules
│           ├── mongodb.py  # MongoDB certificate and permission setup
│           ├── rabbitmq.py # RabbitMQ certificate, permission, and user management
│           ├── influxdb/   # InfluxDB service module
│           │   ├── __init__.py
│           │   ├── _utils.py       # Shared Docker command wrapper and JSON parsing
│           │   ├── influxdb.py     # Certificate, permissions, and setup orchestration
│           │   └── user_management.py  # User, org, and bucket management
│           ├── postgres/   # PostgreSQL service module
│           │   ├── __init__.py
│           │   ├── postgres.py     # Certificate setup and readiness waiting
│           │   └── status.py       # Container health and state checking
│           └── thingsboard/
│          │    ├── __init__.py
│          │    ├── activation.py    # Shared user activation utilities
│          │    ├── customer_user.py # Customer and customer user creation
│          │    ├── setup.py         # ThingsBoard setup orchestration
│          │    ├── setup_credentials.py # Credential file processing for customer users
│          │    ├── sysadmin.py      # Sysadmin authentication and password management
│          │    ├── sysadmin_util.py  # Tenant management and sysadmin email operations
│          │    ├── tenant_admin.py  # Tenant admin provisioning and password reset
│          │    ├── checker.py       # Installation checking
│          │    ├── permissions.py   # Certificate setup
│          │    ├── tb_cert.py       # Certificate operations
│          │    └── tb_utility.py
│          └── gitlab/     # GitLab service module
│               ├── __init__.py
│               ├── _api.py         # python-gitlab client factory
│               ├── app_token.py    # OAuth application creation, listing, and deletion
│               ├── health.py       # Container health checking and readiness waiting
│               ├── password.py     # Root password retrieval and reset
│               ├── personal_token.py  # Personal Access Token creation via gitlab-rails
│               ├── setup.py        # Full post-install orchestration
│               └── users.py        # User creation from credentials.csv
└── tests/
    ├── __init__.py
    ├── test_cert.py
    ├── test_config.py
    ├── test_formatter.py
    ├── test_template.py
    ├── test_utils.py
    ├── test_commands/
    │   ├── __init__.py
    │   ├── conftest.py
    │   ├── test_cmd.py
    │   ├── test_service_ops.py
    │   ├── test_setup_ops.py
    │   └── test_user_ops.py
    ├── test_lib/
    │   ├── __init__.py
    │   ├── test_initialization.py
    │   ├── test_utils.py
    │   ├── test_docker_executor.py
    │   ├── test_manager.py
    │   ├── test_status.py
    │   └── test_cleanup.py
    ├── test_services/
    │   ├── __init__.py
    │   ├── test_mongodb.py
    │   ├── test_rabbitmq.py
    │   ├── test_influxdb/
    │   │   ├── __init__.py
    │   │   ├── test_utils.py
    │   │   ├── test_influxdb.py
    │   │   └── test_user_management.py
    │   ├── test_postgres/
    │   │   ├── __init__.py
    │   │   ├── test_postgres.py
    │   │   └── test_status.py
    │   ├── test_thingsboard/
    │   │   ├── __init__.py
    │   │   ├── test_permissions.py
    │   │   ├── test_setup.py
    │   │   ├── test_setup_credentials.py
    │   │   ├── test_reset_password.py
    │   │   ├── test_sysadmin.py
    │   │   ├── test_sysadmin_util.py
    │   │   ├── test_checker.py
    │   │   ├── test_tb_cert.py
    │   │   ├── test_tb_utility.py
    │   │   └── test_tenant_admin.py
    │   └── test_gitlab/
    │       ├── __init__.py
    │       ├── test_api.py
    │       ├── test_app_token.py
    │       ├── test_health.py
    │       ├── test_password.py
    │       ├── test_personal_token.py
    │       ├── test_setup.py
    │       └── test_users.py
    ├── config/             # Test configuration files (REQUIRED for system tests)
    │   ├── services.env    # Test environment variables
    │   └── credentials.csv # Test user credentials
    └── system_tests/       # End-to-end system tests
        └── test_services_commands.py  # Real CLI workflow tests
```

**Note:** `dtaas_services/templates/` is generated during the build process by copying
`cli/templates/` and is gitignored. Edit source files in `cli/templates/` instead.

## Code Organization

### Architecture

The package uses a modular, three-layer architecture:

#### Command Layer (`commands/`)

* **`service_ops.py`**: Service lifecycle commands (start, stop, restart, status,
 remove, clean)
* **`setup_ops.py`**: Setup and installation commands (generate-project, setup,
 install)
* **`user_ops.py`**: User management commands (`user add`, `user reset-password`)
* **`utility.py`**: Shared command utilities

#### Business Logic Layer (`pkg/`)

* **`config.py`**: Configuration loader for environment variables and base
 directory detection
* **`cert.py`**: TLS certificate copying and normalization
* **`formatter.py`**: Output formatting utilities
* **`password_store.py`**: Read/write access to `config/current.passwords.env`;
  tracks the last-known password for each service account so that
  `reset-password` can be run repeatedly
* **`template.py`**: Project structure and template file management
* **`utils.py`**: Shared utilities (Docker operations, credentials handling)
* **`lib/`**: Core service management modules
  * `manager.py`: Docker Compose service management
  * `docker_executor.py`: Docker command execution
  * `initialization.py`: Service initialization
  * `status.py`: Service status operations
  * `cleanup.py`: Service cleanup operations
  * `utils.py`: Library utilities

#### Service Layer (`pkg/services/`)

* **`mongodb.py`**: MongoDB certificate and permission setup

* **`rabbitmq.py`**: RabbitMQ certificate, permission, and user management

* **`influxdb/`**: InfluxDB service module
  * `_utils.py`: Shared Docker command wrapper (`execute_influxdb_command`)
  and JSON parsing
  * `influxdb.py`: Certificate permissions and setup orchestration
  * `user_management.py`: User, organisation, and bucket management

* **`postgres/`**: PostgreSQL service module
  * `postgres.py`: Certificate setup and readiness waiting
  * `status.py`: Container health and state checking

* **`thingsboard/`**: ThingsBoard modules
  * `activation.py`: Shared user activation utilities (token extraction,
    activation API calls)
  * `customer_user.py`: Customer and CUSTOMER_USER creation from credentials.csv
  * `setup.py`: Setup orchestration (creates tenant and admin, authenticates
    as tenant admin, password reset)
  * `setup_credentials.py`: Credential file processing (CSV parsing, customer
    user creation from credentials.csv)
  * `sysadmin.py`: Sysadmin authentication and password management
  * `sysadmin_util.py`: Tenant management and sysadmin email operations
  * `tenant_admin.py`: Tenant admin user provisioning and password reset
  * `checker.py`: Installation validation
  * `permissions.py`: Certificate setup
  * `tb_cert.py`: Certificate operations
  * `tb_utility.py`: ThingsBoard utility helpers

  * **`gitlab/`**: GitLab service module
  * `_api.py`: `python-gitlab` client factory; builds an authenticated
    `gitlab.Gitlab` instance from environment variables (`HOSTNAME`,
    `GITLAB_PORT`, `SSL_VERIFY`)
  * `app_token.py`: OAuth application creation, listing, and deletion
    via `python-gitlab`; used during post-install to register the DTaaS client
  * `health.py`: Container health polling and readiness waiting;
    exports `is_gitlab_running()` for pre-flight checks and
    `is_gitlab_healthy()` for non-blocking health status queries
  * `password.py`: Reads the auto-generated root password from
    `/etc/gitlab/initial_root_password` and resets it to
    `GITLAB_ROOT_NEW_PASSWORD` via the API
  * `personal_token.py`: Creates the initial root Personal Access Token
    via `docker exec gitlab gitlab-rails runner`;
    saves the result to `config/gitlab_tokens.json`
  * `setup.py`: Post-install orchestration — checks health (non-blocking),
    and when healthy: resets password, creates PAT, and registers
    the OAuth application. Returns immediately with a status hint
    if GitLab is still starting.
  * `users.py`: Creates GitLab user accounts from `config/credentials.csv`
    using `python-gitlab` and the root PAT

### Configuration Pattern

Each module that needs configuration imports and instantiates `Config()` internally,
keeping each module self-contained and independent.

### Service Configuration

The `Service` class automatically loads environment variables from `config/services.env`
and sets them in `os.environ` before calling Docker Compose. This ensures all
Docker Compose variables are properly configured without additional setup.

#### Key Environment Variables

* **`HOSTNAME`**: Used for ThingsBoard API URL and GitLab `external_url`
  configuration. Must match the certificate domain name for SSL to work.
  TLS certificates are stored in the flat `certs/` directory (not
  `certs/<HOSTNAME>/`).
* **`SSL_VERIFY`**: Enable/disable SSL certificate verification for API calls
(`True` or `False`).
  Set to `False` for development with self-signed certificates.
* **`THINGSBOARD_PORT`**: ThingsBoard API port (default: 8080)
* **`THINGSBOARD_SCHEME`**: Protocol for ThingsBoard API (`http` or `https`,
default: `https`)
* **`GITLAB_PORT`**: Port the local GitLab container listens on (default: `8090`);
  must be set before any `gitlab/` module function is called
* **`GITLAB_ROOT_NEW_PASSWORD`**: Strong password to apply to the GitLab `root`
  admin account during post-install setup

#### ThingsBoard SSL Configuration

ThingsBoard API calls use the `SSL_VERIFY` setting from `config/services.env`:

* **Development**: Set `SSL_VERIFY=False` to use self-signed certificates
* **Production**: Set `SSL_VERIFY=True` for proper SSL certificate verification
* **Auto-detection**: The CLI automatically applies this setting to all API calls

If SSL verification fails, the error message will indicate the current setting
and how to change it in `services.env`.

### Cleanup and Reset

#### Clean Command (`dtaas-services clean`)

Removes data and log files for services, useful for resetting to a clean state:

* **Basic clean**: `dtaas-services clean` - Removes data and log files
* **With certificates**: `dtaas-services clean --certs` - Also removes TLS certificates
* **Specific services**: `dtaas-services clean -s mongodb,influxdb`

**Note**: Services must be stopped before cleaning. The command will prompt
for confirmation before deleting files.

#### Remove Command (`dtaas-services remove`)

Stops and removes Docker containers:

* **Basic remove**: `dtaas-services remove` - Removes containers
* **With volumes**: `dtaas-services remove -v` - Also removes Docker volumes

### User Management Best Practices

#### InfluxDB Users

* **Organisation Management**: Always check for existing organisations before creating
  new ones to avoid conflicts. Use `_get_existing_orgs()` before creating.
* **User Ownership**: Users are added as **owners** (not members) of their
  organisations using the `--owner` flag, giving them full administrative rights.
* **User-specific Resources**: Each user gets their own organisation and bucket
  with the same name as their username.

#### RabbitMQ Users

* **Vhost Isolation**: Each user only has access to their own vhost (username-based).
  The default "/" vhost is NOT accessible to regular users;
  only administrators should use it.
* **Automatic Retry**: User creation includes retry logic with 4-second delays
  and up to 2 retry attempts to handle timing issues when RabbitMQ is still
  initialising after startup.
* **Error Handling**: "Already exists" errors are handled gracefully and do not
  cause the operation to fail.

#### GitLab Users

* **Prerequisites**: `dtaas-services install -s gitlab` must be run to
  complete post-install setup (health check → password reset → PAT creation).
  The install command is non-blocking: if GitLab is still starting it returns
  immediately with a status hint. Re-run the command once
  `dtaas-services status -s gitlab` shows the container as healthy.
  The PAT stored in `config/gitlab_tokens.json` is used for all subsequent API calls.
* **Credentials File**: GitLab users are created from `config/credentials.csv`
  (columns: `username`, `password`, `email`) using `dtaas-services user add -s gitlab`.
* **Per-user PATs**: After creating each user, the CLI creates a Personal Access
  Token for that user via the `python-gitlab` admin API with scopes `api`,
  `read_repository`, `write_repository` and a 1-year expiry. Tokens for newly created
  users are written to
  `config/gitlab_user_tokens.json`.
* **Root user**: The `root` admin account (user ID `1`) is created automatically
  by GitLab Omnibus on first boot. DTaaS does not create it — it only reads the
  auto-generated password and resets it to `GITLAB_ROOT_NEW_PASSWORD`.
  During `dtaas-services install -s gitlab`, the root password is automatically
  changed to `GITLAB_ROOT_NEW_PASSWORD` and recorded in
  `config/current.passwords.env`.
* **Password Reset**: The root password can be reset independently using
  `dtaas-services user reset-password -s gitlab`, which reads
  `GITLAB_ROOT_NEW_PASSWORD` from `config/services.env` and updates the account
  via the `python-gitlab` library. The new password is saved to
  `config/current.passwords.env` on success.
* **Token Storage**: The Personal Access Token created during install is written
  to `config/gitlab_tokens.json`. All user-management API calls load the PAT from
  this file at runtime.

#### ThingsBoard Users

* **Install**: Running `dtaas-services install` only initialises the ThingsBoard
  database schema. It does NOT create the tenant or tenant admin. After install,
  start ThingsBoard manually.
* **User Add**: Running `dtaas-services user add -s thingsboard` first
  authenticates as sysadmin, creates the initial tenant and tenant admin
  (using `TB_TENANT_TITLE` and `TB_TENANT_ADMIN_EMAIL` from
  `config/services.env`, with the default password `"tenant"`), then
  authenticates as the tenant admin and creates CUSTOMER_USER accounts
  from `config/credentials.csv`
* **Authentication**: The `user add` command authenticates as the tenant admin
  (tries default password `"tenant"` first, falls back to
  `TB_TENANT_ADMIN_PASSWORD`)
* **Password Reset**: Running `dtaas-services user reset-password -s thingsboard`
  resets both the sysadmin password (to `TB_SYSADMIN_NEW_PASSWORD`)
  and the tenant admin password (to `TB_TENANT_ADMIN_PASSWORD`).
  Passwords can be reset as many times as needed — the current password
  is tracked in `config/current.passwords.env` so subsequent resets
  always know the correct current password.
  If sysadmin password change fails, the tenant admin change still proceeds.
* **SSL Configuration**: ThingsBoard API calls use TLS verification controlled by
  the `SSL_VERIFY` environment variable (from `services.env`) and use
  verification enabled by default. For self-signed certificates in non-production
  environments, set `SSL_VERIFY=false`.

### Password Store (`config/current.passwords.env`)

The file `config/current.passwords.env` tracks the current passwords for
ThingsBoard sysadmin, ThingsBoard tenant admin, and GitLab root accounts.
It is managed by `pkg/password_store.py`.

* **Created** automatically on first write (by `save_password`); do not create
  or edit this file manually.
* **Updated** automatically whenever a password is changed via
  `dtaas-services user reset-password` or during
  `dtaas-services install -s gitlab`.
* **Cleaned** when a service is removed via `dtaas-services remove`.
  Only entries belonging to the removed service are deleted.

### Error Handling Pattern

All service management functions follow a consistent error handling pattern:

* Return `tuple[bool, str]`: (success status, message)
* Check success of all operations before continuing
* Provide detailed error messages for debugging
* Stop execution on first failure to prevent inconsistent state

## Testing

### Testing Guidelines

#### Use Click's CliRunner

For testing CLI commands, use Click's `CliRunner` instead of subprocess.

#### Mock External Dependencies

Always mock Docker, file system, and configuration operations.

### CI and GitHub Workflow Testing

The project uses GitHub Actions to automatically run tests
on every commit and pull request.
Understanding how tests behave in CI is important for
ensuring the changes pass checks.

#### Environment Differences

Tests automatically detect CI environments using `is_ci()` in `pkg/utils.py`
and adjust behaviour:

* **Certificate handling**:
  * CI auto-generates dummy self-signed certificates (no real certs required)
  * Local uses real TLS certificates from the system (or dummy)

* **File permissions**:
  * Skipped in CI to avoid permission errors in read-only environments
  * Applied locally on POSIX systems (Linux, macOS) via `_is_posix_not_ci()`

* **Test constants**:
  * Use defined constants like `TEST_PASSWORD` for test credentials
  * Never hardcode password literals like `"pass"` to avoid security warnings
  * Add `# noqa: S105 # SONAR` comment to suppress security checks for test constants

#### Troubleshooting CI Failures

If tests pass locally but fail in CI:

* **Path separators**: Use `pathlib.Path` instead of string paths
(handles `/` vs `\` automatically)
* **Platform differences**: CI runs Ubuntu Linux; check for OS-specific assumptions
* **Permissions**: Ensure permission-setting code is wrapped in `if _is_posix_not_ci()`
* **Hardcoded values**: Check for hardcoded paths, ports,
or environment variable assumptions

### System Tests

The `tests/system_tests/` directory contains end-to-end tests that verify the complete
CLI workflow with real Docker containers and services. These tests are designed
to accelerate the pull request process by catching integration issues early.

#### Purpose

System tests execute actual `dtaas-services` commands against real Docker containers,
validating:

* Complete service lifecycle (setup → start → stop → restart)
* Service state transitions and Docker container status
* Multi-service operations and isolation
* Proper error handling and exit codes

This provides confidence that the entire system works as intended before PR review,
reducing back-and-forth iterations and review cycles.

#### Running System Tests

Run only system tests:

```bash
poetry run pytest tests/system_tests -v
```

Run system tests with specific markers:

```bash
poetry run pytest -m system -v
```

Run all tests including system tests:

```bash
poetry run pytest -v
```

#### System Test Examples

The test suite covers critical workflows:

* **Full Setup and Start**: Verify all services start correctly
  with setup → start → status
* **Selective Service Operations**: Start/stop individual services
  while keeping others running
* **Multiple Service Operations**: Stop multiple services simultaneously
  and verify isolation
* **Service Cycling**: Complete start → stop → start workflow for service restarts

#### Key Characteristics

* **Real Execution**: Tests run actual CLI commands, not mocks
* **Docker Integration**: Validates real container states using Docker API
* **Isolated Test Runs**: Each test performs its own setup and cleanup to ensure
  independent test execution
* **State Assertions**: Properly handles Docker container state transitions
  (e.g., "running", "restarting", "stopped", "exited")

#### Configuration Requirements

System tests require configuration files in the `tests/config/` directory:

* `tests/config/services.env`
* `tests/config/credentials.csv`

**No Setup Required:**

The configuration files are pre-configured with test-safe dummy credentials
and are ready to use immediately.

## Running Tests with Coverage

Run all tests with coverage reports:

```bash
poetry run pytest tests --cov=dtaas_services --cov-report=html --cov-report=term-missing
```

The system tests can be ignored for quick testing

```bash
poetry run pytest tests --ignore=tests\system_tests  --cov=dtaas_services --cov-report=html --cov-report=term-missing
```

### Test Coverage

Aim for high test coverage, especially for:

* Error handling paths
* User input validation
* Docker command execution
* Configuration parsing
* File operations

## Building the package

```bash
poetry build
```

The built wheel and sdist are written to `cli/dist/`.
