# Installation Steps

## Complete DTaaS Platform

Current DTaaS deployments are package-driven.
Start by selecting one of these package roots:

- [DTaaS localhost package over HTTP](dtaas/localhost/install.md)
- [DTaaS secure server compatibility package](dtaas/secure-server/install.md)
- [DTaaS secure server with integrated GitLab](dtaas/secure-server-gitlab/install.md)
- [workspace localhost deployment using Dex](workspace/localhost/install.md)
- [workspace secure server deployment using Keycloak](workspace/secure-server/install.md)

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
    [workspace config](workspace/secure-server/configuration.md)
    and
    [Keycloak config](workspace/secure-server/keycloak-setup.md)

### 3. Configure Filesystem and Certificates

For DTaaS or workspace server deployments:

- Create user workspaces under `files/`
- Provide TLS certs under `certs/`
- Create `config/.env` from example and update the same
- Create `config/client.js` from example and update the same
- Create `config/dex-config.yaml` from example (no changes needed)

### 4. Start Services

Run docker compose commands:

For DTaaS packagges,

```bash
docker compose --env-file config/.env up -d
```

For workspace packages,

```bash
docker compose up -d
```

### 5. Validate and Iterate

- Confirm login flow in browser
- Validate workspace routes (`/user1`, `/user2`)
- Check service logs and health

## Platform Services (Optional)

To install additional data/infrastructure services, use the
[Platform Services CLI](services/cli.md).

## Independent Packages

Reusable package details are listed on [packages](packages.md).
