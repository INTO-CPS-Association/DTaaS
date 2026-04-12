# GitLab Integration Guide

This guide summarizes how to integrate GitLab OAuth with DTaaS in current
package layouts.

## Integration Paths

There are two primary integration paths:

1. **Integrated package**:
   `deploy/dtaas/docker/secure-server_with_integrated-gitlab`
2. **Services CLI path**:
   `deploy/services/cli` + `deploy/services/cli/GITLAB_INTEGRATION.md`

## A. Integrated Package (`secure-server_with_integrated-gitlab`)

1. Start DTaaS + GitLab:

   ```bash
   cd deploy/dtaas/docker/secure-server_with_integrated-gitlab
   docker compose --env-file config/.env up -d
   ```

2. Wait until GitLab is healthy.

3. Create users in GitLab matching `USERNAME1` / `USERNAME2`.

4. Create OAuth applications in GitLab:

   - DTaaS Client Authorization
   - DTaaS Server Authorization

5. Update:

   - `config/client.js`
   - `config/.env`

6. Reload services:

   ```bash
   docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
   ```

## B. Services CLI GitLab Integration

Use the services project and follow the authoritative guide:

- `deploy/services/cli/GITLAB_INTEGRATION.md`

Typical flow:

1. Generate services project: `dtaas-services generate-project`
2. Configure `config/services.env`
3. Install GitLab: `dtaas-services install -s gitlab`
4. Apply OAuth values to DTaaS package config
5. Restart DTaaS `client` and `traefik-forward-auth`

## Post-Setup Checks

- `https://<host>/gitlab` is reachable (integrated package)
- DTaaS login redirects to expected OAuth provider
- Workspace routes (`/user1`, `/user2`) are protected

## Related Guides

- [DTaaS integrated package config](../dtaas/secure-server-gitlab/config.md)
- [Workspace secure server config](../workspace/secure-server/configuration.md)
