# Overview

## Installation Scenarios

The DTaaS repository provides installation assets in the following locations:

- `deploy/dtaas/docker/` for DTaaS application deployments
- `deploy/workspace/` for workspace-centred deployments
- `deploy/services/` for optional platform services
- `deploy/vagrant/` for virtual-machine-based deployment

Use the scenario pages listed below to select the most appropriate setup.

### DTaaS

| Scenario | Purpose | Source Directory |
| :--- | :--- | :--- |
| [localhost](dtaas/localhost.md) | Single-user DTaaS package over HTTP | `deploy/dtaas/docker/localhost` |
| [localhost on portainer](guides/localhost_portainer.md) | GUI-based localhost deployment with Portainer | `deploy/workspace/dex/localhost` |
| [secure localhost](dtaas/secure-localhost.md) | Single-user DTaaS package over HTTPS | `deploy/dtaas/docker/secure-localhost` |
| [server](dtaas/server.md) | Multi-user DTaaS package with external GitLab | `deploy/dtaas/docker/server` |
| [secure server](dtaas/secure-server.md) | Compatibility package for secure server installs | `deploy/dtaas/docker/secure-server` |
| [secure server and GitLab](dtaas/secure-server-gitlab.md) | Multi-user DTaaS package with integrated GitLab | `deploy/dtaas/docker/secure-server_with_integrated-gitlab` |

### Workspace

| Scenario | Purpose | Source Directory |
| :--- | :--- | :--- |
| [localhost](workspace/dex-localhost.md) | Single-user workspace deployment with Dex | `deploy/workspace/dex/localhost` |
| [secure server](workspace/keycloak-server-secure.md) | Multi-user workspace deployment with Keycloak | `deploy/workspace/keycloak/production` |

### Other

- [Platform services](services/cli.md)
- [Vagrant](vagrant.md)
- [Independent packages](packages.md)

The [installation steps](steps.md) page remains the recommended sequence guide.

## Administration

- [DTaaS CLI](cli.md)
- [GitLab server guidance](gitlab/index.md)
- [GitLab runner guidance](gitlab/runner.md)
