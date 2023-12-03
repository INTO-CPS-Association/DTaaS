# :factory: :left_right_arrow: :busts_in_silhouette: Digital Twin as a Service

## :grinning: Motivation

The Digital Twin as a Service (DTaaS) software platform is useful
to <font color="orange"> **Build, Use and Share** </font> digital twins (DTs).

<font color="orange">**Build**</font>: The DTs are built on the software platform
using the reusable DT components available on the platform.

<font color="orange">**Use**</font>: Use the DTs on the software platform.

<font color="orange">**Share**</font>: Share ready to use DTs with other users.
It is also possible to share the services offered by one DT with other users.

## :rocket: Install and Use

Please use the latest release available on
the [releases page](https://github.com/INTO-CPS-Association/DTaaS/releases)
and its [documentation](https://into-cps-association.github.io/DTaaS/)
to install and use the DTaaS software platform.

You are welcome to open an [issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose)
if there is a suggestion to improve the software.

If you find this repo useful for your research, please consider citing our paper:

```bibtex
@misc{talasila2023digital,
      title={Digital Twin as a Service (DTaaS): A Platform for Digital Twin Developers and Users}, 
      author={Prasad Talasila and Cláudio Gomes and Peter Høgh Mikkelsen and Santiago Gil Arboleda and Eduard Kamburjan and Peter Gorm Larsen},
      year={2023},
      eprint={2305.07244},
      archivePrefix={arXiv},
      primaryClass={cs.SE}
}
```

## :hammer_and_wrench: Development Setup

This is a mono repo containing code for
both the web client and the microservices code base.
The [web client](client),
[library](servers/lib) and
[runner](servers/execution/runner)
microservices are functional at present.
Everything else is a work-in-progress.

Please see the
[developer documentation](https://into-cps-association.github.io/DTaaS/development/developer/index.html)
for more details.

## :balance_scale: License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under [the INTO-CPS License](./LICENSE.md).

The DTaaS software platform uses
[Træfik](https://github.com/traefik/traefik),
[ML Workspace](https://github.com/ml-tooling/ml-workspace),
[Grafana](https://github.com/grafana/grafana),
[InfluxDB](https://github.com/influxdata/influxdb),
[MQTT](https://github.com/eclipse/mosquitto) and
[RabbitMQ](https://github.com/rabbitmq/rabbitmq-server)
open-source components.
These software components have their own licenses.
