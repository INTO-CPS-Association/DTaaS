# :factory: :left_right_arrow: :busts_in_silhouette: Digital Twin as a Service

## :grinning: Motivation

The Digital Twin as a Service (DTaaS) software platform is useful
to <font color="orange"> **Build, Use and Share** </font> digital twins (DTs).

:mechanical_arm: <font color="orange">**Build**</font>: DTs are built on DTaaS using
reusable DT assets available on the platform.

:office_worker: :factory_worker: <font color="orange">**Use**</font>: Run your
DTs on DTaaS.

:handshake: <font color="orange">**Share**</font>: Share ready-to-use DTs
with other users. It is also possible to share the services
offered by one DT with other users.

## :rocket: Install and Use

Please use the latest release available on
the [releases page](https://github.com/INTO-CPS-Association/DTaaS/releases)
and its [documentation](https://into-cps-association.github.io/DTaaS/)
to install and use the DTaaS software platform.

### Independent Packages

The DTaaS development team publishes reusable packages which are then
put together to form the complete DTaaS application.

These packages are published on
[npmjs](https://www.npmjs.com/org/into-cps-association), and
[docker hub](https://hub.docker.com/u/intocps) repositories.

You are welcome to open an [issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose)
if there is a suggestion to improve the software.

## :scientist: Research

If you find this repo useful for your research, please consider citing our paper:

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

## :hammer_and_wrench: Development Setup

This is a mono repo containing code for
both the web client and the microservices code base.
The [web client](client),
[library](servers/lib) and
[runner](servers/execution/runner)
microservices are functional at present.
These packages are available on
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS).

Please see the
[developer documentation](https://into-cps-association.github.io/DTaaS/development/developer/index.html)
for more details.

## :balance_scale: License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under [the INTO-CPS License](./LICENSE.md).

Please see [third-party](docs/third-party.md) for details of
the third-party software included in the DTaaS.
