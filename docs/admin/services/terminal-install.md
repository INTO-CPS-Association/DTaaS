# Platform Services

It is recommended to install certain third-party software for use
by digital twins running inside the DTaaS platform.
_These services can only be installed in secure (TLS) mode._

The following services can be installed:

* **PostgresSQL**: SQL database server
* **ThingsBoard**: is an Internet of Things (IoT)
  device management and data visualization platform
* **Influx** time-series database and dashboard service
* **Grafana** visualization and dashboard service
* **RabbitMQ** AMQP broker and its' management interface
  The **MQTT plugin** of this broker has been enabled.
  So, it can also be used as **MQTT** broker.
* **MongoDB** NoSQL database server

## Pre-requisites

All these services run on raw TCP/UDP ports. Thus a direct network
access to these services is required for both the DTs running inside
the DTaaS platform and the PT located outside the platform.

There are two possible choices here:

* Configure Traefik gateway to permit TCP/UDP traffic
* Bypass Traefik altogether

Unless you are an informed user of Traefik, we recommend bypassing traefik
and provide raw TCP/UDP access to these services from the Internet.

## Directory and File Structure

* **config** is used for storing the service configuration
* **data** is used by the services for storing data
* **certs** is used for storing the TLS certificates needed by the services.
* **script** contains scripts for installation of services and
  creation of user accounts
* **log** contains service logs for ThingsBoard service
* _compose.services.secure.yml_ helps with installation of RabbitMQ, MongoDB,
  Grafana and InfluxDB services.
* _compose.thingsboard.secure.yml_ helps with installation of PostgreSQL, and
  ThingsBoard services.

There are two additional directories, namely **GitLab** and **runner**.
These directories are related to installation of
[integrated GitLab](../gitlab/index.md) and its [runner](../gitlab/runner.md).
The instructions in this page are not related to **GitLab** and **runner**
installation.

## Clone Codebase

If the DTaaS git repository has not been cloned, cloning is
the first step.
If the codebase already exists, the cloning step can be skipped.
To clone:

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS/deploy/services
```

The steps outlined here should be followed for installation.
The `services.foo.com` website hostname is used for illustration.
This should be replaced with the appropriate server hostname.
These steps assume that the DTaaS repository has been downloaded
and navigation to the `deploy/services` directory has been completed.

## Create Common Config

1. Copy `config/services.env.template` into `config/services.env`.
2. Update `config/services.env` with suitable values for your environment.

Take special care in setting strong passwords.

## Install PostgreSQL and ThingsBoard

### Configure

* Obtain the TLS certificates from LetsEncrypt and copy them.

  ```bash
  cp -R /etc/letsencrypt/archive/services.foo.com certs/.
  mv certs/services.foo.com/privkey1.pem certs/services.foo.com/privkey.pem
  mv certs/services.foo.com/fullchain1.pem certs/services.foo.com/fullchain.pem
  ```

* Adjust permissions of certificates for PostgreSQL user in docker container.

  ```bash
  cp certs/services.foo.com/privkey.pem \
    certs/services.foo.com/postgres.key
  cp certs/services.foo.com/fullchain.pem \
    certs/services.foo.com/postgres.crt
  chown 999:999 certs/services.foo.com/postgres.key \
    certs/services.foo.com/postgres.crt
  chmod 600 certs/services.foo.com/postgres.key
  chmod 644 certs/services.foo.com/postgres.crt
  ```

* Adjust permissions of certificates for ThingsBoard user in docker container.

  ```bash
  cp certs/services.foo.com/privkey.pem \
    certs/services.foo.com/thingsboard-privkey.pem
  cp certs/services.foo.com/fullchain.pem \
    certs/services.foo.com/thingsboard-fullchain.pem
  chown 799:799 certs/services.foo.com/thingsboard-*.pem
  chmod 600 certs/services.foo.com/thingsboard-privkey.pem
  chmod 644 certs/services.foo.com/thingsboard-fullchain.pem
  ```

* Set required permissions for ThingsBoard data and log directories.

  ```bash
  chown -R 799:799 data/thingsboard
  chown -R 799:799 log/thingsboard
  ```

### Install

* Start PostgreSQL and run ThingsBoard install.

  ```bash
  docker compose -f compose.thingsboard.secure.yml \
    --env-file config/services.env \
    up -d postgres
  docker compose -f compose.thingsboard.secure.yml \
    --env-file config/services.env \
    run --rm -e INSTALL_TB=true -e LOAD_DEMO=false thingsboard-ce
  ```

Once ThingsBoard is installed, the service can be started.

* Start or stop services.
  
  ```bash
  docker compose -f compose.thingsboard.secure.yml \
    --env-file config/services.env up -d thingsboard-ce
  docker compose -f compose.thingsboard.secure.yml \
    --env-file config/services.env down thingsboard-ce
  ```

### Add New User Accounts for ThingsBoard

The password for the default ThingsBoard system admin should be changed
as soon as possible.
The following commands can be used to change the password
and add a new tenant to the **ThingsBoard** service.

```bash
chmod +x script/thingsboard.py
python3 -m venv .venv
source .venv/bin/activate
pip install requests
python3 script/thingsboard.py
```

### Troubleshooting

If the PostgreSQL logs show errors like:

* `ERROR: relation "ts_kv" does not exist`
* `ERROR: relation "ts_kv_latest" does not exist`

this usually means that the ThingsBoard service started before the database
schema was fully created.

To fix this:

1. Stop all services:

   ```bash
   docker compose -f compose.thingsboard.secure.yml \
     --env-file config/services.env down
   ```

2. Delete the data folders:

   ```bash
   rm -rf data/thingsboard/*
   rm -rf data/postgres/*
   rm -rf log/thingsboard/*
   ```

3. Start PostgreSQL and run ThingsBoard install again:

   ```bash
   docker compose -f compose.thingsboard.secure.yml \
     --env-file config/services.env up -d postgres
   docker compose -f compose.thingsboard.secure.yml \
     --env-file config/services.env \
     run --rm -e INSTALL_TB=true -e LOAD_DEMO=false thingsboard-ce
   ```

## Installation Steps for Other Services

Please follow the steps outlined here for installation.
`script/service_setup.py`, is provided to streamline the setup of TLS certificates
and permissions for MongoDB, InfluxDB, and RabbitMQ services.

The script has the following features:

* **Automation:** Automates all manual certificate and permission steps for
 MongoDB, InfluxDB, and RabbitMQ as described above.
* **Cross-platform:** Works on Linux, macOS, and Windows.
* **Configuration-driven:** Reads all required user IDs, group IDs, and hostnames
from `config/services.env`.

### Run Install Script

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

| service                            | external url          |
| :--------------------------------- | :-------------------- |
| RabbitMQ Broker                    | services.foo.com:8083 |
| RabbitMQ Broker Management Website | services.foo.com:8084 |
| MQTT Broker                        | services.foo.com:8085 |
| Influx                             | services.foo.com:8086 |
| PostgreSQL                         | services.foo.com:5432 |
| MongoDB database                   | services.foo.com:8087 |
| Grafana                            | services.foo.com:8088 |
| ThingsBoard                        | services.foo.com:8089 |

Please note that the TCP ports used by the services can be changed
by updating the `config/service.env` file and rerunning the docker commands.

The firewall and network access settings of corporate / cloud network
need to be configured to allow external access to the services.
Otherwise the users of the DTaaS platform will not be able to utilize these
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
