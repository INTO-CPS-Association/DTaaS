# DTaaS Services CLI

A command-line tool for managing DTaaS platform services including MongoDB,
InfluxDB, RabbitMQ, and Grafana.

## Features

* **Automated Setup:** One-command setup of TLS certificates and permissions
* **Service Management:** Start, stop, and check status of all services
* **User Management:** Easy creation of user accounts in InfluxDB and RabbitMQ
* **Cross-platform:** Works on Linux, macOS, and Windows
* **Configuration-driven:** Reads settings from `config/services.env`

## Installation

### Prerequisites

* Python 3.10 or higher
* Poetry package manager
* Docker and Docker Compose
* TLS certificates in the `certs/` directory

### Install Dependencies

```bash
cd deploy/services/cli
poetry install
```

## Configuration

1. Copy the services configuration template:

   ```bash
   cp ../config/services.env.template ../config/services.env
   ```

2. Update `../config/services.env` with your environment values:
   * `SERVICES_UID` - User ID for service file ownership
   * `SERVICES_GID` - Group ID for service file ownership
   * `SERVER_DNS` - Your server hostname
   * Port numbers for each service

## Usage

### Service Setup

Run the complete setup process (certificates, permissions, and service startup):

```bash
poetry run dtaas-services setup
```

This command will:

* Copy TLS certificates to the correct locations
* Set up MongoDB certificates and permissions
* Set up InfluxDB certificates and permissions
* Set up RabbitMQ certificates and permissions
* Start all services using Docker Compose

### Service Management

Start all services:

```bash
poetry run dtaas-services start
```

Stop all services:

```bash
poetry run dtaas-services stop
```

Check service status:

```bash
poetry run dtaas-services status
```

### User Account Management

1. Create a credentials file:

   ```bash
   cp ../config/credentials.csv.template ../config/credentials.csv
   ```

2. Edit `../config/credentials.csv` with user accounts (format: `username,password`)

3. Add users to InfluxDB and RabbitMQ:

   ```bash
   poetry run dtaas-services user add
   ```

## Commands Reference

### `dtaas-services setup`

Performs complete service setup including certificates, permissions, and startup.

**Example:**

```bash
poetry run dtaas-services setup
```

### `dtaas-services start`

Starts all platform services using Docker Compose.

**Example:**

```bash
poetry run dtaas-services start
```

### `dtaas-services stop`

Stops all running platform services.

**Example:**

```bash
poetry run dtaas-services stop
```

### `dtaas-services status`

Shows the current status of all services.

**Example:**

```bash
poetry run dtaas-services status
```

### `dtaas-services user add`

Adds user accounts to InfluxDB and RabbitMQ from `config/credentials.csv`.

**Example:**

```bash
poetry run dtaas-services user add
```

## Development

### Running Tests

```bash
poetry run pytest tests
```

### Code Structure

```
cli/
├── pyproject.toml          # Poetry configuration and dependencies
├── src/
│   ├── cmd.py              # Main CLI commands
│   └── pkg/
│       ├── config.py       # Configuration loader
│       ├── setup.py        # Service setup logic
│       ├── influxdb.py     # InfluxDB user management
│       ├── rabbitmq.py     # RabbitMQ user management
│       └── utils.py        # Utility functions
└── tests/
    ├── test_cmd.py         # CLI command tests
    ├── test_config.py      # Configuration tests
    └── test_utils.py       # Utility function tests
```
