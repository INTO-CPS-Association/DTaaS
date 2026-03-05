# Platform Services

It is recommended to install certain third-party software for use
by digital twins running inside the DTaaS software.
_These services can only be installed in secure (TLS) mode._

The following services can be installed:

* **Influx** time-series database and dashboard service
* **Grafana** visualization and dashboard service
* **RabbitMQ** AMQP broker and its' management interface
  The **MQTT plugin** of this broker has been enabled.
  So, it can also be used as **MQTT** broker.
* **MongoDB** database server
* **ThingsBoard** IoT device management and data visualization platform
(with PostgreSQL backend)

## Directory Structure

* **config** is used for storing the service configuration
* **data** is used by the services for storing data
* **certs** is used for storing the TLS certificates needed by the services.
* **cli** contains a CLI package for automated service management

## Installation Methods

You can install and manage the services using:

**CLI Package :** Automated CLI tool for easy service management.

## DTaaS Services CLI

A command-line tool for managing DTaaS platform services including MongoDB,
InfluxDB, RabbitMQ, and Grafana.

## Features

* **Project Initialization:** Generate project structure with config and data directories
* **Automated Setup:** One command setup of TLS certificates and permissions
* **Service Management:** Start, stop, and check status of all services
* **User Management:** Easy creation of user accounts in InfluxDB,
RabbitMQ, and ThingsBoard
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
   * `compose.services.secure.yml` for main services
   * `compose.thingsboard.secure.yml` for ThingsBoard and PostgreSQL

2. Update `config/services.env` with your environment values:
   * `SERVICES_UID`: User ID for service file ownership
   * `SERVICES_GID`: Group ID for service file ownership
   * `SERVER_DNS`: Your server hostname
   * Port numbers for each service

3. Update `config/credentials.csv` with user accounts (format: `username,password`)

**Options:**

* `--path` Directory to generate project structure (default: current directory)

**Example:**

```bash
dtaas-services generate-project --path /path/to/project
```

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
* Set up PostgreSQL and ThingsBoard certificates and permissions

Make sure you run the clean command

### ThingsBoard Installation

To install ThingsBoard, run this command:

```bash
dtaas-services clean
```

```bash
#  (It starts PostgreSQL if it's not running, and it checks its health)
dtaas-services install
```

```bash
dtaas-services start -s thingsboard
```

```bash

#  After installation, wait some time before adding users
#  This creates the tenant, tenant admin and users.
dtaas-services user add -s thingsboard
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
dtaas-services remove -v
```

Clean all data and log files for services (with confirmation prompt):

```bash
dtaas-services clean
```

This command removes all files from data and log directories,
including `.gitkeep` files.
Useful for preparing to reinstall services or troubleshooting installation issues.

**Options:**

The start command is just an example, the options are for all commands listed above

* `-s, --services` Comma-separated list of specific services to manage
* `--volumes, -v` (remove command only) Remove volumes as well
* `--yes` (clean command only) Skip confirmation prompt

**Service Names:**

* Main platform services: `mongodb`, `grafana`, `influxdb`, `rabbitmq`
* PostgreSQL database: `postgres` or `postgresql`
* ThingsBoard IoT platform: `thingsboard` or `thingsboard-ce`

**Examples:**

```bash
# Start specific services
dtaas-services start -s influxdb,rabbitmq,thingsboard

# Start PostgreSQL
dtaas-services start -s postgresql

# Clean all services (removes all data and log files)
dtaas-services clean

# Clean specific service without confirmation
dtaas-services clean -s postgres --yes

# Clean multiple services
dtaas-services clean -s "postgres,thingsboard"
```

### User Account Management

1. Edit `config/credentials.csv` with user accounts (format: `username,password,email`)

2. Add users to services:

   ```bash
   dtaas-services user add
   ```

   This creates user accounts in InfluxDB, RabbitMQ, and ThingsBoard (if installed).
   For ThingsBoard, each user is created as a CUSTOMER_USER under a customer
   named after their username, within the tenant created during installation.

3. Add user to a specific service

   ```bash
   dtaas-services user add -s rabbitmq
   ```

### Reset Service Passwords

Reset the ThingsBoard sysadmin and tenant admin passwords using values
configured in `config/services.env`:

```bash
dtaas-services user reset-password -s thingsboard
```

This command:

* Changes the sysadmin password from the default to `TB_SYSADMIN_NEW_PASSWORD`
* Changes the tenant admin password from the default (`"tenant"`) to
  `TB_TENANT_ADMIN_PASSWORD`

## ThingsBoard

It is recommended to install the third-party software ThingsBoard
for use by digital twins
running inside the DTaaS software.
This service can only be installed in secure (TLS) mode.

The steps given above install two services:

* **ThingsBoard** is an IoT device management and data visualization platform
* **PostgreSQL** is a database server for ThingsBoard

## ThingsBoard Directory Structure

* **config** is used for storing the service configuration
* **data** is used by the services for storing data
* **log** is used by the services for logging
* **certs** is used for storing the TLS certificates needed by the services
* **script** contains scripts for creating user accounts and service management

## Troubleshooting

### Permission Issues (Linux/macOS)

If you encounter permission errors when setting up services,
ensure you run the setup command with appropriate privileges:

```bash
sudo -E env PATH="$PATH" dtaas-services setup
```

### Postgres Restarting

Make sure to run the clean command before starting postgres or installing thingsboard.

```bash
dtaas-services clean
```

### Thingsboard connection error

After starting thingsboard and before adding users or changing passwords,
it needs some time to initialize then you can add users.
