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

### Project Managers

Build and publish the docker images. This step is required only for
the publication of images to Docker Hub.

:stop_sign: This publishing step is managed
only by project managers. Regular developers can skip this step.

#### React Website

```sh
docker build -t intocps/dtaas-web:latest -f ./docker/client.dockerfile .
docker tag intocps/dtaas-web:latest intocps/dtaas-web:<version>
docker push intocps/dtaas-web:latest
docker push intocps/dtaas-web:<version>
```

To tag version **0.3.1** for example, use

```sh
docker tag intocps/dtaas-web:latest intocps/dtaas-web:0.3.1
```

To test the react website container on localhost, please use

```bash
docker run -d \
  -v ${PWD}/client/config/local.js:/dtaas/client/build/env.js \
  -p 4000:4000 intocps/dtaas-web:latest
```

#### Library Microservice

The Dockerfile of library microservice has `VERSION` argument.
This argument helps pick the right package version from <http://npmjs.com>.

```sh
docker login -u <username> -p <password>
docker build -t intocps/libms:latest -f ./docker/libms.npm.dockerfile .
docker push intocps/libms:latest
docker build --build-arg="VERSION=<version>" \
  -t intocps/libms:<version> -f ./docker/libms.npm.dockerfile .
docker push intocps/libms:<version>
```

To tag version 0.3.1 for example, use

```sh
docker build --build-arg="VERSION=0.3.1" \
  -t intocps/libms:0.3.1 -f ./docker/libms.npm.dockerfile .
```

To test the library microservice on localhost, please use

```bash
docker run -d -v ${PWD}/files:/dtaas/libms/files \
  -p 4001:4001 intocps/libms:latest
```

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
1. **servers/lib/config/.env.default**
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
