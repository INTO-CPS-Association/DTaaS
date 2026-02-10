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
│   ├── log/                # Log directory structure (copied by build.py)
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
│       ├── thingsboard_utility.py  # ThingsBoard user activation helpers
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

The package uses a modular architecture where each service has its own module:

* **`config.py`**: Central configuration loader for environment variables
  and base directory detection across OS platforms
* **`service.py`**: Docker Compose service management
(start, stop, restart, remove, status, clean)
* **`cert.py`**: TLS certificate copying and normalization
* **`mongodb.py`**: MongoDB certificate setup
* **`influxdb.py`**: InfluxDB certificate setup and user management
* **`rabbitmq.py`**: RabbitMQ certificate setup and user management
* **`thingsboard.py`**: ThingsBoard tenant and user management from credentials.csv
* **`thingsboard_users.py`**: ThingsBoard authentication and password management
* **`thingsboard_permissions.py`**: ThingsBoard and PostgreSQL certificate setup
* **`formatter.py`**: Output formatting utilities
* **`template.py`**: Project structure and template file management
* **`utils.py`**: Shared utilities (Docker operations, credentials handling)

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

### Setup Workflow

The CLI provides a multi-phase setup workflow:

#### Phase 1: Setup (`dtaas-services setup`)

* Copies and normalizes TLS certificates to `certs/<HOSTNAME>/`
* Sets up certificate permissions and ownership
* Creates required data and log directories
* Configures all services (MongoDB, InfluxDB, RabbitMQ, ThingsBoard, PostgreSQL)
* No service startup or database initialization

#### Phase 2: ThingsBoard Installation (`dtaas-services install`)

* Automatically starts PostgreSQL if not already running
* Initializes ThingsBoard database schema (one-time operation)
* Creates default system administrator account

#### Phase 3: Start Services (`dtaas-services start`)

* Starts all platform services
* Use `-s <service>` to start specific services

#### Phase 4: Add Users (`dtaas-services user add`)

* Creates users in InfluxDB, RabbitMQ, and ThingsBoard
* Reads credentials from `config/credentials.csv`

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

* **Tenant Management**: Each credential entry creates a separate tenant in ThingsBoard
* **Admin Creation**: A tenant admin user is created for each tenant using the provided
  credentials
* **Credentials File**: ThingsBoard users are created from `config/credentials.csv`
  using the `dtaas-services user add` command
* **SSL Configuration**: ThingsBoard API calls use TLS verification controlled by the
  `SSL_VERIFY` environment variable (from `services.env`) and use verification enabled
  by default. For self-signed certificates in non-production environments, set
  `SSL_VERIFY=false`.

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
* **httpx**: HTTP client for ThingsBoard API communication

## Testing

### Test Structure

Tests are organized to mirror the source code structure in the `tests/` directory.
Each module in `pkg/` has a corresponding test file
(e.g., `test_config.py` for `config.py`).

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
poetry run pytest --cov=dtaas_services --cov-report=html --cov-report=term-missing
```

You can ignore the system tests for quick testing

```bash
poetry run pytest --cov=dtaas_services --ignore=tests\system_tests --cov-report=term-missing
```

### Test Coverage

Aim for high test coverage, especially for:

* Error handling paths
* User input validation
* Docker command execution
* Configuration parsing
* File operations
