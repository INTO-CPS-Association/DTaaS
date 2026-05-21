# 🐳 Docker Workflow for DTaaS

Docker images are useful for development. Developers are advised
to build the required images locally and use them during development.

This document describes the building and use of Docker images
for development purposes.

## Design

The docker compose environment creates the following development scenario.

![developer](developer-docker.png)

## 📁 Folder Structure

There are four Dockerfiles for building the containers:

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

- **docker-compose.yml:** Docker Compose configuration for
  development environment.
- **.env**: environment variables for docker compose file
- **conf.dev** OAuth 2.0 configuration required by
  the Traefik forward-auth service

## 🛠️ Build and Publish Docker Images

The GitHub Actions workflows publish Docker images of the client website
and libms to
[GitHub](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS)
and
[Docker Hub](https://hub.docker.com/u/intocps).

### Developer Usage

Docker images are useful for development. Developers are advised
to build the required images locally for use during development.
The images can be built using:

```sh
cd developer
cp config/.env.example config/.env
cp config/client.js.example config/client.js
cp config/conf.dev.example config/conf.dev
cp config/libms.dev.yaml.example config/libms.dev.yml
sudo chown -R 1000:100 files/*
docker compose --env-file config/.env build
```

## 📦 Running Docker Containers

The following steps describe how to use the application with Docker.

The DTaaS platform requires multiple configuration files. The list of
configuration files to be modified is provided for each scenario.

### Development Environment

This scenario is intended for software developers.

The following configuration files require updating:

1. **developer/config/.env** :
  Refer to the [Docker installation
  documentation](../../admin/dtaas/server/install.md) for
   guidance on updating this configuration file.
1. **developer/config/conf.dev** :
  Refer to the [Docker installation
  documentation](../../admin/dtaas/server/install.md) for
   guidance on updating this configuration file.
1. **developer/config/client.js** :
   Refer to the [client configuration documentation](../../admin/client/config.md)
   for guidance on updating this configuration file.
1. **developer/config/libms.dev.yaml** :
   Refer to the [library microservice configuration documentation](../../admin/servers/lib/docker.md)
   for guidance on updating this configuration file.

The docker commands need to be executed from the `developer` directory.
The relevant docker commands are:

```bash
docker compose --env-file config/.env up -d #start the application
docker compose --env-file config/.env down  #terminate the application
```

### Access the Application

The application will be accessible at:
<http://localhost> from web browser.
Sign in using your gitlab.com account.

All the functionality of DTaaS should be available to you
through the single page client now.

## Publish Docker Images

Build and publish the docker images. This step is required only for
the publication of images to Docker Hub.

:stop_sign: This publishing step is managed
only by project maintainers. Regular developers can skip this step.

The DTaaS development team publishes reusable packages which are then
put together to form the complete DTaaS application.

The packages are published on
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS),
[npmjs](https://www.npmjs.com/org/into-cps-association), and
[docker hub](https://hub.docker.com/u/intocps) repositories.

The packages on
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS)
are published more frequently but are not user tested.
The packages on [npmjs](https://www.npmjs.com/org/into-cps-association)
and [docker hub](https://hub.docker.com/u/intocps)
are published at least once per release.
The regular users are encouraged to use the packages from npm and docker.

A brief explanation of the packages is given below.

| Package Name | Description | Availability |
| :---- | :---- | :---- |
| dtaas-web | React web application | [docker hub](https://hub.docker.com/r/intocps/dtaas-web) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/dtaas-web) |
| libms |Library microservice | [npmjs](https://www.npmjs.com/package/@into-cps-association/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/libms) |
| | | [docker hub](https://hub.docker.com/r/intocps/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/libms) |
| runner | REST API wrapper for multiple scripts/programs | [npmjs](https://www.npmjs.com/package/@into-cps-association/runner) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/runner) |

### React Website

```sh
docker build -t intocps/dtaas-web:latest -f ./developer/client.built.dockerfile .
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
  -v ${PWD}/client/config/client.js:/dtaas/client/build/env.js \
  -p 4000:4000 intocps/dtaas-web:latest
```

### Library Microservice

The Dockerfile of library microservice has `VERSION` argument.
This argument helps pick the right package version from <http://npmjs.com>.

```sh
docker login -u <username> -p <password>
docker build -t intocps/libms:latest -f ./developer/libms.npm.dockerfile .
docker push intocps/libms:latest
docker build --build-arg="VERSION=<version>" \
  -t intocps/libms:<version> -f ./developer/libms.npm.dockerfile .
docker push intocps/libms:<version>
```

To tag version 0.3.1 for example, use

```sh
docker build --build-arg="VERSION=0.3.1" \
  -t intocps/libms:0.3.1 -f ./developer/libms.npm.dockerfile .
```

To test the library microservice on localhost, please use

```bash
docker run -d -v ${PWD}/files:/dtaas/libms/files \
  -p 4001:4001 intocps/libms:latest
```
