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

## What to install?

The DTaaS can be installed in different ways. Each version is for different purposes:

- [Trial installation on single host](./trial.md)
- [Production installation on single host](./host.md)
- On [one](vagrant/single-machine.md) or [two](vagrant/two-machines.md)
  Vagrant virtual machines
- Seperater Packages: [client website](client/CLIENT.md) and
  [lib microservice](servers/lib/LIB-MS.md)

Follow the installation that fits your usecase.
