# Overview

## What is the goal?

The goal is to set up the DTaaS infrastructure in order to enable
your users to use the DTaaS.
As an admin you will administrate the users and the servers of the system.

## What are the requirements?

### OAuth Provider

You need to have an OAuth Provider running, which the DTaaS can use for
authentication. This is described further in
the [authentication section](./client/auth.md).

### Domain name

The DTaaS software can only be hosted on a server with a domain name
like <http:>_foo.com_</http:>.

### Reverse Proxy

The installation setup assumes that the foo.com server is behind a reverse
proxy / load balancer that provides https termination. You can still use
the DTaaS software even if you do not have this reverse proxy. If you do
not have a reverse proxy, please replace <https://foo.com>
with <http://foo.com> in
[client env.js file](./client/CLIENT.md) and in
[OAuth registration](./client/auth.md). Other installation configuration
remains the same.

## How to install?

The DTaaS can be installed in different ways. Each version serves a different purpose.
Follow the installation that fits your usecase.

| Installation Setup | Purpose |
|:-----|:-----|
| [Trial installation on localhost](./trial.md) | Install DTaaS on your computer for a single user; does not need a web server. |
| [Trial installation on single host](./trial.md) | Install DTaaS on server for a single user. |
| [Production installation on single host](./host.md) | Install DTaaS on server for multiple users. |
| [one vagrant machine](vagrant/single-machine.md) | Install DTaaS on a virtual machine; can be used for single or multiple users. |
| [two vagrant machines](vagrant/two-machines.md) | Install DTaaS on two virtual machines; can be used for single or multiple users. |
|   | The core DTaaS application is installed on the first virtual machine and all the services (RabbitMQ, MQTT, InfluxDB and Grafana) are installed on second virtual machine. |
| Seperater Packages: [client website](client/CLIENT.md) and [lib microservice](servers/lib/LIB-MS.md) | Can be used independently; do not need full installation of DTaaS. |
