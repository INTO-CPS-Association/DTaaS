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
* **GitLab** OAuth2 identity provider and Git repository service

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
InfluxDB, RabbitMQ, Grafana, ThingsBoard, and GitLab.

## Features

* **Project Initialization:** Generate project structure with config and data directories
* **Automated Setup:** One command setup of TLS certificates and permissions
* **Service Management:** Start, stop, and check status of all services
* **User Management:** Easy creation of user accounts in InfluxDB,
RabbitMQ, ThingsBoard, and GitLab
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
pip install dtaas_services-0.3.0-py3-none-any.whl
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
   * `compose.services.yml` for main services
   * `compose.thingsboard.yml` for ThingsBoard and PostgreSQL

2. Update `config/services.env` with your environment values:
   * `HOSTNAME`: Public hostname of the DTaaS server (used for certificate paths)
   * `GITLAB_PORT`: Port for the local GitLab instance (default: `8090`)
   * `GITLAB_ROOT_NEW_PASSWORD`: Strong password to set for the GitLab root admin
   * `TB_SYSADMIN_NEW_PASSWORD`: New password for the ThingsBoard system admin
   * Port numbers for each service
   * `TB_TENANT_NEW_PASSWORD`: New password for the tenant admin
   * `SERVICES_UID`: User ID for service file ownership
   * `SERVICES_GID`: Group ID for service file ownership

3. Update `config/credentials.csv` with user accounts (format: `username,password,email`)

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
dtaas-services install -s thingsboard
```

```bash
dtaas-services start -s thingsboard
```

```bash

#  After installation, wait some time before adding users
#  This creates the tenant, tenant admin and users.
dtaas-services user add -s thingsboard
```

### GitLab Installation

**Prerequisites:**

* The DTaaS server must be running before starting GitLab, as the GitLab
  container uses the `dtaas-frontend` Docker network.
* Set `REACT_APP_AUTH_AUTHORITY` in the client config file
  (`deploy/config/client/env.js` for server deployments, or
  `deploy/config/client/env.local.js` for localhost) to
  `https://<hostname>/gitlab`.

> **Note:** The DTaaS client uses `react-oidc-context`, which forces
> redirects to use HTTPS. GitLab must therefore be served over HTTPS —
> either at `https://<hostname>/gitlab` or `https://localhost/gitlab`.

To install and configure the local GitLab instance:

```bash
dtaas-services install -s gitlab
```

GitLab takes 5–10 minutes to become healthy after the first start.
The install command checks GitLab’s readiness and returns immediately:

* **If GitLab is healthy**: the command runs post-install setup
  (password reset, PAT creation, OAuth app registration) and
  saves the access token to `config/gitlab_tokens.json`.
* **If GitLab is still starting**: the command prints a status hint
  and exits. Check progress with `dtaas-services status -s gitlab`
  and re-run `dtaas-services install -s gitlab` once the status
  shows "healthy".

> **Warning:** `config/current.passwords.env` is managed automatically by
> the CLI and tracks the current service passwords. Do **not** edit or delete
> this file manually — doing so may cause password reset commands to fail.

To complete the OAuth2 integration with DTaaS and set up GitLab Runner,
follow the [integration guide](../gitlab/INTEGRATION.md) and
[runner setup guide](../runner/GITLAB-RUNNER.md).

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
* GitLab instance: `gitlab`

**Examples:**

```bash
# Start specific services
dtaas-services start -s influxdb,rabbitmq,thingsboard

# Start PostgreSQL
dtaas-services start -s postgresql

# Start GitLab
dtaas-services start -s gitlab

# Clean all services (removes all data and log files)
dtaas-services clean

# Clean specific service without confirmation
dtaas-services clean -s postgres --yes

# Clean multiple services
dtaas-services clean -s "postgres,thingsboard"
```

### User Account Management

1. Edit `config/credentials.csv` with user accounts (format: `username,password,email`)

2. Add users to all supported services:

   ```bash
   dtaas-services user add
   ```

   This creates user accounts in InfluxDB, RabbitMQ, ThingsBoard, and GitLab
   (each service is skipped gracefully if it is not running).
   For GitLab, a Personal Access Token is created for each new user and
   saved to `config/gitlab_user_tokens.json`.

3. Add users to a specific service:

   ```bash
   dtaas-services user add -s rabbitmq
   dtaas-services user add -s gitlab
   ```

### Reset Service Passwords

Reset the ThingsBoard sysadmin and tenant admin passwords using values
configured in `config/services.env`:

```bash
dtaas-services user reset-password -s thingsboard
```

This command:

* Changes the sysadmin password from the default (`"sysadmin"`) to `TB_SYSADMIN_NEW_PASSWORD`
* Changes the tenant admin password from the default (`"tenant"`) to
  `TB_TENANT_ADMIN_PASSWORD`

Reset the GitLab root admin password using the value configured in
`config/services.env` (`GITLAB_ROOT_NEW_PASSWORD`):

```bash
dtaas-services user reset-password -s gitlab
```

The command reads the new password from `GITLAB_ROOT_NEW_PASSWORD`
and applies it via the GitLab API.

Reset passwords for all supported services at once:

```bash
dtaas-services user reset-password
```

Services that are not currently running are skipped with a warning.

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

## GitLab Post-Install Flow

The `dtaas-services install -s gitlab` command performs the following steps
automatically:

1. Starts the GitLab Docker container
2. Checks if GitLab is healthy (non-blocking — exits immediately if not ready)
3. Reads the auto-generated root password from the container
   (`/etc/gitlab/initial_root_password`)
4. Creates an initial Personal Access Token and saves it to
   `config/gitlab_tokens.json`
5. Creates Server and Client OAuth application tokens.

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
