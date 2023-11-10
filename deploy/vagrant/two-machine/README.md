# DTaaS on Two Vagrant Machines

This directory contains code for running DTaaS application in two vagrant
virtual machines (VMs). In this setup, all the user workspaces shall be
run on server1 while all the platform services will be run on server2.

The setup requires two server VMs with the following hardware configuration:

**server1**: 16GB RAM, 8 x64 vCPUs and 50GB Hard Disk space

**server2**: 6GB RAM, 3 x64 vCPUs and 50GB Hard Disk space

Under the default configuration, two user workspaces are provisioned on
server1. The _workspaces.sh_ contains installation commands for provisioning
user workspaces. If you desire to have more users, you need to modify this
shell script.

The default installation setup also installs InfluxDB, Grafana, RabbitMQ
and MQTT services on server2. If you would like to install more services,
you can create
scripts to install the same on server2. If you have these scripts ready,
you can place them in this directory and invoke them from _services.js_ script.

## Create Base Vagrant Box

If you haven't already done it,
create [**dtaas** Vagrant box](../make_boxes/dtaas/README.md).
Copy _vagrant_ SSH private key here. This shall be useful for logging into the
vagrant machines created for two-machine deployment. You would have created an
SSH key pair - _vagrant_ and _vagrant.pub_. The _vagrant_ is the private SSH
key and is needed for the next steps.

Copy _vagrant_ SSH private key into the current
directory (`deploy/vagrant/two-machine`).

## Configure Server Settings

**NOTE**: A dummy **foo.com** and **services.foo.com**  URLs has been used for
illustration.
Please change these to your unique website URLs.

The first step is to define the network identity of the two VMs. For that, you
need _server name_, _hostname_ and _MAC address_. The hostname is the network
URL at which the server can be accessed on the WWW. Please follow these steps
to make this work in your local environment.

Update the **boxes.json**. There are entries one for each server.
The fields to update are:

  1. `name` - name of server1 (`"name" = "dtaas"`)
  1. `hostname` - hostname of server1 (`"name" = "foo.com"`)
  1. MAC address (`:mac => "xxxxxxxx"`). This change is required if you have a
     DHCP server assigning domain names based on MAC address.
     Otherwise, you can leave this field unchanged.
  1. `name` - name of server2 (`"name" = "services"`)
  1. `hostname` - hostname of server2 (`"name" = "services.foo.com"`)
  1. MAC address (`:mac => "xxxxxxxx"`). This change is required if you have a
     DHCP server assigning domain names based on MAC address. Otherwise, you
     can leave this field unchanged.
  1. Other adjustments are optional.

## Launch platform default services

RabbitMQ, Grafana, InfluxDB and MQTT services are provisioned on this server.

Execute the following commands from terminal to start the machine.

```bash
vagrant up --provision services
vagrant ssh services
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/vagrant/route.sh
sudo bash route.sh
```

Follow the instructions in [services](../../services/README.md) to install
the platform default services on this vagrant machine.

## Launch DTaaS application

Execute the following commands from terminal

```bash
vagrant up --provision dtaas
vagrant ssh dtaas
```

Once inside the vagrant box, execute

```bash
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/vagrant/route.sh
sudo bash route.sh
```

If you only want to test the application and are not setting up a production instance,
you can install using [single script install](../../single-script-install.sh).

If you are not in a hurry and would rather have a production instance,
follow the [instructions](../../README.md) of
regular server installation setup to complete the installation.
