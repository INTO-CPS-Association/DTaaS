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
@INPROCEEDINGS{talasila2023dtaas,
  author={Talasila, Prasad and Gomes, Cláudio and Mikkelsen, Peter Høgh and Arboleda, Santiago Gil and Kamburjan, Eduard and Larsen, Peter Gorm},
  booktitle={2023 IEEE Smart World Congress (SWC)},
  title={Digital Twin as a Service (DTaaS): A Platform for Digital Twin Developers and Users}, 
  year={2023},
  pages={1-8},
  keywords={digital twins;physical twin;automation;life cycle;composition},
  doi={10.1109/SWC57546.2023.10448890}}
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

Please see [third-party](docs/third-party.md) for details of
the third-party software included in the DTaaS.
