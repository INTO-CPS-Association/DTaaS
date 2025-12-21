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
│       └── utils.py        # Shared utilities (Docker commands, credentials)
└── tests/
    ├── __init__.py
    ├── test_cmd.py         # CLI command tests
    ├── test_config.py      # Configuration tests
    └── test_users.py       # User management tests
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
  * `create_combined_pem()`: Create combined certificate file
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

### Shared Utilities (`pkg/utils.py`)

Common functionality is extracted to avoid code duplication:

* `check_root_unix()`: Verify root/sudo privileges on Unix systems
* `execute_docker_command()`: Execute commands in Docker containers with error handling
* `get_credentials_path()`: Get the path to the credentials CSV file

### Configuration Pattern

Each module that needs configuration imports and instantiates `Config()` internally:

```python
def permissions_mongodb() -> Tuple[bool, str]:
    config = Config()
    base_dir = Config.get_base_dir()
    # Use config values as needed
```

This keeps each module self-contained and independent.

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
  The default "/" vhost is NOT accessible to prevent permission conflicts.
* **Full Permissions**: Users have complete permissions (`.*`, `.*`, `.*`) on their
  own vhost for configure, write, and read operations.

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

For testing CLI commands, use Click's `CliRunner` instead of subprocess:

```python
from click.testing import CliRunner
from dtaas_services.cmd import services

def test_generate_project():
    runner = CliRunner()
    with runner.isolated_filesystem():
        result = runner.invoke(services, ['generate-project'])
        assert result.exit_code == 0
```

#### Mock External Dependencies

Always mock Docker, file system, and configuration operations:

```python
from unittest.mock import Mock, patch

@patch('dtaas_services.pkg.utils.DockerClient')
def test_execute_docker_command(mock_docker):
    mock_docker.return_value.execute.return_value = "output"
    success, output = execute_docker_command("container", ["command"])
    assert success is True
```

### Running Tests

Run all tests:

```bash
poetry run pytest
```

Run specific test file:

```bash
poetry run pytest tests/test_config.py
```

Run coverage reports to identify untested code:

```bash
poetry run pytest --cov=dtaas_services --cov-report=html --cov-report=term-missing
```

#### Test Coverage

Aim for high test coverage, especially for:

* Error handling paths
* User input validation
* Docker command execution
* Configuration parsing
* File operations
