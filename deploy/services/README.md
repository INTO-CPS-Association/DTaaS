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

## Directory Structure

* **config** is used for storing the service configuration
* **data** is used by the services for storing data
* **certs** is used for storing the TLS certificates needed by the services.
* **cli** contains a CLI package for automated service management (recommended)
* **manual** contains manual scripts for service setup and user management

## Installation Methods

You can install and manage the services using either:

1. **CLI Package (Recommended):** Automated CLI tool for easy service management.
   See [cli/README.md](cli/README.md) for details.
2. **Manual Scripts:** Step-by-step manual installation and management.
   See [manual/README.md](manual/README.md) for details.

## Installation steps

### Using CLI Package (Recommended)

The CLI package provides an automated, user-friendly way to manage services.

1. Copy `config/services.env.template` into `config/services.env`.
2. Update `config/services.env` with the correct values for your environment.
3. Install and use the CLI tool:

```bash
cd deploy/services/cli
poetry install
poetry run dtaas-services setup
```

See [cli/README.md](cli/README.md) for detailed CLI usage.

### Using Manual Scripts

For manual installation using Python scripts:

1. Copy `config/services.env.template` into `config/services.env`.
2. Update `config/services.env` with the correct values for your environment.
3. Follow the manual installation steps in [manual/README.md](manual/README.md)

## Use

After the installation is complete, you can see the following services active
at the following ports / URLs.

| service | external url |
| :--- | :--- |
| RabbitMQ Broker | services.foo.com:8083 |
| RabbitMQ Broker Management Website | services.foo.com:8084 |
| MQTT Broker | services.foo.com:8085 |
| Influx | services.foo.com:8086 |
| MongoDB database | services.foo.com:8087 |
| Grafana | services.foo.com:8088 |

Please note that the TCP ports used by the services can be changed
by updating the `config/service.env` file and rerunning the docker commands.

The firewall and network access settings of corporate / cloud network
need to be configured to allow external access to the services.
Otherwise the users of DTaaS will not be able to utilize these
services from their user workspaces.

## New User Accounts

### Using CLI Package (Recommended)

Copy the user accounts template and add user account credentials:

```bash
cp config/credentials.csv.template config/credentials.csv
# edit credentials.csv
```

Add users to both InfluxDB and RabbitMQ:

```bash
cd deploy/services/cli
poetry run dtaas-services user add
```

### Using Manual Scripts

See [manual/README.md](manual/README.md) for manual user account creation steps.
