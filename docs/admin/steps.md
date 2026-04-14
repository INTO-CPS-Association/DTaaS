# Installation Steps

## Complete the DTaaS Platform

Current DTaaS deployments are package-driven.
Start by selecting one of these package roots:

- `deploy/dtaas/docker/localhost`
  (DTaaS localhost package over HTTP)
- `deploy/dtaas/docker/secure-server`
  (DTaaS secure server compatibility package)
- `deploy/dtaas/docker/secure-server_with_integrated-gitlab`
  (DTaaS secure server package with integrated GitLab)
- `deploy/workspace/dex/localhost`
  (workspace localhost deployment using Dex)
- `deploy/workspace/keycloak/production`
  (workspace secure server deployment using Keycloak)

## Recommended Sequence

### 1. Select Installation Scenario

Use [installation scenarios](overview.md) to select the right package and guide.

### 2. Configure OAuth and Client Settings

- DTaaS packages:
  - Frontend OAuth setup: [client auth](client/auth.md)
  - Backend OAuth setup (forward-auth): [servers auth](servers/auth.md)
  - Client runtime settings: [client config](client/config.md)
- Workspace Dex localhost:
  - Configure `.env` and `config/dex-config.yaml`
- Workspace Keycloak secure server:
  - Follow package guides in
    `deploy/workspace/keycloak/production/CONFIGURATION.md` and
    `deploy/workspace/keycloak/production/KEYCLOAK_SETUP.md`

### 3. Configure Filesystem and Certificates

For DTaaS or workspace server deployments:

- Create user workspaces under `files/`
- Provide TLS certs under `certs/`

For workspace Dex localhost deployment:

- Create `.env` and Dex config from examples

### 4. Start Services

Run compose commands from the selected package directory.

- DTaaS localhost package (HTTP):
  `deploy/dtaas/docker/localhost`
- DTaaS secure server package:
  `deploy/dtaas/docker/secure-server`
- DTaaS secure server with integrated GitLab package:
  `deploy/dtaas/docker/secure-server_with_integrated-gitlab`
- Workspace secure server:
  `deploy/workspace/keycloak/production`
- Workspace localhost (HTTP):
  `deploy/workspace/dex/localhost`

### 5. Validate and Iterate

- Confirm login flow in browser
- Validate workspace routes (`/user1`, `/user2`)
- Check service logs and health

## Platform Services (Optional)

To install additional data/infrastructure services, use the
[Platform Services CLI](services/cli.md) rooted in `deploy/services/cli`.

## Independent Packages

Reusable package details are listed on [packages](packages.md).
