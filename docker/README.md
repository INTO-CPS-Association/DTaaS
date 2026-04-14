# Docker workflow for DTaaS

Use of docker images is handy for developers. It is suggested
that developers build the required images locally on their computer and
use them for development purposes.

This readme will explain the building and use of different docker files
for development purposes.

## Design

The docker compose environment creates the following development scenario.

![developer](developer-docker.png)

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
  Refer to the [Docker installation
  documentation](../../admin/dtaas/server/install.md) for
   guidance on updating this configuration file.
1. **docker/conf.dev** :
  Refer to the [Docker installation
  documentation](../../admin/dtaas/server/install.md) for
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
docker build -t intocps/dtaas-web:latest -f ./docker/client.built.dockerfile .
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

### Library Microservice

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
