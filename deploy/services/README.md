# Platform Services

It is recommended to install certain third-party software for use
by digital twins running inside the DTaaS software.

The installation scripts in this directory install:

* **Influx** time-series database and dashboard service
* **Grafana** visualization and dashboard service
* **RabbitMQ** AMQP broker and its' management interface
* Eclipse Mosquitto **MQTT** broker

## Configure and Install

The first step in installation is to specify the config of the services.
There are two configuration files. The __services.yml__ contains most
of configuration settings. The __mqtt-default.conf__ file contains
the MQTT listening port. Update these two config files before proceeding
with the installation of the services.

```bash
yarn install
node services.js
```

## Use

After the installation is complete, you can see the following services active
at the following ports / URLs.

| service | external url |
|:---|:---|
| Influx | services.foo.com |
| Grafana | services.foo.com:3000 |
| RabbitMQ Broker | services.foo.com:5672 |
| RabbitMQ Broker Management Website | services.foo.com:15672 |
| MQTT Broker | services.foo.com:1883 |
||

The firewall and network access settings of corporate / cloud network need to be
configured to allow external access to the services. Otherwise the users of DTaaS
will not be able to utilize these services from their user workspaces.
