# DTaaS Services CLI

A command-line tool for managing DTaaS platform services including MongoDB,
InfluxDB, RabbitMQ, and Grafana.

## Features

* **Project Initialization:** Generate project structure with config and data directories
* **Automated Setup:** One command setup of TLS certificates and permissions
* **Service Management:** Start, stop, and check status of all services
* **User Management:** Easy creation of user accounts in InfluxDB and RabbitMQ
* **Cross platform:** Works on Linux, macOS, and Windows
* **Configuration-driven:** Reads settings from `config/services.env`

## Installation

### Prerequisites

* Python 3.10 or higher
* Docker and Docker Compose
* TLS certificates

### Install from Wheel Package

Install the standalone wheel package using pip:

```bash
pip install dtaas_services-0.1.0-py3-none-any.whl
```

This installs the `dtaas-services` command.

To verify the installation:

```bash
dtaas-services --help
```

## Quick Start

1. Navigate to where you want to set up the services and generate the project
structure and run:

   ```bash
   dtaas-services generate-project
   ```

   This creates:
   * `config/` directory with configuration templates
   * `data/` directory for service data
   * `compose.services.secure.yml` for Docker Compose

2. Update `config/services.env` with your environment values:
   * `SERVICES_UID` - User ID for service file ownership
   * `SERVICES_GID` - Group ID for service file ownership
   * `SERVER_DNS` - Your server hostname
   * Port numbers for each service

3. Update `config/credentials.csv` with user accounts (format: `username,password`)

## Usage

### Service Setup

After generating the project and configuring your settings:

```bash
dtaas-services setup
```

This command will:

* Copy TLS certificates to the correct locations
* Set up MongoDB certificates and permissions
* Set up InfluxDB certificates and permissions
* Set up RabbitMQ certificates and permissions

**Permission Requirements:**

This command requires access to the Docker daemon. You have two options:

1. **Recommended:** Add your user to the docker group (run once):

   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

   Then run the command without sudo:

   ```bash
   dtaas-services setup
   ```

2. **Alternative:** Run with sudo:

   ```bash
   sudo dtaas-services setup
   ```

### Service Management

Start all services:

```bash
dtaas-services start
```

Stop all services:

```bash
dtaas-services stop
```

Restart services:

```bash
dtaas-services restart
```

Check service status:

```bash
dtaas-services status
```

Remove services (with confirmation prompt):

```bash
dtaas-services remove
```

Remove services and their volumes:

```bash
dtaas-services remove --volumes
```

### User Account Management

1. Edit `config/credentials.csv` with user accounts (format: `username,password`)

2. Add users to InfluxDB and RabbitMQ:

   ```bash
   dtaas-services user add
   ```

   This will create user accounts with appropriate permissions in both services.

## Commands Reference

### `dtaas-services generate-project`

Generates the project structure with config, data directories, and compose file.

**Options:**

* `--path` - Directory to generate project structure (default: current directory)

**Example:**

```bash
dtaas-services generate-project --path /path/to/project
```

### `dtaas-services setup`

Performs complete service setup including certificates and permissions.

**Example:**

```bash
dtaas-services setup
```

### `dtaas-services start`

Starts all platform services using Docker Compose.

**Options:**

* `-s, --services` - Comma-separated list of specific services to start

**Examples:**

```bash
# Start all services
dtaas-services start

# Start specific services
dtaas-services start --services influxdb,rabbitmq
```

### `dtaas-services stop`

Stops all running platform services.

**Options:**

* `-s, --services` - Comma-separated list of specific services to stop

**Examples:**

```bash
# Stop all services
dtaas-services stop

# Stop specific services
dtaas-services stop -s mongodb,grafana
```

### `dtaas-services restart`

Restarts platform services.

**Options:**

* `-s, --services` - Comma-separated list of specific services to restart

**Examples:**

```bash
# Restart all services
dtaas-services restart

# Restart specific services
dtaas-services restart --services influxdb
```

### `dtaas-services remove`

Removes platform services and optionally their volumes.
Prompts for confirmation before removal.

**Note:** When volumes are removed with `--volumes`, the data directories are
automatically recreated empty to ensure successful reinstallation of services.

**Options:**

* `-s, --services` - Comma-separated list of specific services to remove
* `-v, --volumes` - Remove volumes as well (data will be deleted
but directories preserved)

**Examples:**

```bash
# Remove all services (with confirmation)
dtaas-services remove

# Remove specific services
dtaas-services remove --services influxdb,rabbitmq

# Remove all services and their volumes
dtaas-services remove --volumes

# Remove specific services with volumes
dtaas-services remove -s mongodb -v
```

### `dtaas-services status`

Shows the current status of all services.

**Options:**

* `-s, --services` - Comma-separated list of specific services to check

**Examples:**

```bash
# Show status of all services
dtaas-services status

# Show status of specific services
dtaas-services status --services influxdb
```

### `dtaas-services user add`

Adds user accounts to InfluxDB and RabbitMQ from `config/credentials.csv`.

**Example:**

```bash
dtaas-services user add
```

## Troubleshooting

### Permission Issues (Linux/macOS)

If you encounter permission errors when setting up services,
ensure you run the setup command with appropriate privileges:

```bash
sudo -E env PATH="$PATH" dtaas-services setup
```

### Docker Connection Issues

Ensure Docker daemon is running:

```bash
docker ps
```
