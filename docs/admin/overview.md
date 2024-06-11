# Overview

## Goal

The goal is to set up the DTaaS infrastructure in order to enable
your users to use the DTaaS.

## Optional Requirements

There are three optional requirements for installing the DTaaS.
These requirements are not needed for
[**localhost**](./localhost.md) installation.
They are only required for installation of the DTaaS on a web server.

### OAuth Provider

The DTaaS software is uses OAuth for user authorization. It is
possible to use either <http:>_gitlab.com_</http:> or your own
OAuth service provider.

### Domain name

The DTaaS software is a web application and is preferably hosted
on a server with a domain name like <http:>_foo.com_</http:>.
However, it is possible to install the software on your computer
and use access it at <http:>_localhost_</http:>.

## Install

The DTaaS can be installed in different ways. Each version serves a different purpose.
Follow the installation that fits your usecase.

| Installation Setup | Purpose |
|:-----|:-----|
| [localhost](./localhost.md) | Install DTaaS on your computer for a single user; does not need a web server. _This setup does not require domain name._ |
| [Server](./host.md) | Install DTaaS on server for multiple users. |
| [One vagrant machine](vagrant/single-machine.md) | Install DTaaS on a virtual machine; can be used for single or multiple users. |
| [Two vagrant machines](vagrant/two-machines.md) | Install DTaaS on two virtual machines; can be used for single or multiple users. |
|   | The core DTaaS application is installed on the first virtual machine and all the services (RabbitMQ, MQTT, InfluxDB, Grafana and MongoDB) are installed on second virtual machine. |
| [Independent Packages](packages.md) | Can be used independently; do not need full installation of DTaaS. |
