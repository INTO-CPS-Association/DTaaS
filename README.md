# Digital Twin as a Service (DTaaS)

## Overview

Digital Twin as a Service (DTaaS) is a software platform for the creation,
execution, and sharing of digital twins (DTs).

- **Build**: DTs are assembled using reusable DT assets.
- **Operate**: DTs are executed through the DTaaS platform.
- **Share**: DTs and DT-provided services can be made available to other users.

![DTaaS demonstration video showing the platform interface](docs/user/dtaas-user_4x.gif)

See demos in [playlist](docs/playlist.md).

## Installation and Use

The recommended installation source is the latest release published on the
[releases page](https://github.com/INTO-CPS-Association/DTaaS/releases).
Operational guidance is available in the
[project documentation](https://into-cps-association.github.io/DTaaS/).

## Independent Packages

Reusable DTaaS packages are published for independent use and can be
combined to form a complete DTaaS installation.

- [npm packages](https://www.npmjs.com/org/into-cps-association)
- [Docker images](https://hub.docker.com/u/intocps)
- [dtaas-services (PyPI)](https://pypi.org/project/dtaas-services/)

The
[dtaas-services](deploy/services/cli/README.md)
is a service manager useful in standalone or integrated
deployments.

Improvement proposals and defect reports may be submitted via
[GitHub issues](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose).

## Research Citation

When DTaaS is cited in academic work, the following reference may be used:

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

## Development

This repository is a monorepo containing implementation and support material
for:

- [web client](client)
- [library microservice](servers/lib)
- [runner microservice](servers/execution/runner)
- [dtaas-services CLI](deploy/services/cli)

Published packages are also available via the
[GitHub Packages registry](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS).

Detailed development guidance is available in the
[developer documentation](https://into-cps-association.github.io/DTaaS/development/developer/index.html).

## Licence

DTaaS is owned by [The INTO-CPS Association](https://into-cps.org/) and is
distributed under the terms documented in [LICENSE.md](LICENSE.md).

Third-party software notices are listed in
[docs/third-party.md](docs/third-party.md).
