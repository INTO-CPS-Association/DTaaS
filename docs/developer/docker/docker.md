# Docker workflow for DTaaS

This readme will explain the building and use of different docker files
for use in development and installation of the DTaaS software.

**NOTE**: A local docker installation with compose plugin is a pre-requisite
for using docker workflows.

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
- **conf.dev** OAuth2 configuration required by
  the Traefik forward-auth service

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
   please see [docker installation docs](../../admin/server.md) for help
   with updating this config file
1. **docker/conf.dev** :
   please see  [docker installation docs](../../admin/server.md) for help
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
