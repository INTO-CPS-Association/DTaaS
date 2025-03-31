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
The `services.foo.com` website hostname is used for illustration.
Please replace the same with your server's hostname.

* Obtain the TLS certificates from letsencrypt and copy them.

  ```bash
  cp -R /etc/letsencrypt/archive/services.foo.com certs/.
  mv certs/services.foo.com/privkey1.pem certs/services.foo.com/privkey.pem
  mv certs/services.foo.com/fullchain1.pem certs/services.foo.com/fullchain.pem
  ```

* Combine and adjust permissions of certificates for MongoDB user
  in docker container.

  ```bash
  cat certs/services.foo.com/privkey.pem \
    certs/services.foo.com/fullchain.pem > certs/foo.com/combined.pem
  chmod 600 certs/services.foo.com/combined.pem
  chown 999:999 certs/services.foo.com/combined.pem
  ```

* Adjust permissions of certificates for InfluxDB user in docker container.

  ```bash
  cp certs/services.foo.com/privkey.pem \
    certs/services.foo.com/privkey-influxdb.pem
  chown 1000:1000 certs/services.foo.com/privkey-influxdb.pem
  ```

* Adjust permissions of certificates for RabbitMQ user in docker container.
  
  ```bash
  cp certs/services.foo.com/privkey.pem certs/services.foo.com/privkey-rabbitmq.pem
  chown 999 certs/services.foo.com/privkey-rabbitmq.pem
  ```

* Note down your userid and groupid on Linux systems.
  
  ```bash
  $id -u #outputs userid
  $id -g #outputs groupid
  ```

* Use configuration template and create service configuration.
  Remember to update the services.env file with the appropriate values.

  ```bash
  cp config/services.env.template config/services.env
  ```

* Start or stop services.
  
  ```bash
  docker compose -f compose.services.secure.yml \
    --env-file config/services.env up -d
  docker compose -f compose.services.secure.yml \
    --env-file config/services.env down
  ```

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
