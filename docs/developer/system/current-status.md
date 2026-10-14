# Current Status

DTaaS is a monorepo under active development. It has deployment
scenarios meant for production use, and work continues on execution
automation, reusable assets and contributor tooling.

![Current development status](current-status-developer.png)

A more detailed C4 architectural representation is
![current-status-developer-c4.png](current-status-developer-c4.png).

## Platform Snapshot

- React 19 client, built with Vite, with a typed backend abstraction over
  GitLab APIs.
- NestJS library, runner and logger microservices.
- `@into-cps-association/dt-automation`, an npm library with the data,
  state and GitLab operations for creating, managing and executing DTs.
- `@into-cps-association/bim-kit`, maintained in the `ifc-utils`
  repository, for the Building Models page.
- `gitlab-common`, a Python library shared by the two CLIs.
- Python CLIs for DTaaS administration (`dtaas`) and platform services
  management (`dtaas-services`).
- Scenario-based admin documentation for DTaaS and workspace deployments.

## Security and Access Model

Two authorization patterns are in use:

- GitLab-centred OAuth flows for DTaaS package scenarios.
- Keycloak-centred OIDC flows for secure workspace scenarios.

Traefik and its forward-auth middleware protect routes and mediate
access at the gateway.

## Workspaces and Assets

Workspace deployments give each user an isolated environment and share
assets between users. Asset management currently uses file-system
workflows and the library microservice, which is still evolving.

## Current Engineering Focus

- Improve scenario automation and configuration guidance.
- Strengthen test coverage and CI reliability across packages.
- Continue improving DevOps execution visibility in the client UI.
- Evaluate the proposed [client extension architecture](extensions.md),
  which adds domain-specific pages through npm packages.
- Keep package publishing and release flows consistent across npm, Docker, and
  Poetry-based tools.

Contributions that improve reproducibility, documentation quality and
integration between components are welcome.
