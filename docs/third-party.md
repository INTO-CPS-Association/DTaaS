# Third Party Software

The DTaaS platform utilizes numerous third-party software components.
These software components have their own licenses.

## User Installations

The software included with the DTaaS installation scripts is listed below:

| Software Package                                                         | Usage     | License                                                                   |
| :----------------------------------------------------------------------- | :-------- | :------------------------------------------------------------------------ |
| [Docker CE](https://github.com/moby/moby)                                | mandatory | Apache 2.0 License                                                        |
| [ml-workspace-minimal](https://github.com/ml-tooling/ml-workspace)       | mandatory | Apache 2.0 License                                                        |
| [NodeJS](https://nodejs.org/en)                                          | mandatory | [Custom - Modified MIT](https://github.com/nodejs/node/blob/main/LICENSE) |
| [npm](https://npmjs.com)                                                 | mandatory | Artistic License 2.0                                                      |
| [serve](https://github.com/vercel/serve)                                 | mandatory | MIT                                                                       |
| [Træfik](https://github.com/traefik/traefik)                             | mandatory | MIT License                                                               |
| [Yarn](https://yarnpkg.com/)                                             | mandatory | BSD 2-Clause License                                                      |
| [Eclipse Mosquitto](https://github.com/eclipse/mosquitto)                | optional  | Eclipse Public License-2.0                                                |
| [GitLab CE](https://docs.gitlab.com/)                                    | optional  | MIT License                                                               |
| [Grafana](https://github.com/grafana/grafana)                            | optional  | GNU Affero General Public (AGPL) License v3.0                             |
| [InfluxDB](https://github.com/influxdata/influxdb)                       | optional  | Apache 2.0 License, MIT  License                                          |
| [Mongodb](https://github.com/mongodb/mongo)                              | optional  | AGPL License and Server Side Public License (SSPL) v1                     |
| [RabbitMQ](https://github.com/rabbitmq/rabbitmq-server)                  | optional  | Mozilla Public License                                                    |
| [Telegraf v1.28](https://github.com/influxdata/telegraf)                 | optional  | MIT License                                                               |
| [ThingsBoard](https://github.com/thingsboard/thingsboard)                | optional  | PostgreSQL License                                                        |

## Development Environments

In addition to all software included in user installations,
the DTaaS development environments may use the following
additional software packages.

| Software Package                                                    | Usage     | License              |
| :------------------------------------------------------------------ | :-------- | :------------------- |
| [Material for mkdocs](https://github.com/squidfunk/mkdocs-material) | mandatory | MIT License          |
| [Jupyter Lab](https://github.com/jupyterlab/jupyterlab)             | optional  | BSD 3-Clause License |
| [Microk8s v1.27](https://github.com/canonical/microk8s)             | optional  | Apache 2.0 License   |

## Package Dependencies

There are specific software packages included in the development of client,
library microservice and runner microservice. These packages can be seen
in the **package.json** file of the matching directories.

The plugins of _material for mkdocs_ might have their own licenses.
The list of plugins used are in **requirements.txt** file.
