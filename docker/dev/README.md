# Docker workflow for DTaaS

This readme will explain the building and use of different docker files
for use in development and installation of the DTaaS software.

**NOTE**: A local docker and docker-compose installation is a pre-requisite
for using docker workflows.

## Folder Structure

There are two dockerfiles for building the containers:

- **client.dockerfile**: Dockerfile for building
  the client application container.
- **libms.dockerfile**: Dockerfile for building the library microservice container.

There is a specific compose file for development:

- **compose.dev.yml:** Docker Compose configuration for development environment.

## Build and Publish Docker Images

### Users

Build and publish the docker images. This step is required only for
the publication of images to Docker Hub. This publishing step is managed
only by project maintainers. Regular users can skip this step.

```sh
docker login -u <username> -p <password>
docker build -t intocps/libms:latest -f ./docker/libms.dockerfile .
docker tag intocps/libms:latest intocps/libms:version
docker push intocps/libms:latest
docker push intocps/libms:version

docker build -t intocps/dtaas-web:latest -f ./docker/client.dockerfile .
docker tag intocps/dtaas-web:latest intocps/dtaas-web:version
docker push intocps/dtaas-web:latest
docker push intocps/dtaas-web:version
```

To tag version 0.3.1 for example, use

```sh
docker tag intocps/dtaas-web:latest intocps/dtaas-web:0.3.1
```

### Developers

Use of docker images is handy for developers as well. It is suggested
that developers build the required images locally on their computer and
use them for development purposes. The images can be built using

```sh
docker-compose -f compose.dev.yml build
```

## Running Docker Containers

Follow these steps to use the application with docker.

The DTaaS application requires multiple configuration files. The list of
configuration files to be modified are given for each scenario.

### Development Environment

This scenario is for software developers:

### Client Website & Lib Configuration

The configuration files to be updated are:

1. client/config/local.js
1. deploy/config/lib.docker (optional)

The relevant docker commands are:

```bash
docker-compose -f compose.dev.yml up -d #start the application
docker-compose -f compose.dev.yml down  #terminate the application
```

### Access the Application

You should access the application through the PORT mapped to the Traefik container.
e.g. `localhost`
