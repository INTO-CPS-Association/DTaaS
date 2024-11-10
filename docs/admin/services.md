# Third-party Services

The DTaaS software platform uses third-party software services
to provide enhanced value to users.

InfluxDB, Grafana, RabbitMQ and Mosquitto are default services
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

The software is available for as
[zip package](https://github.com/INTO-CPS-Association/DTaaS/releases/download/v0.6.0/DTaaS-v0.6.0.zip).
Please download and unzip the same. A new **DTaaS-v0.6.0** folder gets created.
The rest of the installation instructions assume that you are using
Windows/Linux/MacOS terminal in **DTaaS-v0.6.0** folder.

The next step in installation is to specify the config of the services.
There are two configuration files. The `services.yml` contains most
of configuration settings. The `mqtt-default.conf` file contains
the MQTT listening port. Update these two config files before proceeding
with the installation of the services.

Now continue with the installation of services.

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
| MongoDB database | services.foo.com:27017 |

The firewall and network access settings of corporate / cloud network need to be
configured to allow external access to the services. Otherwise the users of DTaaS
will not be able to utilize these services from their user workspaces.
