# DTaaS Services Management CLI

This is a command-line tool for managing DTaaS platform services including:
- InfluxDB
- RabbitMQ
- MongoDB
- Grafana

## Installation

Install using Poetry:

```bash
cd deploy/services/cli
poetry install
```

Or install with pip:

```bash
pip install dtaas-services
```

## Configuration

Before using the CLI, configure the services by copying the template:

```bash
cp ../manual/config/services.env.template ../manual/config/services.env
# Edit services.env with your configuration
```

## Usage

### Setup Services

Initialize and start all platform services:

```bash
dtaas-services setup
```

This command will:
- Copy TLS certificates
- Set up permissions for MongoDB, InfluxDB, and RabbitMQ
- Start all services using Docker Compose

### Start Services

Start the platform services:

```bash
dtaas-services start
```

### Add Service Users

Add users to InfluxDB and RabbitMQ services:

```bash
dtaas-services user add
```

Before running this command, create a credentials file:

```bash
cp ../manual/config/credentials.csv.template ../manual/config/credentials.csv
# Edit credentials.csv with user accounts
```

## Requirements

- Python 3.10 or higher
- Docker and Docker Compose
- TLS certificates (for secure mode)
- Root privileges on Linux/MacOS (for file permissions)
