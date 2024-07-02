# Installation Steps

## Complete DTaaS Application

DTaaS application is available in two flavors. One is
**localhost** which is suitable for single-user, local usage.
Another is **production server** which is suitable for multi-user
setup.

In both cases, the installation is a three step process.

### Setup Authorization

DTaaS provides security using OAuth authorization for both
[react client frontend](client/auth.md) and
[backend services](servers/auth.md).

There is a default frontend authorization application setup
for all [localhost](localhost.md) and backend authorization is not required
for localhost installation.

The [production server](host.md) installation requires both
[react client frontend](client/auth.md) and
[backend services](servers/auth.md) applications.

### Configure Components

DTaaS is available as docker compose application. There are
two docker compose files

1. `compose.local.yml` for [localhost](localhost.md) installation
1. `compose.server.yml` for [production server](host.md) installation

Both these compose files require environment configuration files.
The explanation of this configuration file is available directly
on the installation pages.

In addition, react client frontend requires configuration which is
explained on [this page](client/config.md).

### Install

Follow installation instructions given on either [localhost](localhost.md)
or [production server](host.md) pages.

## Independent Packages

Each release of DTaaS also comes with release of three reusable
packages. These packages have [dedicated documentation](packages.md).
