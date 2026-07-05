# Vagrant Deployment

This page summarises the Vagrant-based deployment available in this repository.
The source material for the setup is maintained in:

- `deploy/vagrant/README.md`

## Purpose

The Vagrant setup provides:

- Cross-platform DTaaS installation using a virtual machine
- A reproducible development and evaluation environment

## Host Requirements

Recommended host capacity:

- 16 GB RAM
- 8 vCPUs
- 50 GB available disk space

Required tooling:

- [Vagrant](https://developer.hashicorp.com/vagrant)
- [vagrant-disksize plugin](https://github.com/sprotheroe/vagrant-disksize)

## Provisioning Modes

Two provisioning scripts are provided in `deploy/vagrant`:

- `user.sh` for user-oriented installation (default)
- `developer.sh` for extended developer tooling

Developer provisioning can be enabled in `deploy/vagrant/Vagrantfile`.

## Basic Workflow

Run the following from the `deploy/vagrant` directory:

```bash
vagrant up
vagrant ssh
sudo bash /vagrant/route.sh
```

## Configuration

The file `deploy/vagrant/config.json` controls machine configuration,
including hostname, VM name, memory, CPUs, and disk size.

## Related

- DTaaS installation scenarios: `../admin/overview.md`
- DTaaS package deployments: `../admin/dtaas/`
- Workspace deployments: `../admin/workspace/`
- Platform services: `../admin/services/cli.md`
