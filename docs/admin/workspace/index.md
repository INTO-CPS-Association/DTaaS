# Workspace Deployment Scenarios

Workspace deployments cover how users reach their workspaces and which
identity provider signs them in.

## Available Workspace Scenarios

| Scenario                                           | Purpose                                       |
| :------------------------------------------------- | :-------------------------------------------- |
| [Dex localhost](localhost/install.md)              | Single-user local workspace deployment        |
| [Keycloak secure server](secure-server/install.md) | Multi-user secure server deployment with OIDC |

## Writes From the Client, and Jupyter XSRF Protection

The workspace installation packages configure the web client to offer only
the Workbench page. With the `full` profile, the Building Models page writes a
converted model back into the user's library through the workspace's own
Jupyter Contents API. This is the only place where the web client writes to a
workspace.

The Jupyter server can guard writes with a token that it sets as the `_xsrf`
cookie and expects echoed in an `X-XSRFToken` header. **The workspace image
DTaaS ships sets no such cookie and accepts the write.** The client sends the
header when the cookie is readable and leaves it out when it is not. Writes
from the client depend on this deployment assumption.

On a workspace that enables the protection, the cookie is `HttpOnly`, so
scripts cannot read it, the header is omitted and every write is refused. The
page still draws the model; it converts the model again on the next visit
instead of loading a stored file. The refusal is logged to the browser
console, so the two cases can be told apart.

If you enable XSRF protection on a workspace and want conversions to persist,
produce the `.glb` files outside the browser with `ifc-to-glb` from the
[ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) repository.
This is also the better route for a large model.

## Notes

- Use the workspace scenarios when you mainly need workspace authentication
  and per-user routes.
- The DTaaS package deployments include the full DTaaS web platform. See
  [localhost](../dtaas/localhost/install.md),
  [secure multi-user](../dtaas/secure-server/install.md) and
  [secure multi-user with integrated GitLab](../dtaas/secure-server-gitlab/install.md).
