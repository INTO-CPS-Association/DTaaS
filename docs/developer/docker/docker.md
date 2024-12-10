# Docker workflow for DTaaS

This readme will explain the building and use of different docker files
for use in development and installation of the DTaaS software.

**NOTE**: A local docker installation with compose plugin is a pre-requisite
for using docker workflows.

## Folder Structure

There are two dockerfiles for building the containers:

- **client.dockerfile**: Dockerfile for building
  the client application container.
- **libms.dockerfile**: Dockerfile for building the library
  microservice container from source code.
- **libms.npm.dockerfile**: Dockerfile for building the library
  microservice container from published npm package at npmjs.com.
  This Dockerfile is only used during publishing. It is used neither
  in the development builds nor in Github actions.

There is a specific compose file for development:

The **compose.dev.yml:** file is the docker compose file
for development environment.

## Build and Publish Docker Images

The github workflows publish docker images of client website and libms to
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS)
and
[docker hub](https://hub.docker.com/u/intocps).

### Developers

Use of docker images is handy for developers as well. It is suggested
that developers build the required images locally on their computer and
use them for development purposes. The images can be built using

```sh
docker compose -f compose.dev.yml build
```

## Running Docker Containers

Follow these steps to use the application with docker.

The DTaaS application requires multiple configuration files. The list of
configuration files to be modified are given for each scenario.

### Development Environment

This scenario is for software developers.

The configuration files to be updated are:

1. **docker/.env** :
   please see [docker installation docs](../../admin/host.md) for help
   with updating this config file
1. **docker/conf.dev** :
   please see  [docker installation docs](../../admin/host.md) for help
   with updating this config file
1. **client/config/local.js**
   please see [client config](../../admin/client/config.md) for help
   with updating this config file
1. **servers/lib/config/libms.dev.yaml**
   please see [lib config](../../admin/servers/lib/docker.md) for help
   with updating this config file

The docker commands need to be executed from this directory (`docker`).
The relevant docker commands are:

```bash
docker compose -f compose.dev.yml up -d #start the application
docker compose -f compose.dev.yml down  #terminate the application
```

### Access the Application

You should access the application through the PORT mapped to the Traefik container.
e.g. `localhost`
