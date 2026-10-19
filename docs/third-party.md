# Third Party Software

The DTaaS platform uses a range of third-party software components.
Each component remains subject to its upstream licence terms.

## Deployment and Runtime Software

The core deployment stack currently references the following software:

| Software Package                                                           | Usage     | Licence            |
| :------------------------------------------------------------------------- | :-------- | :----------------- |
| [Docker CE](https://github.com/moby/moby)                                  | mandatory | Apache 2.0         |
| [Traefik](https://github.com/traefik/traefik)                              | mandatory | MIT                |
| [Traefik Forward Auth](https://github.com/thomseddon/traefik-forward-auth) | optional  | MIT                |
| [GitLab CE](https://docs.gitlab.com/)                                      | optional  | MIT                |
| [GitLab Runner](https://docs.gitlab.com/runner/)                           | optional  | MIT                |
| [Dex](https://github.com/dexidp/dex)                                       | optional  | Apache 2.0         |
| [Keycloak](https://www.keycloak.org/)                                      | optional  | Apache 2.0         |
| [RabbitMQ](https://github.com/rabbitmq/rabbitmq-server)                    | optional  | MPL 2.0            |
| [MongoDB](https://github.com/mongodb/mongo)                                | optional  | SSPL v1            |
| [Grafana](https://github.com/grafana/grafana)                              | optional  | AGPL v3            |
| [InfluxDB](https://github.com/influxdata/influxdb)                         | optional  | Apache 2.0 / MIT   |
| [PostgreSQL](https://www.postgresql.org/)                                  | optional  | PostgreSQL Licence |
| [ThingsBoard](https://github.com/thingsboard/thingsboard)                  | optional  | Apache 2.0         |

## Development Environments

In addition to runtime software, the development and documentation workflows
use the following tools.

| Software Package                                                    | Usage     | Licence                                                             |
| :------------------------------------------------------------------ | :-------- | :------------------------------------------------------------------ |
| [Node.js](https://nodejs.org/en)                                    | mandatory | [Node.js licence](https://github.com/nodejs/node/blob/main/LICENSE) |
| [npm](https://www.npmjs.com/)                                       | mandatory | Artistic Licence 2.0                                                |
| [Yarn](https://yarnpkg.com/)                                        | optional  | BSD 2-Clause                                                        |
| [Material for MkDocs](https://github.com/squidfunk/mkdocs-material) | mandatory | MIT                                                                 |
| [JupyterLab](https://github.com/jupyterlab/jupyterlab)              | optional  | BSD 3-Clause                                                        |
| [MicroK8s](https://github.com/canonical/microk8s)                   | optional  | Apache 2.0                                                          |

## Client Packages With Copyleft Terms

Most client dependencies are permissively licensed and are declared in
`client/package.json`. Three are named here because their terms carry
obligations that a redistributor has to meet, and a name in a lock file is not
a notice.

| Software Package                                                                             | Usage     | Licence                             |
| :------------------------------------------------------------------------------------------- | :-------- | :---------------------------------- |
| [@into-cps-association/bim-kit](https://www.npmjs.com/package/@into-cps-association/bim-kit) | mandatory | INTO-CPS Association Public Licence |
| [@into-cps-association/dtaas-sdk](https://github.com/INTO-CPS-Association/dtaas-sdk)         | mandatory | INTO-CPS Association Public Licence |
| [web-ifc](https://github.com/ThatOpen/engine_web-ifc)                                        | mandatory | MPL 2.0                             |

`web-ifc` is the IFC geometry kernel, and it reaches the client through
`bim-kit`, which embeds its WebAssembly build so that a deployment serves no
extra file. Embedding it does not change its terms.

MPL 2.0 is file-level copyleft and is compatible with redistributing DTaaS under
the INTO-CPS Licence. What it requires of anyone shipping a build:

- **The source of the MPL-covered files has to be available** to whoever
  receives that build. Upstream is linked above, and the version in use is the
  one `client/yarn.lock` resolves for `web-ifc`.
- **The notice has to travel with the artifact.** Embedding the kernel inside a
  JavaScript chunk makes its provenance invisible in the built output, which is
  the reason this table exists instead of a pointer to `package.json`.
- **A modified MPL file stays MPL.** `bim-kit` uses `web-ifc` as a dependency and
  does not fork it, so the boundary is the package boundary.

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
