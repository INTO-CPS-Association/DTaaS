# Docker Workflow for DTaaS

This document describes the building and use of different Docker files
for development and installation of the DTaaS platform.

**NOTE**: A local Docker CE installation is a prerequisite
for using Docker workflows.

## Folder Structure

There are four dockerfiles for building the containers:

- **client.dockerfile**: Dockerfile for building
  the client application container.
- **client.built.dockerfile**: Dockerfile for copying
  an already built client application into docker image.
  This dockerfile copies `client/build` directory and serves it from
  inside the docker container.
- **libms.dockerfile**: Dockerfile for building the library
  microservice container from source code.
- **libms.npm.dockerfile**: Dockerfile for building the library
  microservice container from published npm package at npmjs.com.
  This Dockerfile is only used during publishing. It is used neither
  in the development builds nor in Github actions.

In addition, there are docker compose and configuration files.

- **compose.dev.yml:** Docker Compose configuration for
  development environment.
- **.env**: environment variables for docker compose file
- **conf.dev** OAuth 2.0 configuration required by
  the Traefik forward-auth service

## Build and Publish Docker Images

The github workflows publish docker images of client website and libms to
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS)
and
[docker hub](https://hub.docker.com/u/intocps).

### Developer Usage

Docker images are useful for development purposes. Developers are advised
to build the required images locally on their computers for use during
development. The images can be built using

```sh
docker compose -f compose.dev.yml build
```

## Running Docker Containers

The following steps describe how to use the application with Docker.

The DTaaS platform requires multiple configuration files. The list of
configuration files to be modified is provided for each scenario.

### Development Environment

This scenario is intended for software developers.

The following configuration files require updating:

1. **docker/.env** :
   Refer to the [Docker installation documentation](../../admin/server.md) for
   guidance on updating this configuration file.
1. **docker/conf.dev** :
   Refer to the [Docker installation documentation](../../admin/server.md) for
   guidance on updating this configuration file.
1. **client/config/local.js** :
   Refer to the [client configuration documentation](../../admin/client/config.md)
   for guidance on updating this configuration file.
1. **servers/lib/config/libms.dev.yaml** :
   Refer to the [library microservice configuration documentation](../../admin/servers/lib/docker.md)
   for guidance on updating this configuration file.

The docker commands need to be executed from this directory (`docker`).
The relevant docker commands are:

```bash
docker compose -f compose.dev.yml up -d #start the application
docker compose -f compose.dev.yml down  #terminate the application
```

### Accessing the Application

The application should be accessed through the port mapped to the Traefik
container, e.g., `localhost`.
