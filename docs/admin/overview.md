# Overview :compass:

## Installation Scenarios :package:

The DTaaS repository provides installation assets in the following locations:

- `deploy/dtaas/docker/` for DTaaS application deployments
- `deploy/workspace/` for workspace-centred deployments
- `deploy/services/` for optional platform services
- `deploy/vagrant/` for virtual-machine-based deployment

Use the scenario pages listed below to select the most appropriate setup.

### DTaaS

DTaaS scenarios focus on complete platform deployments that bundle the web
client, gateway, user workspaces, and core services. Choose a scenario based on
target environment, security needs, and GitLab topology. Each scenario now
provides dedicated Install and Config pages, plus scenario-specific operational
documents.

| Scenario | Purpose | Source Directory |
| :--- | :--- | :--- |
| [localhost](dtaas/localhost/install.md) | Single-user DTaaS package over HTTP | `deploy/dtaas/docker/localhost` |
| [localhost on portainer](guides/localhost-on-portainer/install.md) | GUI-based localhost deployment with Portainer for single-users | `deploy/dtaas/docker/localhost` and `deploy/workspace/dex/localhost` |
| [secure server](dtaas/secure-server/install.md) | Compatibility package for secure server installs | `deploy/dtaas/docker/secure-server` |
| [secure server and GitLab](dtaas/secure-server-gitlab/install.md) | Multi-user DTaaS package with integrated GitLab | `deploy/dtaas/docker/secure-server_with_integrated-gitlab` |

### Workspace

Workspace scenarios focus on user workbench access, identity-provider setup,
and route-level protection. Choose localhost for rapid onboarding with Dex, or
secure server for production-style Keycloak/OIDC deployment. Scenario pages are
organized by Install, Configuration, and identity-provider setup to make
operations and troubleshooting predictable.

| Scenario | Purpose | Source Directory |
| :--- | :--- | :--- |
| [localhost](workspace/localhost/install.md) | Single-user workspace deployment with Dex | `deploy/workspace/dex/localhost` |
| [secure server](workspace/secure-server/install.md) | Multi-user workspace deployment with Keycloak | `deploy/workspace/keycloak/production` |

### Other

- [Platform services](services/cli.md)
- [Vagrant](../developer/vagrant.md)
- [Independent packages](packages.md)

The [installation steps](steps.md) page remains the recommended sequence guide.

## Administration :gear:

- [DTaaS CLI](cli.md)
- [GitLab server guidance](gitlab/index.md)
- [GitLab runner guidance](gitlab/runner-linux.md)
