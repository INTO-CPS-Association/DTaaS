# ThingsBoard

It is recommended to install the third-party software *ThingsBoard* for use
by digital twins running inside the DTaaS software.
*This service can only be installed in secure (TLS) mode.*

ThingsBoard uses PostgreSQL as its database:

* **ThingsBoard** is an IoT device management and data visualization platform
* **PostgreSQL** is a database server for ThingsBoard

## Directory Structure

* **config** is used for storing the service configuration
* **data** is used by the services for storing data
* **log** is used by the services for logging
* **certs** is used for storing the TLS certificates needed by the services
* **script** contains scripts for creating user accounts

## Installation steps & prerequisites

Please follow the steps outlined here for installation.
The `services.foo.com` website hostname is used for illustration.
Please replace the same with your server's hostname.
These steps assume that you have downloaded the DTaaS repository
and have navigated to the `deploy/services` directory.

* Obtain the TLS certificates from letsencrypt and copy them.

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
  chown 999:999 certs/services.foo.com/postgres.key certs/services.foo.com/postgres.crt
  chmod 600 certs/services.foo.com/postgres.key
  chmod 644 certs/services.foo.com/postgres.crt
  ```

* Adjust permissions of certificates for ThingsBoard user in docker container.

  ```bash
  chown 799:799 certs/services.foo.com/privkey.pem certs/services.foo.com/fullchain.pem
  chmod 600 certs/services.foo.com/privkey.pem
  chmod 644 certs/services.foo.com/fullchain.pem
  ```

* Set required permissions for ThingsBoard data and log directories.

  ```bash
  chown -R 799:799 data/thingsboard
  chown -R 799:799 log/thingsboard
  ```

* Use configuration template and create service configuration.
  Remember to update the services.env file with the appropriate values.

  ```bash
  cp config/services.env.template config/services.env
  ```

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
    --env-file config/services.env up -d
  docker compose -f compose.thingsboard.secure.yml \
    --env-file config/services.env down
  ```

## New User Accounts

The password for the default ThingsBoard system admin should be changed
as soon as possible.
Use the following commands to change the password,
and add a new tenant to **ThingsBoard** service.

```bash
chmod +x script/thingsboard.py
python3 script/thingsboard.py
```

## Use

After the installation is complete, you can see the ThingsBoard service active
at the following ports / URLs.

| service | external url |
|:---|:---|
| ThingsBoard | services.foo.com:8089 |

Please note that the TCP ports used by the services can be changed
by updating the `config/services.env` file and rerunning the docker commands.

The firewall and network access settings of corporate / cloud network
need to be configured to allow external access to the services.
Otherwise the users of DTaaS will not be able to utilize these
services from their user workspaces.
