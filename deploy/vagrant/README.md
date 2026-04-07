# DTaaS Vagrant Box

This document provides instructions for creating a custom virtual machine
to develop and use the DTaaS software.
The setup requires a host machine with at least 16GB RAM,
8 vCPUs and 50GB hard disk space available for the vagrant box.
The goals are:

* Cross-platform installation of the DTaaS application.
  Any operating system that supports the Vagrant utility can
  host the DTaaS software.
* A ready-to-use development environment for code contributors.

Requirements:
[vagrant](https://developer.hashicorp.com/vagrant) along with
[vagrant-disksize](https://github.com/sprotheroe/vagrant-disksize) plugin.

Two provisioning scripts are provided:

| Script name | Purpose | Default |
|:---|:---|:---|
| `user.sh` | user installation | :white_check_mark: |
| `developer.sh` | developer installation | :x: |

The default installation provisions the user environment only.
Developer installation can be skipped unless additional tooling is required.

To enable developer provisioning, modify the `Vagrantfile`.
The relevant lines are:

```ruby
    config.vm.provision "shell", path: "user.sh"
    #config.vm.provision "shell", path: "developer.sh"
```

Uncomment the second line to include developer software components.
No changes are required for a user-only installation.

🛑The vagrant installation times out if the scripts take too long.
The uncommenting of `developer.sh` might prolong the installation time
thus resulting in unsuccessful completion of vagrant installation.
The `developer.sh` script can be run from inside the vagrant machine
to complete the developer environment setup.

## Configure

A dummy `intocps.org` URL is used for illustration.
Replace it with the appropriate website URL.

Update **config.json**. The configurable fields are:

| Field | Example Value | Description |
|:---|:---|:---|
| `hostname` | `intocps.org` | Hostname of the virtual machine |
| `mac` | `02163ee0bf12` | MAC address. Required when a DHCP server assigns domain names based on MAC address. Otherwise, leave unchanged. |
| `disksize` | `200GB` | Disk size allocated to the virtual machine |
| `name` | `dtaas` | Name of the VirtualBox VM |
| `memory` | `16384` | RAM in MB allocated to the VM |
| `cpus` | `8` | Number of vCPUs allocated to the VM |

## Start Virtual Machine

Execute the following commands from a terminal:

```bash
vagrant up

# wait for provisioning to complete
vagrant ssh

# Set a cronjob inside the vagrant virtual machine to
# remove the conflicting default route:
sudo bash /vagrant/route.sh
```
