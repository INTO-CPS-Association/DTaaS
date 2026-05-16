# GitLab Instance Integration Guide

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
> should be set up to use <https://intocps.org>. This
> guide will henceforth use `intocps.org` to represent either localhost or a custom
> domain.

## Integration Steps

### 1. Set up the DTaaS server over HTTPS

Follow the [existing guide](../../docker/README.md)
to set up the DTaaS web application over HTTPS connection on
a custom domain (<https://intocps.org>).

> [!NOTE]
> Steps related to configuring OAuth application tokens
> at <https://gitlab.com> may be ignored. The initial installation will host
> the local GitLab instance, on which the OAuth
> application tokens will later be created.

### 2. Set up the GitLab Instance

Follow the guide to set up a GitLab instance -
[README](./README.md).

A functioning GitLab instance will be accessible over HTTPS on
the configured port, at
`https://localhost:${GITLAB_PORT}/gitlab` (localhost) or
`https://intocps.org:${GITLAB_PORT}/gitlab` (custom domain, default port 8090).
GitLab is served directly from its own container — it is **not** proxied
through Traefik. Login credentials of the root user.

### 3. Create OAuth Tokens in GitLab

Follow these guides to create OAuth Application Tokens for -
[backend](../../../docs/admin/servers/auth.md) and
[client](../../../docs/admin/client/auth.md). Please note that
[backend](../../../docs/admin/servers/auth.md) is not required
for <https://localhost> installation.

After this step the credentials for the application tokens titled
**DTaaS Server Authorization** and **DTaaS Client Authorization**
will be available, for use in the next step.

### 4. Use Valid Oauth Application Tokens

The OAuth tokens generated on the GitLab instance can now be used to enable
authorisation.

If the DTaaS application is hosted at <https://localhost>, then configure
the following files:

1. **DTaaS Client Authorization** token in

If the DTaaS application is hosted at <https://intocps.org/>, then configure
the following files:

1. **DTaaS Client Authorization** token in
   _deploy/dtaas/docker/<installation-type/config/client.js_.
1. _deploy/dtaas/docker/<installation-type/config/.env_ - Add usernames,
   OAuth client ID and client secret from the
   **DTaaS Server Authorization** token

## Restart Services

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```

## Post Setup Usage

If everything has been set up correctly:

1. A functioning GitLab instance will be available at
   `https://intocps.org:${GITLAB_PORT}/gitlab` (default port `8090`) that you
   may use in a similar manner to [https://gitlab.com](https://gitlab.com).
   GitLab is served directly via its own HTTPS port — it is not routed
   through Traefik.
1. Data, configuration settings and logs pertaining to the GitLab installation
   are available on the DTaaS server within the directories:
   _deploy/services/cli/data/gitlab_, _deploy/services/cli/config/gitlab_,
   and _deploy/services/cli/log/gitlab_.
1. Traefik Forward Auth can be configured to use this GitLab instance
   for authorisation on the multi-user installation scenario (`intocps.org`)
   by pointing it at `https://intocps.org:${GITLAB_PORT}/gitlab`
   (not applicable for `localhost`).
