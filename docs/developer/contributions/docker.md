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

The diagram shows the localhost instance that `developer/check/` starts:
two user workspaces, the library and logger microservices and the client
behind Traefik, with forward-auth signing users in through GitLab.

![Containers of the developer check instance](docker-check.png#only-light)
![Containers of the developer check instance](docker-check-dark.png#only-dark)

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

The logger microservice workflow (`.github/workflows/logger-ms.yml`)
builds and checks the image from `developer/check/logger.dockerfile`. It
publishes that image on pushes to `feature/*` and `release-v*` branches,
and its push trigger includes that Dockerfile.

## Publish Docker Images

Build and publish the Docker images. This step is needed only to
publish images to Docker Hub.

!!! warning
    Only project maintainers publish images. Other developers
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

### Logger Microservice

The logger microservice image is built from the source code
with `logger.dockerfile`. Use the version in
`servers/logger/package.json` as the image tag.

```sh
docker login -u <username> -p <password>
docker build -t intocps/logger-ms:latest -f ./developer/check/logger.dockerfile .
docker tag intocps/logger-ms:latest intocps/logger-ms:<version>
docker push intocps/logger-ms:latest
docker push intocps/logger-ms:<version>
```

For example, to tag version 0.1.2, use

```sh
docker tag intocps/logger-ms:latest intocps/logger-ms:0.1.2
```

To test the logger microservice on localhost, use

```bash
mkdir logs
sudo chown -R 1000:1000 logs
docker run -d -v ${PWD}/logs:/dtaas/logger/logs \
  -p 4003:4003 intocps/logger-ms:latest
```

The captured events are written to `logs/workflow-logs.jsonl`.
