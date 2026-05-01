# Current Status :clipboard:

DTaaS is an active monorepo with production-oriented deployment scenarios and
ongoing evolution of execution automation, reusable assets, and contributor
tooling.

![Current development status](current-status-developer.png)

A more detailed C4 architectural representation is
![current-status-developer-c4.png](current-status-developer-c4.png).

## Platform Snapshot

- React 19 client with typed backend abstraction over GitLab APIs.
- NestJS-based library and runner microservices.
- Python CLIs for DTaaS administration and platform services management.
- Scenario-based admin documentation for DTaaS and workspace deployments.

## Security and Access Model :lock:

Two complementary authorization patterns are in active use:

- GitLab-centered OAuth flows for DTaaS package scenarios.
- Keycloak-centered OIDC flows for secure workspace scenarios.

Route protection and gateway mediation are managed through Traefik and
forward-auth patterns.

## Workspaces and Assets :technologist:

Workspace deployments provide user-isolated environments and shared asset access
patterns. Asset management currently spans file-system workflows and evolving
library microservice functionality.

## Current Engineering Focus

- Improve scenario automation and configuration guidance.
- Strengthen test coverage and CI reliability across packages.
- Continue improving DevOps execution visibility in the client UI.
- Keep package publishing and release flows consistent across npm, Docker, and
  Poetry-based tools.

Contributions that improve reproducibility, documentation quality, and
cross-component integration are especially valuable.
