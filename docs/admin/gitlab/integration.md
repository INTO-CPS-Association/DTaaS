# GitLab Integration Guide

This guide connects a local GitLab instance to a DTaaS server
installation and sets GitLab up as the OAuth provider for DTaaS.

Afterwards, the GitLab instance is the OAuth provider for both the DTaaS
client application and the Traefik forward-auth backend authorisation.

!!! important
    The DTaaS client uses the `react-oidc-context` node package, which
    incorrectly makes authorisation redirects use the `HTTPS` URL scheme.
    This is a
    [known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
    and it forces the DTaaS server to use `HTTPS`, either at
    <https://localhost> or at <https://intocps.org>. The rest of this guide
    uses `intocps.org` to stand for either localhost or a custom domain.

## Integration Paths

There are two integration paths:

1. **Integrated package**: see the
   [installation page](../dtaas/secure-server-gitlab/install.md) of the
   `dtaas-secure-server-integrated-gitlab-xx.zip` package.
   GitLab is then available over HTTPS at `https://intocps.org/gitlab`.
2. **Platform Services CLI**: see the [CLI docs](../services/cli.md).
   GitLab is then available over HTTPS on the configured port, at
   `https://intocps.org:${GITLAB_PORT}/gitlab`
   (custom domain, default port 8090).

## Integration Steps

### 1. Create OAuth Tokens in GitLab

Follow these guides to create OAuth application tokens for the
[backend](../servers/auth.md) and the
[client](../client/auth.md).

This step produces the credentials of the applications named
**DTaaS Server Authorization** and **DTaaS Client Authorization**,
which the next step uses.

### 2. Use Valid OAuth Application Tokens

Put the OAuth application details into the configuration files: the
**DTaaS Client Authorization** details go into `config/client.js`, and
the **DTaaS Server Authorization** details go into `config/.env`.

### 3. Create Users

Create GitLab users that match `USERNAME1` / `USERNAME2` in
`config/.env`.

### 4. Restart Services

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```
