# Overview

## What is the goal

The goal is to set up the DTaaS infrastructure in order to enable your users to use the DTaaS.
As an admin you'll administrate the users and the servers of the system. !maybe this is different for the other ways to install?

## What are the requirements

### OAuth Provider

You need to have an OAuth Provider running, which the DTaaS Web Application can use for authentication. This is described further in the [authentication section](./client/auth.md).

# What to install

The DTaaS can be installed in different ways. Each version is for different purposes:

- [Trial installation on single host](./trial.md)
- [Production installation on single host](./host.md)
- On [one](vagrant/single-machine.md) or [two](vagrant/two-machines.md)
  Vagrant virtual machines
- Seperater Packages: [client website](client/CLIENT.md) and
  [lib microservice](servers/lib/LIB-MS.md)

Following the installation that fit your usecase.
