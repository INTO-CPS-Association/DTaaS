# GitLab Integration Guide

This guide covers integration of a local GitLab instance with
a DTaaS server installation, and integrating the OAuth authorisation feature
with the DTaaS installation.

After following this guide, the GitLab instance will be integrated
as OAuth provider for both the DTaaS client application and
Traefik Forward Auth backend authorisation.

> [!IMPORTANT]
> The DTaaS client uses the `react-oidc-context` node package,
> which incorrectly causes authorisation redirects to use the `HTTPS` URL
> scheme. This is a
> [known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
> and forces us to use `HTTPS` for the DTaaS server. This means the server
> should be set up to use either <https://localhost> or <https://intocps.org>. This
> guide will henceforth use `intocps.org` to represent either localhost or a custom
> domain.

## Integration Paths

There are two primary integration paths:

1. **Integrated package**: See
   [installation page](../dtaas/secure-server-gitlab/install.md) `secure-server-integrated-gitlab-xx.zip`
   A functioning GitLab instance will be accessible over HTTPS
   at `https://intocps.org/gitlab`.
2. **Platform Services CLI**: See [CLI docs](../services/cli.md).
   A functioning GitLab instance will be accessible over HTTPS on
   the configured port, at `https://intocps.org:${GITLAB_PORT}/gitlab`
   (custom domain, default port 8090).

## Integration Steps

### 1. Create OAuth Tokens in GitLab

Follow these guides to create OAuth Application Tokens for -
[backend](../servers/auth.md) and
[client](../client/auth.md).

After this step the credentials for the application tokens titled
**DTaaS Server Authorization** and **DTaaS Client Authorization** will be available,
for use in the next step.

### 2. Use Valid Oauth Application Tokens

The OAuth tokens generated on the GitLab instance can now be used to enable
authorisation. Update the `config/client.js`
with **DTaaS Client Authorization** application details.
Update the `config/.env` with **DTaaS Server Authorization**
application details.

### 3. Create Users

Create users in GitLab matching `USERNAME1` / `USERNAME2` set in `config/.env`.

### 4. Restart Services

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```
