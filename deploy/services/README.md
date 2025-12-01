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
* **script** contains scripts for creating user accounts

## Installation steps

Please follow the steps outlined here for installation.
`script/service_setup.py`, is provided to streamline the setup of TLS certificates
and permissions for MongoDB, InfluxDB, and RabbitMQ services.

The script has the following features:

* **Automation:** Automates all manual certificate and permission steps for
 MongoDB, InfluxDB, and RabbitMQ as described above.
* **Cross-platform:** Works on Linux, macOS, and Windows.
* **Configuration-driven:** Reads all required user IDs, group IDs, and hostnames
from `config/services.env`.

### Create Config

1. Copy `config/services.env.template` into `config/services.env`.
2. Update `config/services.env` with the correct values for your environment.
3. Run the script with root privilege.

### Install

Install Python dependencies before running the script:

```bash
pip install -r script/requirements.txt
```

Run the installation script

```bash
cd deploy/services
sudo python3 script/service_setup.py
```

The script will:

* Combine and set permissions for MongoDB certificates.
* Copy and set permissions for InfluxDB and RabbitMQ certificates.
* Use the correct UID/GID values from `config/services.env`.
* Start the Docker Compose services automatically after setup.

If any required variable is missing, the script will exit with an error message.

This automation reduces manual errors and ensures your service containers have
the correct certificate files and permissions for secure operation.

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
by updating the `config/service.env` file and rerunning the docker commands.

The firewall and network access settings of corporate / cloud network
need to be configured to allow external access to the services.
Otherwise the users of DTaaS will not be able to utilize these
services from their user workspaces.

## New User Accounts

There are ready to use scripts for adding accounts in **InfluxDB** and
**RabbitMQ** services.

Copy the user accounts template and add user account credentials.

```bash
cp config/credentials.csv.template config/credentials.csv
# edit credentials.csv file
```

Use the following commands to add new users to **InfluxDB** service.

```bash
# on host machine
docker cp script/influxdb.py influxdb:/influxdb.py
docker cp config/credentials.csv influxdb:/credentials.csv
docker exec -it influxdb bash
# inside docker container
python3 influxdb.py
```

Use the following commands to add new users to **RabbitMQ** service.

```bash
# on host machine
docker cp script/rabbitmq.py rabbitmq:/rabbitmq.py
docker cp config/credentials.csv rabbitmq:/credentials.csv
docker exec -it rabbitmq bash
# inside docker container
python3 rabbitmq.py
```
