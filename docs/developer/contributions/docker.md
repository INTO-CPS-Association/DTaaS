# Docker Workflow for DTaaS

This document describes how the Docker files are built and used for
developing and installing the DTaaS platform.

**NOTE**: The Docker workflows need a local Docker CE installation.

## Run

The `developer/` directory holds two separate things:

- `developer/check/` checks that DTaaS *functions* on a developer
  machine. Follow the instructions in `developer/check/README.md` to
  start a localhost instance. It is an end-to-end test of the codebase
  as it exists in the local git directory.
- `developer/devenv/` is the containerised *developer environment*: the
  Node, Python and documentation toolchains needed to work on the code.
  See `developer/devenv/README.md`.

## CI Dockerfile Validation

A pull request that modifies `client/**`, `servers/lib/**` or the
relevant Dockerfiles triggers a Docker build check. The check uses the
reusable workflow `.github/workflows/docker-build.yml` and runs in
parallel with the test jobs, so it does not lengthen the build.

| Workflow | Dockerfile validated | Notes |
| :--- | :--- | :--- |
| `.github/workflows/client.yml` | `developer/check/client.dockerfile` | Full multi-stage build inside Docker |
| `.github/workflows/client.yml` | `developer/check/client.built.dockerfile` | Validates the publish image Dockerfile |
| `.github/workflows/lib-ms.yml` | `developer/check/libms.dockerfile` | Full multi-stage build inside Docker |

The Docker build checks also run on pushes. The push triggers of
`.github/workflows/client.yml` and `.github/workflows/lib-ms.yml` cover
only the source code directories (`client/**` and `servers/lib/**`).

The publish jobs of these two workflows run on pushes to, and manual runs
on, the `feature/distributed-demo` branch. Because the push trigger
covers only the source code directories, a change to a Dockerfile alone
does not re-publish an already published package version.

The logger microservice workflow (`.github/workflows/logger-ms.yml`) has
no Docker build check. It publishes the image built from
`developer/check/logger.dockerfile` on pushes to `feature/*` and
`release-v*` branches, and its push trigger includes that Dockerfile.

## Publish Docker Images

Build and publish the Docker images. This step is needed only to
publish images to Docker Hub.

:stop_sign: Only project maintainers publish images. Other developers
can skip this step.

The DTaaS development team publishes reusable packages, which together
form the complete DTaaS application.

The packages are published on
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS),
[npmjs](https://www.npmjs.com/org/into-cps-association) and
[docker hub](https://hub.docker.com/u/intocps).

The packages on
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS)
are published more often but are not user tested.
The packages on [npmjs](https://www.npmjs.com/org/into-cps-association)
and [docker hub](https://hub.docker.com/u/intocps)
are published at least once per release.
Regular users should use the packages from npm and Docker Hub.

The packages are:

| Package Name  | Description                                    | Availability                                                                                                                                          |
| :------------ | :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| dtaas-web     | React web application                          | [docker hub](https://hub.docker.com/r/intocps/dtaas-web) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/dtaas-web)         |
| libms         | Library microservice                           | [npmjs](https://www.npmjs.com/package/@into-cps-association/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/libms)         |
|               |                                                | [docker hub](https://hub.docker.com/r/intocps/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/libms)                 |
| logger-ms     | Logger microservice                            | [npmjs](https://www.npmjs.com/package/@into-cps-association/logger-ms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/logger-ms) |
|               |                                                | [docker hub](https://hub.docker.com/r/intocps/logger-ms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/logger-ms)         |
| runner        | REST API wrapper for multiple scripts/programs | [npmjs](https://www.npmjs.com/package/@into-cps-association/runner) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/runner)       |
| dt-automation | Data and business-logic layer of the client    | [npmjs](https://www.npmjs.com/package/@into-cps-association/dt-automation) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/dt-automation) |

### React Website

```sh
docker build -t intocps/dtaas-web:latest -f ./developer/check/client.built.dockerfile .
docker tag intocps/dtaas-web:latest intocps/dtaas-web:<version>
docker push intocps/dtaas-web:latest
docker push intocps/dtaas-web:<version>
```

For example, to tag version **0.3.1**, use

```sh
docker tag intocps/dtaas-web:latest intocps/dtaas-web:0.3.1
```

To test the React website container on localhost, use

```bash
docker run -d \
  -v ${PWD}/client/config/local.js:/dtaas/client/build/env.js \
  -p 4000:4000 intocps/dtaas-web:latest
```

### Library Microservice

The Dockerfile of the library microservice has a `VERSION` argument,
which selects the package version to install from <http://npmjs.com>.

```sh
docker login -u <username> -p <password>
docker build -t intocps/libms:latest -f ./developer/check/libms.npm.dockerfile .
docker push intocps/libms:latest
docker build --build-arg="VERSION=<version>" \
  -t intocps/libms:<version> -f ./developer/check/libms.npm.dockerfile .
docker push intocps/libms:<version>
```

For example, to tag version 0.3.1, use

```sh
docker build --build-arg="VERSION=0.3.1" \
  -t intocps/libms:0.3.1 -f ./developer/check/libms.npm.dockerfile .
```

To test the library microservice on localhost, use

```bash
docker run -d -v ${PWD}/files:/dtaas/libms/files \
  -p 4001:4001 intocps/libms:latest
```
