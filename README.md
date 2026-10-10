# Digital Twin as a Service (DTaaS)

## Overview

Digital Twin as a Service (DTaaS) is a software platform for creating,
running and sharing digital twins (DTs).

- **Build**: assemble DTs from reusable DT assets.
- **Operate**: run DTs on the DTaaS platform.
- **Share**: make DTs and the services they provide available to other users.

![DTaaS demonstration video showing the platform interface](docs/user/dtaas-user_4x.gif)

Watch the walkthrough as [MP4](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/user/20260426_dtaas/dtaas-user_4x.mp4).
More demos are in the [playlist](docs/playlist.md).

## 🚀 Installation and Use

Install from the latest release on the
[releases page](https://github.com/INTO-CPS-Association/DTaaS/releases).
The [project documentation](https://into-cps-association.github.io/DTaaS/)
explains how to install and operate the platform.

## 📦 Independent Packages

Some DTaaS components are published as packages that can be used on their
own or combined into a complete DTaaS installation.

- [npm packages](https://www.npmjs.com/org/into-cps-association)
- [Docker images](https://hub.docker.com/u/intocps)
- [dtaas-services (PyPI)](https://pypi.org/project/dtaas-services/)

[dtaas-services](deploy/services/cli/README.md) installs and manages the
platform services (InfluxDB, Grafana, RabbitMQ, MongoDB, ThingsBoard and
GitLab), either alongside DTaaS or on their own.

Feature requests and bug reports go to
[GitHub issues](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose).

## 📖 Research Citation

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

## 🏗️ Development

This repository is a monorepo. It holds the source code for:

- [web client](client)
- [library microservice](servers/lib)
- [runner microservice](servers/execution/runner)
- [logger microservice](servers/logger)
- [dt-automation npm package](lib/dt-automation), the data, state and
  logic for creating, managing and running DTs
- [gitlab-common Python library](lib/gitlab_common), GitLab operations
  shared by the two command-line tools
- [DTaaS CLI](cli) for generating, configuring and administering
  installations
- [dtaas-services CLI](deploy/services/cli)

Published packages are also available from the
[GitHub Packages registry](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS).

The
[developer documentation](https://into-cps-association.github.io/DTaaS/development/developer/index.html)
covers development in detail.

## ⚖️ Licence

DTaaS is owned by [The INTO-CPS Association](https://into-cps.org/) and is
distributed under the terms in [LICENSE.md](LICENSE.md).

Third-party software notices are listed in
[docs/third-party.md](docs/third-party.md).
