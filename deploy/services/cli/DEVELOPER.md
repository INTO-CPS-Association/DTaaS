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

```bash
poetry run pytest
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
│   └── pkg/
│       ├── __init__.py
│       ├── config.py       # Configuration loader
│       ├── setup.py        # Service setup logic
│       ├── influxdb.py     # InfluxDB user management
│       └── rabbitmq.py     # RabbitMQ user management
└── tests/
    ├── __init__.py
    ├── test_cmd.py         # CLI command tests
    ├── test_config.py      # Configuration tests
    └── test_users.py       # User management tests
```

## Dependencies

### Core Dependencies

* **click**: CLI framework for command definitions and argument parsing
* **python-dotenv**: Environment variable management
* **python-on-whales**: Docker client library for container operations
