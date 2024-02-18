# Overview

## Goal

The goal is to set up the DTaaS infrastructure in order to enable
your users to use the DTaaS.
As an admin you will administrate the users and the servers of the system.

## Requirements

### OAuth Provider (Mandatory)

You need to have an OAuth Provider running, which the DTaaS can use for
authorization. This is described further in
the [authorization section](./client/auth.md).

### Domain name (Optional)

The DTaaS software is a web application and is preferably hosted
 on a server with a domain name like <http:>_foo.com_</http:>.
However, it is possible to install the software on your computer
and use access it at <http:>_localhost_</http:>.

### Reverse Proxy (Optional)

The installation setup assumes that the foo.com server is behind a reverse
proxy / load balancer that provides https termination. You can still use
the DTaaS software even if you do not have this reverse proxy. If you do
not have a reverse proxy, please replace <https://foo.com>
with <http://foo.com> in
[client env.js file](./client/CLIENT.md) and in
[OAuth registration](./client/auth.md). Other installation configuration
remains the same.

## Install

The DTaaS can be installed in different ways. Each version serves a different purpose.
Follow the installation that fits your usecase.

| Installation Setup | Purpose |
|:-----|:-----|
| [Trial installation on localhost](./trial.md) | Install DTaaS on your computer for a single user; does not need a web server. _This setup also does not require reverse proxy and domain name._ |
| [Trial installation on single host](./trial.md) | Install DTaaS on server for a single user. |
| [Production installation on single host](./host.md) | Install DTaaS on server for multiple users. |
| [One vagrant machine](vagrant/single-machine.md) | Install DTaaS on a virtual machine; can be used for single or multiple users. |
| [Two vagrant machines](vagrant/two-machines.md) | Install DTaaS on two virtual machines; can be used for single or multiple users. |
|   | The core DTaaS application is installed on the first virtual machine and all the services (RabbitMQ, MQTT, InfluxDB, Grafana and MongoDB) are installed on second virtual machine. |
| Seperater Packages: [client website](client/CLIENT.md) and [lib microservice](servers/lib/LIB-MS.md) | Can be used independently; do not need full installation of DTaaS. |
