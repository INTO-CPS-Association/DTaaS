# Installation Steps

## Complete the DTaaS Platform

The DTaaS platform is available in two flavors. One is
**localhost**, which is suitable for single-user, local usage.
The other is **production server**, which is suitable for multi-user
setup.

In both cases, the installation is a three-step process.

### Setup Authorization

DTaaS provides security using OAuth 2.0 authorization for both
the [react client frontend](client/auth.md) and
[backend services](servers/auth.md).

A default frontend authorization application is configured
for all [localhost](localhost.md) installations, and backend authorization
is not required for localhost installation.

The [production server](server.md) installation requires both
[react client frontend](client/auth.md) and
[backend services](servers/auth.md) application configurations.

### Configure Components

DTaaS is available as a docker compose application. Four
docker compose files are provided:

1. `compose.local.yml` for [localhost](localhost.md) installation
   served over HTTP connection.
1. `compose.local.secure.yml` for
   [secure localhost](localhost-secure.md) installation
   served over HTTPS connection.
1. `compose.server.yml` for [production server](server.md) installation
   served over HTTP connection.
1. `compose.server.secure.yml` for [production server](server.md) installation
   served over HTTPS connection.

These four compose files require environment configuration files.
The explanation of this configuration file is available directly
on the installation pages.

In addition, the react client frontend requires configuration, which is
explained on [this page](client/config.md).

### Install

The installation instructions on either the [localhost](localhost.md)
or [production server](server.md) pages should be followed.

## Independent Packages

Each release of the DTaaS also includes four reusable
packages. These packages have [dedicated documentation](packages.md).
