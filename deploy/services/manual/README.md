# Manual Service Management

This directory contains the original manual approach for managing
DTaaS platform services. For a more automated approach, consider using
the [CLI package](../cli/README.md) instead.

## Installation Steps

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

Install Python dependencies before running the scripts:

```bash
pip install -r script/requirements.txt
```

### Run Setup Script

Run the installation script with root privilege:

```bash
cd deploy/services
sudo python3 script/service_setup.py
```

The script will:

* Combine and set permissions for MongoDB certificates
* Copy and set permissions for InfluxDB and RabbitMQ certificates
* Use the correct UID/GID values from `config/services.env`
* Start the Docker Compose services automatically after setup

If any required variable is missing, the script will exit with an error message.

This automation reduces manual errors and ensures your service containers have
the correct certificate files and permissions for secure operation.

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

## Alternative: CLI Package

For easier service management, consider using the
[DTaaS Services CLI](../cli/README.md) which automates all these steps
into simple commands.
