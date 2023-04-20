# DTaaS on Two Vagrant Machines

This directory contains code for running DTaaS application in two vagrant virtual machines (VMs). In this setup, all the user workspaces shall be run on server1 while all the platform services will be run on server2.

The setup requires two server VMs with the following hardware configuration:

**server1**: 16GB RAM, 8 x64 vCPUs and 50GB Hard Disk space

**server2**: 6GB RAM, 3 x64 vCPUs and 50GB Hard Disk space

Under the default configuration, two user workspaces are provisioned on server1. The _workspaces.sh_ contains installation commands for provisioning user workspaces. If you desire to have more users, you need to modify this shell script.

The default installation setup also installs InfluxDB, Grafana and RabbitMQ services on server2. If you would like to install more services, you can create shell scripts to install the same on server2. If you have these scripts ready, you can place them in this directory and invoke them from _services.sh_ script.

## Create Base Vagrant Box

If you haven't already done it, create [**dtaas** Vagrant box](../make_boxes/dtaas/README.md). Copy _vagrant_ SSH private key here. This shall be useful for logging into the vagrant machines created for two-machine deployment. You would have created an SSH key pair - _vagrant_ and _vagrant.pub_. The _vagrant_ is the private SSH key and is needed for the next steps.

Copy _vagrant_ SSH private key into the current directory (`deploy/vagrant/two-machine`).

## Configure Server Settings

**NOTE**: A dummy **foo.com** URL has been used for illustration. Please change this to your unique website URL.

The first step is to define the network identity of the two VMs. For that, you need _server name_, _hostname_ and _MAC address_. The hostname is the network URL at which the server can be accessed on the WWW. Please follow these steps to make this work in your local environment.

Update the **boxes.json**. There are entries one for each server. The fields to update are:

  1. `name` - name of server1 (`"name" = "workspaces"`)
  1. `hostname` - hostname of server1 (`"name" = "foo.com"`)
  1. MAC address (`:mac => "xxxxxxxx"`). This change is required if you have a DHCP server assigning domain names based on MAC address. Otherwise, you can leave this field unchanged.
  1. `name` - name of server2 (`"name" = "services"`)
  1. `hostname` - hostname of server2 (`"name" = "services.foo.com"`)
  1. MAC address (`:mac => "xxxxxxxx"`). This change is required if you have a DHCP server assigning domain names based on MAC address. Otherwise, you can leave this field unchanged.
  1. Other adjustments are optional.

## Launch Server1

Execute the following commands from terminal

```bash
vagrant up --provision server1
vagrant ssh
```

The default Traefik gateway configuration file is available at `/home/vagrant/DTaaS/servers/config/gateway/dynamic/fileConfig.yml`. This has been configured for single user workspace.- The _fileConfig.yml_ in this directory is suitable for two machine setup. Overwrite the default config with this one.

```bash
# From top-level of project directory
cp deploy/vagrant/two-machine/fileConfig.yml \
  servers/config/gateway/dynamic/fileConfig.yml
```

In the two machine setup, the following background services are offered through Traefik gateway.

| service | internal url | external url | server hosting the service |
|:---|:---|:---|:---|
| react website | localhost:4000 | foo.com | server1 |
| user1 workspace | localhost:8090 | foo.com/user1 | server1 |
| user2 workspace | localhost:8091 | foo.com/user2 | server1 |
| grafana visualization service | localhost:3000 | foo.com/vis | server2 |
||

server2 also hosts InfluxDB and RabbitMQ services, but these are not serviced via Traefik gateway.

Update _auth_ and _fileConfig.yml_ of Traefik gateway as per instructions in this [README](../../../servers/config/gateway/README.md).

Change the React website configuration in _client/build/env.js_.

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'development',
  REACT_APP_URL_LIB: 'http://foo.com/user1/shared/filebrowser/files/workspace/?token=admin',
  REACT_APP_URL_DT: 'http://foo.com/user1/lab',
  REACT_APP_URL_WORKBENCH: 'http://foo.com/user1',
};
```

Serve the react website. From inside the vagrant machine,

```bash
cd ~/DTaaS/client
nohup serve -s build -l 4000 & disown
```

Now you should be able to access the DTaaS application at: _http://foo.com_

Each user gets a dedicated workspaces. Two users have been provisioned in this default setup. You can update the configuration to have more users. All the users have the same password, please keep this in mind while allowing more users.

The following URLs must work now:

* http://foo.com (website; by default this is configured for a single user)
* http://foo.com/user1 (user1 workspace)
* http://foo.com/user2 (user2 workspace)

## Launch Server2

RabbitMQ, Grafana and InfluxDB services are provisioned on this server. 
InfluxDB webUI will be available at: server2.foo.com. The Grafana shall be accessible via server1 at _http://foo.com/vis_.

The InfluxDB, Grafana and RabbitMQ services shall be run on this server. First, execute the following commands from terminal to start the machine.

```bash
vagrant up --provision server2
vagrant ssh
```

After the server is up and running, you can see the following services active within server2.

| service | internal url | external url | server hosting the service |
|:---|:---|:---|:---|
| Influx visualization service | localhost:80 | server2.foo.com | server2 |
| grafana visualization service | localhost:3000 | foo.com/vis | server2 |
| RabbitMQ communication service | localhost:5672 | not available | server2 |
||

All these services are available to users and machines with SSH access to server2.

## Linking The Two Servers

The services running on server2 must be made available to the user workspaces running on server1. Hence SSH commands need to be executed on server1 to perform remote port fowarding from server2 to server1. Log into server1 and perform:

```bash
cd ~/DTaaS/deploy/vagrant/two-machine
./link.sh
```

The following URLs must work now:
* http://foo.com/vis (Grafana visualization service)
* http://server2.foo.com (Influx service)
