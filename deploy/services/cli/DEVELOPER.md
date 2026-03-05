# DTaaS Services CLI - Developer Guide

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
├── build.py                # Build script to copy external files
├── README.md               # User documentation
├── DEVELOPER.md            # This file
├── dtaas_services/         # Main package directory
│   ├── __init__.py
│   ├── cmd.py              # CLI entry point (imports from commands/)
│   ├── commands/           # CLI command modules
│   │   ├── __init__.py
│   │   ├── service_ops.py  # Service lifecycle commands (start, stop, restart, status, remove, clean)
│   │   ├── setup_ops.py    # Setup commands (generate-project, setup, install)
│   │   ├── user_ops.py     # User management commands (user add, user reset-password)
│   │   └── utility.py      # Command utilities
│   ├── compose.services.secure.yml  # Main services Docker Compose configuration (copied by build.py)
│   ├── compose.thingsboard.secure.yml  # ThingsBoard and PostgreSQL Docker Compose configuration (copied by build.py)
│   ├── config/             # Configuration files (copied by build.py)
│   │   ├── services.env.template
│   │   ├── credentials.csv.template
│   │   └── ...
│   ├── data/               # Data directories structure (copied by build.py)
│   │   ├── grafana/
│   │   ├── influxdb/
│   │   ├── mongodb/
│   │   ├── postgres/
│   │   ├── rabbitmq/
│   │   └── thingsboard/
│   ├── log/                # Log directory structure (copied by build.py)
│   └── pkg/
│       ├── __init__.py
│       ├── config.py       # Configuration loader
│       ├── cert.py         # TLS certificate operations
│       ├── formatter.py    # Output formatting utilities
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
│               ├── __init__.py
│               ├── activation.py    # Shared user activation utilities
│               ├── customer_user.py # Customer and customer user creation
│               ├── setup.py         # ThingsBoard setup orchestration
│               ├── sysadmin.py      # System admin operations
│               ├── tenant_admin.py  # Tenant admin provisioning and password reset
│               ├── checker.py       # Installation checking
│               ├── permissions.py   # Certificate setup
│               ├── tb_cert.py       # Certificate operations
│               └── tb_utility.py
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
    │   │   ├── test_utils.py           # Tests for _utils.py
    │   │   ├── test_influxdb.py        # Tests for influxdb.py
    │   │   └── test_user_management.py # Tests for user_management.py
    │   ├── test_postgres/
    │   │   ├── __init__.py
    │   │   ├── test_postgres.py        # Tests for postgres.py
    │   │   └── test_status.py          # Tests for status.py
    │   └── test_thingsboard/
    │       ├── __init__.py
    │       ├── test_activation.py
    │       ├── test_customer_user.py
    │       ├── test_permissions.py
    │       ├── test_setup.py
    │       ├── test_reset_password.py
    │       ├── test_sysadmin.py
    │       ├── test_checker.py
    │       ├── test_tb_cert.py
    │       ├── test_tb_utility.py
    │       ├── test_tenant_admin_compose.py
    │       └── test_tenant_admin_user.py
    ├── config/             # Test configuration files (REQUIRED for system tests)
    │   ├── services.env    # Test environment variables
    │   └── credentials.csv # Test user credentials
    └── system_tests/       # End-to-end system tests
        └── test_services_commands.py  # Real CLI workflow tests
```

**Note:** Files marked as "copied by build.py" are generated during the build process
from the parent `deploy/services/` directory and are gitignored.

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
    as tenant admin, processes credentials file)
  * `sysadmin.py`: System admin operations
  * `tenant_admin.py`: Tenant admin user provisioning and password reset
  * `checker.py`: Installation validation
  * `permissions.py`: Certificate setup
  * `tb_cert.py`: Certificate operations
  * `tb_utility.py`: ThingsBoard utility helpers

### Configuration Pattern

Each module that needs configuration imports and instantiates `Config()` internally,
keeping each module self-contained and independent.

### Service Configuration

The `Service` class automatically loads environment variables from `config/services.env`
and sets them in `os.environ` before calling Docker Compose. This ensures all
Docker Compose variables are properly configured without additional setup.

#### Key Environment Variables

* **`HOSTNAME`**: Used for certificate paths (`certs/<HOSTNAME>/`)
and ThingsBoard API URL.
  Must match certificate domain name for SSL to work.
* **`SSL_VERIFY`**: Enable/disable SSL certificate verification for API calls
(`True` or `False`).
  Set to `False` for development with self-signed certificates.
* **`THINGSBOARD_PORT`**: ThingsBoard API port (default: 8080)
* **`THINGSBOARD_SCHEME`**: Protocol for ThingsBoard API (`http` or `https`,
default: `https`)

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

* **Organization Management**: Always check for existing organizations before creating
  new ones to avoid conflicts. Use `_get_existing_orgs()` before creating.
* **User Ownership**: Users are added as **owners** (not members) of their
  organizations using the `--owner` flag, giving them full administrative rights.
* **User-specific Resources**: Each user gets their own organization and bucket
  with the same name as their username.

#### RabbitMQ Users

* **Vhost Isolation**: Each user only has access to their own vhost (username-based).
  The default "/" vhost is NOT accessible to regular users;
  only administrators should use it.
* **Automatic Retry**: User creation includes retry logic with 4-second delays
  and up to 2 retry attempts to handle timing issues when RabbitMQ is still
  initializing after startup.
* **Error Handling**: "Already exists" errors are handled gracefully and do not
  cause the operation to fail.

#### ThingsBoard Users

* **Install**: Running `dtaas-services install` only initializes the ThingsBoard
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
  resets both the sysadmin password (from default to `TB_SYSADMIN_NEW_PASSWORD`)
  and the tenant admin password (from `"tenant"` to `TB_TENANT_ADMIN_PASSWORD`).
* **SSL Configuration**: ThingsBoard API calls use TLS verification controlled by
  the `SSL_VERIFY` environment variable (from `services.env`) and use
  verification enabled by default. For self-signed certificates in non-production
  environments, set `SSL_VERIFY=false`.

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
ensuring your changes pass checks.

#### Environment Differences

Tests automatically detect CI environments using `is_ci()` in `pkg/utils.py`
and adjust behavior:

* **Certificate handling**:
  * CI auto-generates dummy self-signed certificates (no real certs required)
  * Local uses real TLS certificates from your system (or dummy)

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

You can ignore the system tests for quick testing

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

Finally to build the pip package run

```bash
poetry build
```

Then you can find the whl package in cli\dist.
