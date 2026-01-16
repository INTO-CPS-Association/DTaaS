# DTaaS on Two Vagrant Machines

These are installation instructions for running the DTaaS platform
in two Vagrant virtual machines (VMs). In this setup, all user workspaces
are run on server1 while all platform services are run on server2.

The setup requires two server VMs with the following hardware configuration:

**server1**: 16GB RAM, 8 x64 vCPUs and 50GB Hard Disk space

**server2**: 6GB RAM, 3 x64 vCPUs and 50GB Hard Disk space

Under the default configuration, two user workspaces are provisioned on **server1**.
The default installation setup also installs
InfluxDB, Grafana, RabbitMQ and MQTT services on **server2**.
If you would like to install more services,
you can create shell scripts to install the same on **server2**.

## Create Base Vagrant Box

Create the [**dtaas** Vagrant box](base-box.md).
An SSH key pair - _vagrant_ and _vagrant.pub_ - will have been created.
The _vagrant_ file is the private SSH key and is needed for the next steps.
The _vagrant_ SSH private key should be copied into the current directory (`deploy/vagrant/two-machine`).
This key is useful for logging into the vagrant
machines created for two-machine deployment.

## Target Installation Setup

The goal is to use this [**dtaas** vagrant box](base-box.md)
to install the DTaaS platform on server1 and
the default platform services on server2. Both servers
are vagrant machines.

![DTaaS vagrant box package use](two-machine-use-legend.png)

There are many unused software packages/docker containers within
the dtaas base box.
The used packages/docker containers are highlighted in blue and red color.

A graphical illustration of a successful installation is
presented here.

![Two vagrant machine](two-machine.png)

In this case, both the vagrant boxes are spawed on one server using
two vagrant configuration files, namely _boxes.json_ and _Vagrantfile_.

!!! tip
    The illustration shows hosting of GitLab on the same
    vagrant machine with <http:>_http(s)://gitlab.foo.com_</http:>
    The GitLab setup is outside the scope this installation
    guide. Please refer to
    [GitLab docker install](https://docs.gitlab.com/ee/install/docker.html)
    for GitLab installation.

## Configure Server Settings

:clipboard: A dummy `foo.com` and `services.foo.com` URLs
have been used for illustration.
These should be changed to the actual unique website URLs.

The first step is to define the network identity of the two VMs.
For this, the _server name_, _hostname_ and _MAC address_ are required.
The hostname is the network URL at which the server can be accessed on the web.
The following steps should be performed to make this work in the local environment.

Update the **boxes.json**. There are entries one for each server.
The fields to update are:

  1. `name` - name of server1 (`"name" = "dtaas-two"`)
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

## Installation Steps

The installation instructions are given separately for each vagrant machine.

### Launch DTaaS Platform Default Services

Follow the installation guide for [services](../services/terminal-install.md)
to install the DTaaS platform services.

After the services are up and running,
you can see the following services active within server2 (`services.foo.com`).

| service                            | external url           |
| :--------------------------------- | :--------------------- |
| InfluxDB database                  | services.foo.com       |
| Grafana visualization service      | services.foo.com:3000  |
| MQTT Broker                        | services.foo.com:1883  |
| RabbitMQ Broker                    | services.foo.com:5672  |
| RabbitMQ Broker management website | services.foo.com:15672 |
| MongoDB database                   | services.foo.com:27017 |

### Install DTaaS Platform

Execute the following commands from terminal

```bash
vagrant up
vagrant ssh
```

Set a cronjob inside the vagrant virtual
machine to remote the conflicting default route.
Download the [route script](route.sh) and run
the following command.

```bash
sudo bash route.sh
```

Please follow the instructions of [regular server installation](../server.md)
setup to complete the installation.

## References

Image sources: [Ubuntu logo](https://logodix.com/linux-ubuntu),
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[ml-workspace](https://github.com/ml-tooling/ml-workspace),
[nodejs](https://www.metachris.com/2017/01/how-to-install-nodejs-7-on-ubuntu-and-centos/),
[reactjs](https://krify.co/about-reactjs/),
[nestjs](https://camunda.com/blog/2019/10/nestjs-tx-email/)
