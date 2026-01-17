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

# Copy external files (config, data, compose) into the package
python build.py

# Install dependencies
poetry install
```

## Development Workflow

### Running Commands in Development

```bash
poetry run dtaas-services <command>
```

### Building

Before building, ensure external files are copied:

```bash
# Copy external files (config, data, compose) into the package
python build.py

# Build the wheel
poetry build
```

This creates distribution files in the `dist/` directory.

## Project Structure

```text
cli/
├── pyproject.toml          # Poetry configuration and dependencies
├── build.py                # Build script to copy external files
├── README.md               # User documentation
├── DEVELOPER.md            # This file
├── dtaas_services/         # Main package directory
│   ├── __init__.py
│   ├── cmd.py              # Main CLI commands
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
│   └── pkg/
│       ├── __init__.py
│       ├── config.py       # Configuration loader
│       ├── service.py      # Docker Compose service management
│       ├── cert.py         # TLS certificate operations
│       ├── mongodb.py      # MongoDB certificate and permission setup
│       ├── influxdb.py     # InfluxDB certificate, permission, and user management
│       ├── rabbitmq.py     # RabbitMQ certificate, permission, and user management
│       ├── thingsboard.py  # ThingsBoard admin user management and credentials processing
│       ├── thingsboard_users.py  # ThingsBoard authentication, password, and tenant management
│       ├── thingsboard_permissions.py  # ThingsBoard certificates and permissions setup
│       ├── formatter.py    # Output formatting utilities
│       ├── template.py     # Project structure and template file management
│       └── utils.py        # Shared utilities (Docker, file operations)
└── tests/
    ├── __init__.py
    ├── test_cmd.py         # CLI command tests
    ├── test_config.py      # Configuration tests
    ├── test_service.py     # Service management tests
    ├── test_cert.py        # Certificate operations tests
    ├── test_formatter.py   # Output formatting tests
    ├── test_template.py    # Project structure and template tests
    ├── test_utils.py       # Utility functions tests
    ├── test_thingsboard.py # ThingsBoard admin user management tests
    ├── test_thingsboard_users.py  # ThingsBoard authentication and tenant tests
    ├── test_thingsboard_permissions.py  # ThingsBoard certificates and permissions tests
    └── system_tests/       # End-to-end system tests
        └── test_services_commands.py  # Real CLI workflow tests
```

**Note:** Files marked as "copied by build.py" are generated during the build process
from the parent `deploy/services/` directory and are gitignored.

## Code Organization

### Architecture

The package uses a modular architecture where each service has its own module:

* **`config.py`**: Central configuration loader that handles environment variables
  and base directory detection across different OS platforms (Linux, macOS, Windows)

* **`service.py`**: Docker Compose service management:
  * `start_services()`: Start platform services
  * `stop_services()`: Stop platform services
  * `restart_services()`: Restart platform services
  * `remove_services()`: Remove platform services and optionally volumes
  * `get_status()`: Get status of platform services

* **`cert.py`**: TLS certificate operations:
  * `copy_certs()`: Copy certificates from source and normalize filenames

* **`mongodb.py`**: MongoDB setup:
  * `create_combined_cert()`: Create combined certificate file
  * `permissions_mongodb()`: Set certificate permissions and ownership

* **`influxdb.py`**: InfluxDB setup:
  * `permissions_influxdb()`: Set certificate permissions and ownership
  * `setup_influxdb_users()`: Create users, organizations, and buckets
  * `_create_influxdb_user()`: Create a single InfluxDB user
  * `_get_influxdb_users()`: Get list of InfluxDB users
  * `_get_existing_orgs()`: Get set of existing organization names
  * `_setup_user_org_bucket()`: Set up organization and bucket for a user

* **`rabbitmq.py`**: RabbitMQ setup:
  * `permissions_rabbitmq()`: Set certificate permissions and ownership
  * `setup_rabbitmq_users()`: Create users and vhosts (user-specific only)
  * `_add_rabbitmq_user()`: Add a user to RabbitMQ with vhost and permissions

* **`thingsboard.py`**: ThingsBoard admin user management and credentials processing:
  * `setup_thingsboard_users()`: Create tenants and tenant admins from credentials.csv
  * `thingsboard_configure()`: Main configuration function for user setup
  * `_check_admin_exists()`: Check if admin user already exists
  * `_create_tenant_admin_user()`: Create tenant admin user
  * `_get_activation_token()`: Get activation token for user
  * `_activate_user()`: Activate user with password
  * `_create_and_activate_admin()`: Create and activate admin user
  * `_ensure_tenant_admin()`: Ensure tenant admin exists
  * `_create_tenant_and_admin()`: Create tenant and its admin user
  * `_process_credentials_row()`: Process a single credential row from CSV
  * `_process_credentials_file()`: Process credentials file and create tenants

* **`thingsboard_users.py`**: ThingsBoard authentication, password, and tenant management:
  * `build_base_url()`: Build ThingsBoard base URL from environment variables
  * `login()`: Authenticate with ThingsBoard API
  * `change_sysadmin_password_if_needed()`: Update default sysadmin password
  * `_check_password_configured()`: Check if new password is configured
  * `_try_login_with_new_password()`: Try logging in with new password
  * `_update_session_token()`: Update session with authorization token
  * `_change_password_api_call()`: Call API to change password
  * `_perform_password_change()`: Perform the password change operation
  * `_check_existing_tenant()`: Check if tenant already exists
  * `_create_new_tenant()`: Create a new tenant
  * `_get_or_create_tenant()`: Get existing tenant or create a new one

* **`thingsboard_permissions.py`**: ThingsBoard certificates and permissions setup:
  * `permissions_thingsboard()`: Set up PostgreSQL and ThingsBoard certificates and permissions
  * `_setup_postgres_certs()`: Set up PostgreSQL certificates with proper permissions
  * `_setup_thingsboard_certs()`: Set up ThingsBoard certificates with proper permissions
  * `_setup_thingsboard_directories()`: Set up ThingsBoard data and log directories with proper ownership
  * `_verify_certificates_exist()`: Verify normalized certificates exist
  * `_set_directory_ownership()`: Set ownership for directory and all its contents
  * `_copy_service_cert_files()`: Copy service certificate files
  * `_set_service_cert_file_permissions()`: Set permissions on service certificate files

### Shared Utilities

#### System & Docker Operations (`pkg/utils.py`)

* `check_root_unix()`: Verify root/sudo privileges on Unix systems
* `execute_docker_command()`: Execute commands in Docker containers with error handling
* `get_credentials_path()`: Get the path to the credentials CSV file
* `process_credentials_file()`: Generic pattern for processing credentials file
* `create_users_from_credentials()`: Generic function to create users from CSV

#### Project Structure & Templates (`pkg/template.py`)

* `copy_directory_or_file()`: Copy files or directories with error handling
* `copy_template_to_config()`: Copy template files to actual config files
* `generate_project_structure()`: Generate complete project structure with
config and data directories

### Code Organization Pattern

The project follows a clean separation between CLI interface and business logic:

#### CLI Layer (`cmd.py`)

* Thin command definitions using Click decorators
* Argument parsing and validation
* User-facing output formatting
* Minimal business logic - delegates to `pkg/` modules

#### Business Logic Layer (`pkg/`)

* All core functionality implemented in dedicated modules
* Pure functions that return results (success/failure, messages)
* Independent, testable units
* No direct CLI output (returns strings for CLI to display)

This separation ensures:

* Easy testing of business logic without CLI context
* Reusability of functions across different commands
* Clear responsibility boundaries

### Configuration Pattern

Each module that needs configuration imports and instantiates `Config()` internally,
keeping each module self-contained and independent.

### Service Configuration

The `Service` class automatically loads environment variables from `config/services.env`
and sets them in `os.environ` before calling Docker Compose. This ensures all
Docker Compose variables are properly configured without additional setup.

### Setup Workflow

The CLI provides a two-phase setup workflow:

#### Phase 1: Setup (`dtaas-services setup`)

* Copies and normalizes TLS certificates
* Sets up certificate permissions and ownership
* Creates required data and log directories
* Configures all services (MongoDB, InfluxDB, RabbitMQ, ThingsBoard, PostgreSQL)
* No service startup or database initialization

#### Phase 2: ThingsBoard Installation (Optional, `dtaas-services install-thingsboard`)

* Requires PostgreSQL to be running (must be started manually)
* Initializes ThingsBoard database schema (one-time operation)
* Creates default system administrator account
* Separate command to ensure PostgreSQL is healthy before initialization

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

#### ThingsBoard Users

* **Tenant Management**: Each credential entry creates a separate tenant in ThingsBoard
* **Admin Creation**: A tenant admin user is created for each tenant using the provided
  credentials
* **Credentials File**: ThingsBoard users are created from `config/credentials.csv`
  using the `dtaas-services user add` command
* `test_config.py`: Tests for configuration loading and validation
* `test_service.py`: Tests for Docker Compose service management operations
* `test_cert.py`: Tests for certificate copying and normalization
* `test_formatter.py`: Tests for output formatting utilities
* `test_template.py`: Tests for project structure generation and template file management
* `test_utils.py`: Tests for shared utility functions
  (Docker operations, credentials path)

### Error Handling Pattern

All service management functions follow a consistent error handling pattern:

* Return `tuple[bool, str]`: (success status, message)
* Check success of all operations before continuing
* Provide detailed error messages for debugging
* Stop execution on first failure to prevent inconsistent state

## Dependencies

### Core Dependencies

* **click**: CLI framework for command definitions and argument parsing
* **python-dotenv**: Environment variable management
* **python-on-whales**: Docker client library for container operations

## Testing

### Test Structure

Tests are organized to mirror the source code structure:

* `test_cmd.py`: Tests for CLI commands and argument parsing
* `test_config.py`: Tests for configuration loading and validation
* `test_service.py`: Tests for Docker Compose service management operations
* `test_cert.py`: Tests for certificate copying and normalization
* `test_mongodb.py`: Tests for MongoDB certificate and permission setup
* `test_influxdb.py`: Tests for InfluxDB certificate, permission, and user management
* `test_rabbitmq.py`: Tests for RabbitMQ certificate, permission, and user management
* `test_thingsboard.py`: Tests for ThingsBoard setup and installation
* `test_formatter.py`: Tests for output formatting utilities
* `test_template.py`: Tests for project structure generation and template file management
* `test_utils.py`: Tests for shared utility functions

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

#### Configuration

System tests use the actual `services.env` configuration file located at:

```bash
deploy/services/config/services.env
```

This file contains real service credentials and configurations used during testing.

## Running Tests with Coverage

Run all tests with coverage reports:

```bash
poetry run pytest --cov=dtaas_services --cov-report=html --cov-report=term-missing
```

### Test Coverage

Aim for high test coverage, especially for:

* Error handling paths
* User input validation
* Docker command execution
* Configuration parsing
* File operations
