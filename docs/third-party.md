# Third Party Software

The DTaaS platform uses a range of third-party software components.
Each component remains subject to its upstream licence terms.

## Deployment and Runtime Software

The core deployment stack currently references the following software:

| Software Package | Usage | Licence |
| :--- | :--- | :--- |
| [Docker CE](https://github.com/moby/moby) | mandatory | Apache 2.0 |
| [Traefik](https://github.com/traefik/traefik) | mandatory | MIT |
| [Traefik Forward Auth](https://github.com/thomseddon/traefik-forward-auth) | optional | MIT |
| [GitLab CE](https://docs.gitlab.com/) | optional | MIT |
| [GitLab Runner](https://docs.gitlab.com/runner/) | optional | MIT |
| [Dex](https://github.com/dexidp/dex) | optional | Apache 2.0 |
| [Keycloak](https://www.keycloak.org/) | optional | Apache 2.0 |
| [RabbitMQ](https://github.com/rabbitmq/rabbitmq-server) | optional | MPL 2.0 |
| [MongoDB](https://github.com/mongodb/mongo) | optional | SSPL v1 |
| [Grafana](https://github.com/grafana/grafana) | optional | AGPL v3 |
| [InfluxDB](https://github.com/influxdata/influxdb) | optional | Apache 2.0 / MIT |
| [PostgreSQL](https://www.postgresql.org/) | optional | PostgreSQL Licence |
| [ThingsBoard](https://github.com/thingsboard/thingsboard) | optional | Apache 2.0 |

## Development Environments

In addition to runtime software, the development and documentation workflows
use the following tools.

| Software Package | Usage | Licence |
| :--- | :--- | :--- |
| [Node.js](https://nodejs.org/en) | mandatory | [Node.js licence](https://github.com/nodejs/node/blob/main/LICENSE) |
| [npm](https://www.npmjs.com/) | mandatory | Artistic Licence 2.0 |
| [Yarn](https://yarnpkg.com/) | optional | BSD 2-Clause |
| [Material for MkDocs](https://github.com/squidfunk/mkdocs-material) | mandatory | MIT |
| [JupyterLab](https://github.com/jupyterlab/jupyterlab) | optional | BSD 3-Clause |
| [MicroK8s](https://github.com/canonical/microk8s) | optional | Apache 2.0 |

## Package Dependencies

Additional third-party dependencies for client, servers, CLI, and tooling are
declared in:

- `client/package.json`
- `servers/**/package.json`
- `cli/pyproject.toml`
- `deploy/services/cli/pyproject.toml`
- `script/docs/mkdocs-requirements.txt`

Upstream dependency licences should be consulted in those manifests when
detailed licence auditing is required.
