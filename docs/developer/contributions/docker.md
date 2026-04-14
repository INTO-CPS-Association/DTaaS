# Docker Workflow for DTaaS

This document describes the building and use of different Docker files
for development and installation of the DTaaS platform.

**NOTE**: A local Docker CE installation is a prerequisite
for using Docker workflows.

## Run

Follow the instructions in `docker/README.md` to spawn a localhost development
instance of DTaaS. It is an end-to-end testing of the current codebase
as it exists in the local git directory.

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
