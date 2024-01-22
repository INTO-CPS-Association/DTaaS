# Third Party Software

The DTaaS software platform uses many third-party software.
These software components have their own licenses.

## User Installations

The list of software included with DTaaS installation scripts are:

| Software Package                                                         | Usage     | License                                                                   |
| :----------------------------------------------------------------------- | :-------- | :------------------------------------------------------------------------ |
| [docker v24.0](https://github.com/moby/moby)                             | mandatory | Apache 2.0                                                                |
| [ml-workspace-minimal v0.13](https://github.com/ml-tooling/ml-workspace) | mandatory | Apache 2.0                                                                |
| [nodejs v20.10](https://nodejs.org/en)                                   | mandatory | [Custom - Modified MIT](https://github.com/nodejs/node/blob/main/LICENSE) |
| [npm v10.2](https://npmjs.com)                                           | mandatory | Artistic License 2.0                                                      |
| [serve](https://github.com/vercel/serve)                                 | mandatory | MIT                                                                       |
| [Træfik v2.10](https://github.com/traefik/traefik)                       | mandatory | MIT                                                                       |
| [yarn v1.22](https://yarnpkg.com/)                                       | mandatory | BSD 2-Clause                                                              |
| [eclipse-mosquitto v2](https://github.com/eclipse/mosquitto)             | optional  | Eclipse Public License-2.0                                                |
| [gitlab-ce v16.4](https://docs.gitlab.com/)                              | optional  | MIT                                                                       |
| [Grafana v10.1](https://github.com/grafana/grafana)                      | optional  | GNU Affero General Public (AGPL) License v3.0                             |
| [InfluxDB v2.7](https://github.com/influxdata/influxdb)                  | optional  | Apache2, MIT                                                              |
| [Mongodb v7.0](https://github.com/mongodb/mongo)                         | optional  | AGPL License and Server Side Public License (SSPL) v1                     |
| [Tabbitmq v3-management](https://github.com/rabbitmq/rabbitmq-server)    | optional  | Mozilla Public License                                                    |
| [Telegraf v1.28](https://github.com/influxdata/telegraf)                 | optional  | MIT                                                                       |

## Development Environments

Inaddition to all the software included in user installations,
the DTaaS development environments may use the following
additional software packages.

| Software Package                                                    | Usage     | License        |
| :------------------------------------------------------------------ | :-------- | :------------- |
| [Material for mkdocs](https://github.com/squidfunk/mkdocs-material) | mandatory | MIT            |
| [Docker-compose v2.20](https://github.com/docker/compose)           | optional  | Apache 2.0     |
| [Jupyter Lab](https://github.com/jupyterlab/jupyterlab)             | optional  | 3-Clause BSD   |
| [Microk8s v1.27](https://github.com/canonical/microk8s)             | optional  | Apache 2.0     |
| [Openssl](https://www.openssl.org)                                  | optional  | Custom License |

## Package Dependencies

There are specific software packages included in the development of client,
library microservice and runner microservice. These packages can be seen
in the **package.json** file of the matching directories.

The plugins of _material for mkdocs_ might have their own licenses.
The list of plugins used are in **requirements.txt** file.
