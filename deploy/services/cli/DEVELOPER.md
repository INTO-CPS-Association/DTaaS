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
poetry install
```

## Development Workflow

### Running Commands in Development

```bash
poetry run dtaas-services <command>
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

Run with coverage report:

```bash
poetry run pytest --cov=src --cov-report=html
```

### Building

```bash
poetry build
```

## Project Structure

```text
cli/
├── pyproject.toml          # Poetry configuration and dependencies
├── README.md               # User documentation
├── DEVELOPER.md            # This file
├── src/
│   ├── __init__.py
│   ├── cmd.py              # Main CLI commands
│   ├── compose.services.secure.yml  # Docker Compose configuration
│   ├── config/             # Configuration templates (bundled)
│   │   ├── services.env.template
│   │   └── credentials.csv.template
│   ├── data/               # Data directories structure (bundled)
│   └── pkg/
│       ├── __init__.py
│       ├── config.py       # Configuration loader
│       ├── setup.py        # Service setup logic
│       ├── utils.py        # Shared utilities (Docker commands)
│       ├── influxdb.py     # InfluxDB user management
│       └── rabbitmq.py     # RabbitMQ user management
└── tests/
    ├── __init__.py
    ├── test_cmd.py         # CLI command tests
    ├── test_config.py      # Configuration tests
    └── test_users.py       # User management tests
```

## Code Organization

### Shared Utilities (`pkg/utils.py`)

To avoid code duplication, common functionality is extracted into `utils.py`:

* `execute_docker_command()`: Execute commands in Docker containers with error handling
* `get_credentials_path()`: Get the path to the credentials CSV file

Both `influxdb.py` and `rabbitmq.py` use these utilities to eliminate
duplicated code.

### Error Handling Pattern

All service management functions follow a consistent error handling pattern:

* Return `tuple[bool, str]` - (success status, error message)
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

* `test_cmd.py` - Tests for CLI commands and argument parsing
* `test_config.py` - Tests for configuration loading and validation

### Testing Guidelines

#### Use Click's CliRunner

For testing CLI commands, use Click's `CliRunner` instead of subprocess:

```python
from click.testing import CliRunner
from src.cmd import services

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

@patch('src.pkg.utils.DockerClient')
def test_execute_docker_command(mock_docker):
    mock_docker.return_value.execute.return_value = "output"
    success, output = execute_docker_command("container", ["command"])
    assert success is True
```

### Test Coverage

Aim for high test coverage, especially for:

* Error handling paths
* User input validation
* Docker command execution
* Configuration parsing
* File operations

Run coverage reports to identify untested code:

```bash
poetry run pytest --cov=src --cov-report=term-missing
```
