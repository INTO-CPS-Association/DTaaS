# Digital Twin as a Service (DTaaS)

## Overview

Digital Twin as a Service (DTaaS) is a software platform for digital
twins (DTs). Users build DTs from reusable DT assets, run them on the
platform, and share the DTs and the services they provide with other
users.

![DTaaS demonstration video showing the platform interface](docs/user/dtaas-user_4x.gif)

Watch the walkthrough as [MP4](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/user/20260426_dtaas/dtaas-user_4x.mp4).
More demos are in the [playlist](docs/playlist.md).

## Installation and Use

Start with the [dtaas](https://pypi.org/project/dtaas/) package, the CLI
for administering DTaaS installations. The
[dtaas-services](https://pypi.org/project/dtaas-services/) package is the
CLI for administering the platform services (InfluxDB, Grafana, RabbitMQ,
MongoDB, ThingsBoard and GitLab). Each CLI also works on its own.

The [project documentation](https://into-cps-association.github.io/DTaaS/)
explains how to install and operate the platform.

Feature requests and bug reports go to
[GitHub issues](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose).

## Research Citation

To cite DTaaS in academic work, use this reference:

```bibtex
@article{talasila2024composable,
author = {Prasad Talasila and Cl{\'a}udio Gomes and Lars B Vosteen and Hannes Iven and Martin Leucker and Santiago Gil and Peter H Mikkelsen and Eduard Kamburjan and Peter G Larsen},
title ={Composable digital twins on Digital Twin as a Service platform},
journal = {SIMULATION},
pages = {00375497241298653},
year={2024},
doi = {10.1177/00375497241298653},
publisher = {SAGE Publications Sage UK: London, England}
}
```

## Independent Packages

DTaaS components are also published as separate packages. You can use
them in your own software or combine them into a complete DTaaS
installation.

| Package | Purpose | Published on |
| :--- | :--- | :--- |
| [Installation packages](deploy/README.md) | One zip file for each installation setup | [GitHub releases](https://github.com/INTO-CPS-Association/DTaaS/releases) |
| [dtaas-web](client) | React web application for DTaaS, which on its own provides only the DevOps features | [Docker Hub](https://hub.docker.com/r/intocps/dtaas-web) |
| [libms](servers/lib) | Library microservice that serves files from the local file system or public git repositories over HTTP and a GraphQL API | [npm](https://www.npmjs.com/package/@into-cps-association/libms), [Docker Hub](https://hub.docker.com/r/intocps/libms) |
| [logger-ms](servers/logger) | Logger microservice for DT workflow logs | [npm](https://www.npmjs.com/package/@into-cps-association/logger-ms), [Docker Hub](https://hub.docker.com/r/intocps/logger-ms) |
| [runner](servers/execution/runner) | REST API wrapper that runs scripts and programs, usually DTs | [npm](https://www.npmjs.com/package/@into-cps-association/runner) |
| [dt-automation](lib/dt-automation) | Data, state and logic for creating, managing and running DTs | [npm](https://www.npmjs.com/package/@into-cps-association/dt-automation) |

Development builds of the npm packages and Docker images are published
more often to the
[GitHub Packages registry](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS).
They are not user tested.

## Development

This repository is a monorepo.

| Directory | Contents | Language |
| :--- | :--- | :--- |
| [client](client) | Web client | TypeScript, React |
| [servers/lib](servers/lib) | Library microservice | TypeScript, NestJS |
| [servers/execution/runner](servers/execution/runner) | Runner microservice | TypeScript, NestJS |
| [servers/logger](servers/logger) | Logger microservice | TypeScript, NestJS |
| [lib/dt-automation](lib/dt-automation) | dt-automation npm package | TypeScript |
| [lib/gitlab_common](lib/gitlab_common) | GitLab operations shared by the two CLIs | Python |
| [cli](cli) | DTaaS CLI | Python |
| [deploy/services/cli](deploy/services/cli) | dtaas-services CLI | Python |
| [deploy](deploy/README.md) | Installation setups | Docker Compose, Vagrant |
| [docs](docs) | Documentation website | MkDocs |
| [developer/devenv](developer/devenv/README.md) | Container with every toolchain the repository needs | Docker |
| [developer/check](developer/check/README.md) | Dockerfiles of the published images, and a Compose setup that runs them on a developer machine | Docker |

[PROJECT.md](PROJECT.md) lists the build and test command for each
project, and [CONTRIBUTING.md](CONTRIBUTING.md) describes the
contribution process. The
[developer documentation](https://into-cps-association.github.io/DTaaS/development/developer/index.html)
covers development in detail.

## Licence

DTaaS is owned by [The INTO-CPS Association](https://into-cps.org/) and is
distributed under the terms in [LICENSE.md](LICENSE.md).

Third-party software notices are listed in
[docs/third-party.md](docs/third-party.md).
