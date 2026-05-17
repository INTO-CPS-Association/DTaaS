# Workspace Deployment Scenarios

Workspace deployments are focused on user workspace access patterns and
identity providers.

## Available Workspace Scenarios

| Scenario                                           | Purpose                                       |
| :------------------------------------------------- | :-------------------------------------------- |
| [Dex localhost](localhost/install.md)              | Single-user local workspace deployment        |
| [Keycloak secure server](secure-server/install.md) | Multi-user secure server deployment with OIDC |

## Notes

- Use workspace scenarios when the primary focus is workspace auth and
  per-user route access.
- Also see DTaaS package deployments that include the full DTaaS web platform for
  [localhost](../dtaas/localhost/install.md),
  [secure multi-user](../dtaas/secure-server/install.md), and
  [secure multi-user with integrated GitLab](../dtaas/secure-server-gitlab/install.md)
