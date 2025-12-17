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
* Start all services using Docker Compose

### Service Management

Start all services:

```bash
dtaas-services start
```

Stop all services:

```bash
dtaas-services stop
```

Check service status:

```bash
dtaas-services status
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

Performs complete service setup including certificates, permissions, and startup.

**Example:**

```bash
dtaas-services setup
```

### `dtaas-services start`

Starts all platform services using Docker Compose.

**Example:**

```bash
dtaas-services start
```

### `dtaas-services stop`

Stops all running platform services.

**Example:**

```bash
dtaas-services stop
```

### `dtaas-services status`

Shows the current status of all services.

**Example:**

```bash
dtaas-services status
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
