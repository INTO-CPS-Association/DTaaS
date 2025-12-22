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
│   ├── compose.services.secure.yml  # Docker Compose configuration (copied by build.py)
│   ├── config/             # Configuration files (copied by build.py)
│   │   ├── services.env.template
│   │   ├── credentials.csv.template
│   │   └── ...
│   ├── data/               # Data directories structure (copied by build.py)
│   │   ├── grafana/
│   │   ├── influxdb/
│   │   ├── mongodb/
│   │   └── rabbitmq/
│   └── pkg/
│       ├── __init__.py
│       ├── config.py       # Configuration loader
│       ├── service.py      # Docker Compose service management
│       ├── cert.py         # TLS certificate operations
│       ├── mongodb.py      # MongoDB certificate and permission setup
│       ├── influxdb.py     # InfluxDB certificate, permission, and user management
│       ├── rabbitmq.py     # RabbitMQ certificate, permission, and user management
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
    └── test_utils.py       # Utility functions tests
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

### Shared Utilities

#### System & Docker Operations (`pkg/utils.py`)

* `check_root_unix()`: Verify root/sudo privileges on Unix systems
* `execute_docker_command()`: Execute commands in Docker containers with error handling
* `get_credentials_path()`: Get the path to the credentials CSV file

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
  The default "/" vhost is NOT accessib, argument parsing, and command integration
* `test_config.py`: Tests for configuration loading and validation
* `test_service.py`: Tests for Docker Compose service management operations
* `test_cert.py`: Tests for certificate copying and normalization
* `test_formatter.py`: Tests for output formatting utilities
* `test_template.py`: Tests for project structure generation and template file management
* `test_utils.py`: Tests for shared utility functions (Docker operations, credentials path)

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

### Testing Guidelines

#### Use Click's CliRunner

For testing CLI commands, use Click's `CliRunner` instead of subprocess.

#### Mock External Dependencies

Always mock Docker, file system, and configuration operations:

```python
fromwith coverage reports:

```bash
poetry run pytest --cov=dtaas_services --cov-report=html --cov-report=term-missing
```

View detailed HTML coverage report:

```bash
# Coverage report generated in htmlcov/index.html
start htmlcov/index.html  # Windows
open htmlcov/index.html   # macOS
xdg-open htmlcov/index.html  # Linux
```

### Testing Best Practices

Focus test coverage on:

* **Error handling paths**: Test failure scenarios and error messages
* **User input validation**: Test command arguments and options
* **Docker command execution**: Mock Docker client for unit tests
* **Configuration parsing**: Test various config file formats and edge cases
* **File operations**: Use `tmp_path` fixture for file system tests
* **Business logic in `pkg/`**: Aim for near 100% coverage of utility functions

#### Testing Utilities vs CLI Commands

* **Utility functions** (`pkg/`): Test return values directly
* **CLI commands** (`cmd.py`): Use CliRunner to test command output and exit codes

#### Use Click's CliRunner (Repeated)

For testing CLI commands, use Click's `CliRunner` instead of subprocess.

#### Mock External Dependencies (Repated)

Always mock Docker, file system, and configuration operations to ensure tests are fast,
isolated, and don't require external services.

Aim for high test coverage, especially for:

* Error handling paths
* User input validation
* Docker command execution
* Configuration parsing
* File operations
