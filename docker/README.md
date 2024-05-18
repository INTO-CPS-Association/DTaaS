# Docker workflow for DTaaS

Use of docker images is handy for developers. It is suggested
that developers build the required images locally on their computer and
use them for development purposes. 

This readme will explain the building and use of different docker files
for development purposes.

## Folder Structure

There are two dockerfiles for building the containers:

- **client.dockerfile**: Dockerfile for building
  the client application container.
- **libms.dockerfile**: Dockerfile for building the library microservice container.
- **compose.dev.yml:** Docker Compose configuration for
  development environment.
- **.env**: environment variables for docker compose file
- **conf.local** OAuth2 configuration required by
  the Traefik forward-auth service

## Requirements

The installation requirements to run this development version of
the DTaaS are:

- docker with compose plugin
- User account on a gitlab instance (could be _gitlab.com_)
- OAuth2 application registrations

### OAuth2 Application Registration

The development docker setup requires dedicated authorization
setup for both frontend website and backend services.
Both these authorization requirements are satisfied
using OAuth2 protocol.

- The frontend website is a React single page application (SPA).
- The details of Oauth2 app for the frontend website are in
  [client docs](../docs/admin/client/auth.md).
- The Oauth2 authorization for backend services is managed
  by [Traefik forward-auth](https://github.com/thomseddon/traefik-forward-auth).
  The details of this authorization setup are in
  [server docs](../docs/admin/servers/auth.md).

It is necessary to register these two OAuth2 applications and
link them to your DTaaS development instance.

Please see
[gitlab oauth provider](https://docs.gitlab.com/ee/integration/oauth_provider.html)
documentation for further help with creating these two OAuth applications.

## Configuration

The configuration files to be updated are:

1. docker/.env
   please see [docker README](../deploy/docker/SERVER.md) for help
   with updating this config file)
2. docker/conf.local
   please see [server docs](../docs/admin/servers/auth.md) for help
   with updating this config file)
3. client/config/local.js
   please see [client config](../../docs/admin/client/CLIENT.md) for help
   with updating this config file)
4. servers/lib/config/.env.default
   please see [lib config](../../docs/admin/servers/lib/LIB-MS.md) for help
   with updating this config file)

## Development Environment

The development environment requires docker images to be built
become the docker compose application can be brought up.

The images can be built using

```sh
docker compose -f compose.dev.yml build
```

The first build requires download of base docker images and building
requires docker image layers.
It does take time but the subsequent builds will happen quickly.

### Running Docker Containers

The docker commands need to be executed from this directory(`docker`).
The relevant docker commands are:

```bash
docker compose -f compose.dev.yml up -d #start the application
docker compose -f compose.dev.yml down  #terminate the application
```

### Access the Application

The application will be accessible at:
<http>_http://localhost_</http> from web browser.
Sign in using your gitlab.com account.

All the functionality of DTaaS should be available to you
through the single page client now.

## Publish Docker Images

Build and publish the docker images. This step is required only for
the publication of images to Docker Hub. 

:stop_sign: This publishing step is managed
only by project maintainers. Regular developers can skip this step.

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
