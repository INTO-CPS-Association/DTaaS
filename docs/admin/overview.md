# Installation Steps

There are two ways to install the DTaaS platform:

1. **DTaaS CLI (recommended).** A single `dtaas` command generates,
   validates, installs, and operates a deployment for every supported
   scenario. The [CLI installation guide](cli.md) covers the full workflow.
1. **Manual scenario packages (advanced).** Hand-edited docker compose
   packages for each scenario. Choose this path only when the CLI
   scenarios need customisation beyond what `dtaas.toml` offers, or
   when studying the deployment internals. Start at the
   [manual installation scenarios](#manual-installation-scenarios-advanced).

## Platform Services (Optional)

To install additional data/infrastructure services (MQTT, InfluxDB,
Grafana, and others), use the [Platform Services CLI](services/cli.md).

## Manual Installation Scenarios (Advanced)

!!! note
    These packages are the manual counterpart of what
    `dtaas generate-deployment` produces. The CLI performs the steps
    below automatically; prefer it unless you need to modify the
    deployment beyond its configuration options.

Start by selecting a scenario package.

### DTaaS

DTaaS scenarios focus on complete platform deployments that bundle the
web client, gateway, user workspaces, and core services. Choose a
scenario based on target environment, security needs, and GitLab
topology. Each scenario provides dedicated Install and Config pages,
plus scenario-specific operational documents.

| Scenario                                                           | Purpose                                                        |
| :----------------------------------------------------------------- | :------------------------------------------------------------- |
| [localhost](dtaas/localhost/install.md)                            | Single-user DTaaS package over HTTP                            |
| [localhost on portainer](guides/localhost-on-portainer/install.md) | GUI-based localhost deployment with Portainer for single-users |
| [secure server](dtaas/secure-server/install.md)                    | Compatibility package for secure server installs               |
| [secure server and GitLab](dtaas/secure-server-gitlab/install.md)  | Multi-user DTaaS package with integrated GitLab                |

### Workspace

Workspace scenarios focus on user workbench access, identity-provider
setup, and route-level protection. Choose localhost for rapid
onboarding with Dex, or secure server for production-style
Keycloak/OIDC deployment. Scenario pages are organised by Install,
Configuration, and identity-provider setup to make operations and
troubleshooting predictable.

| Scenario                                            | Purpose                                       |
| :-------------------------------------------------- | :-------------------------------------------- |
| [localhost](workspace/localhost/install.md)         | Single-user workspace deployment with Dex     |
| [secure server](workspace/secure-server/install.md) | Multi-user workspace deployment with Keycloak |

### Other

- [Vagrant](../developer/vagrant.md)

After selecting a scenario package, follow these steps:

### 1. Configure OAuth and Client Settings

- DTaaS packages:
  - Frontend OAuth setup: [client auth](client/auth.md)
  - Backend OAuth setup (forward-auth): [servers auth](servers/auth.md)
  - Client runtime settings: [client config](client/config.md)
- Workspace Dex localhost:
  - Configure `.env` and `config/dex-config.yaml`
- Workspace Keycloak secure server:
  - Follow package guides in
    [workspace config](workspace/secure-server/configuration.md)
    and
    [Keycloak config](workspace/secure-server/keycloak-setup.md)

### 2. Configure Filesystem and Certificates

For DTaaS or workspace server deployments:

- Create user workspaces under `files/`
- Provide TLS certs under `certs/`
- Create `config/.env` from example and update the same
- Create `config/client.js` from example and update the same
- Create `config/dex-config.yaml` from example (no changes needed)

### 3. Start Services

Run docker compose commands:

For DTaaS packages,

```bash
docker compose --env-file config/.env up -d
```

For workspace packages,

```bash
docker compose up -d
```

### 4. Validate and Iterate

- Confirm login flow in browser
- Validate workspace routes (`/user1`, `/user2`)
- Check service logs and health

## Independent Packages

Reusable package details are listed on [packages](packages.md).

## Walkthrough Videos

These walkthroughs are useful when selecting or validating an
installation scenario. When a `4x` recording exists, the preview and
MP4 link below use it.

### DTaaS localhost

<!-- markdownlint-disable MD013 -->
![DTaaS localhost walkthrough](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260419_dtaas/20260419_dtaas-localhost_4x.gif)

[Open MP4](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260419_dtaas/20260419_dtaas-localhost_4x.mp4)

### Multi-user DTaaS on secure server

<!-- markdownlint-disable MD013 -->
![Multi-user DTaaS on secure server walkthrough](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260419_dtaas/20260419_multi-user-dtaas-on-secure-server_4x.gif)

[Open MP4](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260419_dtaas/20260419_multi-user-dtaas-on-secure-server_4x.mp4)

### Workspace on localhost

<!-- markdownlint-disable MD013 -->
![Workspace on localhost walkthrough](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260413_workspace/20260413__Workspace_on_Localhost_web.gif)

[Open MP4](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260413_workspace/20260413__Workspace_on_Localhost_web.mp4)

### Multi-user workspace

<!-- markdownlint-disable MD013 -->
![Multi-user workspace walkthrough](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260413_workspace/20260413__Multi-User_Workspace_web.gif)

[Open MP4](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/v1.0/admin_and_user/20260413_workspace/20260413__Multi-User_Workspace_web.mp4)

## Administration :gear:

- [DTaaS CLI](cli.md)
- [GitLab server guidance](gitlab/index.md)
- [GitLab runner guidance](gitlab/runner-linux.md)
