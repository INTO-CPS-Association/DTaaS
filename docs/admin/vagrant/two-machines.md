# DTaaS on Two Vagrant Machines

These are installation instructions for running DTaaS application
in two vagrant virtual machines (VMs). In this setup, all the user workspaces
shall be run on server1 while all the platform services will be run on server2.

The setup requires two server VMs with the following hardware configuration:

**server1**: 16GB RAM, 8 x64 vCPUs and 50GB Hard Disk space

**server2**: 6GB RAM, 3 x64 vCPUs and 50GB Hard Disk space

Under the default configuration, two user workspaces are provisioned on server1.
The default installation setup also installs
InfluxDB, Grafana and RabbitMQ services on server2.
If you would like to install more services,
you can create shell scripts to install the same on server2.

## Create Base Vagrant Box

Create [**dtaas** Vagrant box](./base-box.md).
You would have created an SSH key pair - _vagrant_ and _vagrant.pub_.
The _vagrant_ is the private SSH key and is needed for the next steps.
Copy _vagrant_ SSH private key into the current directory (`deploy/vagrant/single-machine`).
This shall be useful for logging into the vagrant
machines created for two-machine deployment.

## Configure Server Settings

**NOTE**: A dummy **foo.com** and **services.foo.com**  URLs has been used for illustration.
Please change these to your unique website URLs.

The first step is to define the network identity of the two VMs.
For that, you need _server name_, _hostname_ and _MAC address_.
The hostname is the network URL at which the server can be accessed on the web.
Please follow these steps to make this work in your local environment.

Update the **boxes.json**. There are entries one for each server.
The fields to update are:

  1. `name` - name of server1 (`"name" = "dtaas"`)
  1. `hostname` - hostname of server1 (`"name" = "foo.com"`)
  1. MAC address (`:mac => "xxxxxxxx"`).
  This change is required if you have a DHCP server assigning domain names
  based on MAC address. Otherwise, you can leave this field unchanged.
  1. `name` - name of server2 (`"name" = "services"`)
  1. `hostname` - hostname of server2 (`"name" = "services.foo.com"`)
  1. MAC address (`:mac => "xxxxxxxx"`).
     This change is required if you have a DHCP server assigning domain
     names based on MAC address. Otherwise, you can leave this field unchanged.
  1. Other adjustments are optional.

## Launch platform default services

RabbitMQ, Grafana and InfluxDB services are provisioned on this server.
InfluxDB and visualization service will be available at: _services.foo.com_.
The RabbitMQ service and its management interface shall be available at
5672 and 15672 TCP ports respectively.
The Grafana service shall be available at TCP port 3000.

The firewall and network access settings of corporate / cloud network
need to be configured to allow external access to the services.
Otherwise the users of DTaaS will not be able to utilize these
services from their user workspaces.

Execute the following commands from terminal to start the machine.

```bash
vagrant up --provision services
vagrant ssh services
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/vagrant/two-machine/services.sh
bash services.sh
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/vagrant/route.sh
sudo bash route.sh
```

After the server is up and running,
you can see the following services active within server2.

| service | external url |
|:---|:---|
| InfluxDB and visualization service | services.foo.com |
| Grafana visualization service | services.foo.com:3000 |
| RabbitMQ communication service | services.foo.com:5672 |
| RabbitMQ management service | services.foo.com:15672 |
||

## Launch DTaaS application

Execute the following commands from terminal

```bash
vagrant up --provision dtaas
vagrant ssh dtaas
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/vagrant/route.sh
sudo bash route.sh
```

If you only want to test the application and are
not setting up a production instance, you can
follow the instructions of [single script install](../trial.md).

If you are not in a hurry and would rather have a production instance,
follow the instructions of [regular server installation](../host.md)
setup to complete the installation.
