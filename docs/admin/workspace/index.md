# Workspace Deployment Scenarios

Workspace deployments are focused on user workspace access patterns and
identity providers.

## Available Workspace Scenarios

| Scenario | Purpose | Source Directory |
| :--- | :--- | :--- |
| [Dex localhost](localhost/install.md) | Single-user local workspace deployment | `deploy/workspace/dex/localhost` |
| [Keycloak secure server](secure-server/install.md) | Multi-user secure server deployment with OIDC | `deploy/workspace/keycloak/production` |

## Notes

- Use workspace scenarios when the primary focus is workspace auth and
  per-user route access.
- For DTaaS package deployments that include the full DTaaS web platform,
  use `../dtaas/localhost/install.md`, `../dtaas/server/install.md`, or
  `../dtaas/secure-server-gitlab/install.md`.
