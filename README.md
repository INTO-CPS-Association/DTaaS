# :factory: :left_right_arrow: :busts_in_silhouette: Digital Twin as a Service

## :grinning: Motivation

The Digital Twin as a Service (DTaaS) software is useful
to create and run digital twins.

The digital twins that are running can be used as service
by other users.

These users of digital twins need not be members of
the DTaaS software platform itself.

## :rocket: Install and Use

Please use the latest release available on
the [releases page](https://github.com/INTO-CPS-Association/DTaaS/releases) and its [documentation](https://into-cps-association.github.io/DTaaS/) to install and use the DTaaS software platform.

You are welcome to open an [issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose)
if there is a suggestion to improve the software.

## :hammer_and_wrench: Development Setup

This is a mono repo containing code for
both the web client and the microservices code base.
Only the [web client](client) and
[library microservice](servers/lib)
components are functional at present.
Everything else is a work-in-progress.

Please see the [developer documentation](https://into-cps-association.github.io/DTaaS/development/developer/index.html) for more details.

## :balance_scale: License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under [the INTO-CPS License](./LICENSE.md).

The DTaaS software platform uses
[Træfik](https://github.com/traefik/traefik),
[ML Workspace](https://github.com/ml-tooling/ml-workspace),
[Grafana](https://github.com/grafana/grafana),
[InfluxDB](https://github.com/influxdata/influxdb) and
[RabbitMQ](https://github.com/rabbitmq/rabbitmq-server)
open-source components.
These software components have their own licenses.
