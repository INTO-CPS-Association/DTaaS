# Workspace Deployment Scenarios

Workspace deployments are focused on user workspace access patterns and
identity providers.

## Available Workspace Scenarios

| Scenario | Purpose | Source Directory |
| :--- | :--- | :--- |
| [Dex localhost](dex-localhost.md) | Single-user local workspace deployment | `deploy/workspace/dex/localhost` |
| [Keycloak secure server](keycloak-server-secure.md) | Multi-user secure server deployment with OIDC | `deploy/workspace/keycloak/production` |

## Notes

- Use workspace scenarios when your primary focus is workspace auth and
  per-user route access.
- For DTaaS package deployments that include the full DTaaS web platform,
  use `../dtaas/localhost.md`, `../dtaas/server.md`, or
  `../dtaas/secure-server-gitlab.md`.
