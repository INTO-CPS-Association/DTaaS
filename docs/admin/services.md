# Third-party Services

The DTaaS software platform uses third-party software services
to provide enhanced value to users.

InfluxDB, Grafana, RabbitMQ and MongoDB are default services
integrated into the DTaaS software platform.

## Pre-requisites

All these services run on raw TCP/UDP ports. Thus a direct network
access to these services is required for both the DTs running inside
the DTaaS software and the PT located outside the DTaaS software.

There are two possible choices here:

* Configure Traefik gateway to permit TCP/UDP traffic
* Bypass Traefik altogether

Unless you are an informed user of Traefik, we recommend bypassing traefik
and provide raw TCP/UDP access to these services from the Internet.

_The InfluxDB service requires a dedicated hostname. The management
interface of RabbitMQ service requires a dedicated hostname as well._

Grafana service can run well behind Traefik gateway. The default Traefik
configuration makes permits access to Grafana at URL: http(s): _foo.com/vis_.

## Configure and Install

If you have not cloned the DTaaS git repository, cloning would be
the first step.
In case you already have the codebase, you can skip the cloning step.
To clone, do:

```bash
git clone https://github.com/into-cps-association/DTaaS.git
cd DTaaS/deploy/services
```

### Option 1: Using the CLI (Recommended)

The DTaaS provides a CLI tool for easy services management.

#### Installation

First, install the CLI using Poetry:

```bash
cd cli
poetry install
```

#### Configuration

Copy the configuration template and update it with your settings:

```bash
cp manual/config/services.env.template manual/config/services.env
# Edit services.env with your configuration
```

Update the following required variables in `services.env`:

- `HOSTNAME`: Your server hostname
- `CERTS_SRC`: Path to TLS certificates
- UID/GID values for services
- Admin credentials for services

#### Setup and Start Services

Run the setup command to initialize and start all services:

```bash
poetry run dtaas-services setup
```

This command will:

- Copy TLS certificates
- Configure MongoDB, InfluxDB, and RabbitMQ
- Set proper file permissions
- Start all services using Docker Compose

Note: On Linux/MacOS, this command must be run as root.

#### Alternative: Start Services Only

If services are already configured, you can just start them:

```bash
poetry run dtaas-services start
```

### Option 2: Manual Installation

For manual installation instructions, see the
[manual installation guide](manual/README.md).

## Use

After the installation is complete, you can see the following services active
at the following ports / URLs.

| service | external url |
|:---|:---|
| RabbitMQ Broker | services.foo.com:8083 |
| RabbitMQ Broker Management Website | services.foo.com:8084 |
| MQTT Broker | services.foo.com:8085 |
| Influx | services.foo.com:8086 |
| MongoDB database | services.foo.com:8087 |
| Grafana | services.foo.com:8088 |

Please note that the TCP ports used by the services can be changed
by updating the `config/services.env` file and rerunning the setup.

The firewall and network access settings of corporate / cloud network need to be
configured to allow external access to the services. Otherwise the users of DTaaS
will not be able to utilize these services from their user workspaces.

## Add Service Users

To add users to InfluxDB and RabbitMQ services:

1. Create a credentials file from the template:

   ```bash
   cd cli
   cp manual/config/credentials.csv.template manual/config/credentials.csv
   # Edit credentials.csv with user accounts
   ```

2. Add users using the CLI:

   ```bash
   poetry run dtaas-services user add
   ```

This will create user accounts in both InfluxDB and RabbitMQ services,
along with their respective organizations, buckets, and vhosts.

