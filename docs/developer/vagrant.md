# Vagrant Deployment

This page summarises the Vagrant setup in this repository. The full
instructions are in `deploy/vagrant/README.md`.

## Purpose

The Vagrant setup installs DTaaS in a virtual machine, so it runs on any
operating system that supports Vagrant. The same machine can serve as a
reproducible development and evaluation environment.

## Host Requirements

Recommended host capacity:

- 16 GB RAM
- 8 vCPUs
- 50 GB available disk space

Required tooling:

- [Vagrant](https://developer.hashicorp.com/vagrant)
- [vagrant-disksize plugin](https://github.com/sprotheroe/vagrant-disksize)

## Provisioning Modes

`deploy/vagrant` has two provisioning scripts:

- `user.sh` for the user installation (default)
- `developer.sh` for additional developer tooling

To enable developer provisioning, uncomment the `developer.sh` line in
`deploy/vagrant/Vagrantfile`. Vagrant may time out while provisioning
both scripts; in that case, run `developer.sh` from inside the virtual
machine.

## Basic Workflow

Run the following from the `deploy/vagrant` directory:

```bash
vagrant up
vagrant ssh
sudo bash /vagrant/route.sh
```

`route.sh` sets a cron job inside the virtual machine that removes the
conflicting default route.

## Configuration

The file `deploy/vagrant/config.json` sets the hostname, MAC address,
disk size, VM name, memory and number of CPUs of the virtual machine.

## Related

- [DTaaS installation scenarios](../admin/overview.md)
- DTaaS package deployments: `docs/admin/dtaas/`
- [Workspace deployments](../admin/workspace/index.md)
- [Platform services](../admin/services/cli.md)
