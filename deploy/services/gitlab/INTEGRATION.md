# GitLab Instance Integration Guide

This guide helps with integration of a local GitLab instance with
a DTaaS server installation, and integrating the OAuth Authorization feature
with the DTaaS installation.

After following this guide, the GitLab instance will be integrated
as OAuth provider for both DTaaS client application and
Traefik Forward Auth backend authorization.

> [!IMPORTANT]
> The DTaaS client uses the `react-oidc-context` node package,
> which incorrectly causes authorization redirects to use the `HTTPS` URL
> scheme. This is a
> [known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
> and forces us to use `HTTPS` for the DTaaS server. This means your server
> should be set up to use either <https://localhost> or <https://foo.com>. This
> guide will henceforth use `foo.com` to represent either localhost or a custom
> domain.

## Integration Steps

### 1. Set up the DTaaS server over HTTPS

Follow the [existing guide](../../docker/README.md)
to set up the DTaaS web application over HTTPS connection on either
localhost (<https://localhost>) or a custom domain (<https://foo.com>).

> [!NOTE]
> You may ignore steps related to configuring OAuth application tokens
> at <https://gitlab.com>. We will be using the initial installation to host
> the local GitLab instance, on which we will later create the OAuth
> application tokens.

### 2. Set up the GitLab Instance

Follow the guide to set up a GitLab instance -
[README](./README.md).

After this step, and once you run `gitlab-ctl reconfigure`, you will have a
functioning GitLab instance (at either <https://localhost/gitlab>
or <https://foo.com/gitlab>).
Login credentials of the root user.

### 3. Create OAuth Tokens in GitLab

Follow these guides to create OAuth Application Tokens for -
[backend](../../../docs/admin/servers/auth.md) and
[client](../../../docs/admin/client/auth.md). Please note that
[backend](../../../docs/admin/servers/auth.md) is not required
for <https://localhost> installation.

After this step you will have credentials for the application tokens titled
"DTaaS Server Authorization" and "DTaaS Client Authorization", which we will use
in the next step.

### 4. Use Valid Oauth Application Tokens

We can now use the OAuth tokens generated on the GitLab instance to enable
authorization.

If the DTaaS application is hosted at <https://localhost>, then configure

Configure the following files:

1. _deploy/config/client/env.js_ - Add the client ID from the **DTaaS Client
   Authorization** token
2. _deploy/docker/.env.server_ - Add the client ID and client secret from the
   **DTaaS Server Authorization** token

Restart the DTaaS server to use these token details in production.

## Post Setup Usage

If you have set up everything correctly:

1. You will have a functioning path-prefixed GitLab instance available at
   `https://foo.com/gitlab` that you may use in a similar manner to
   [https://gitlab.com](https://gitlab.com).
1. Data, configuration settings and logs pertaining to the GitLab installation
   will be available on the DTaaS server within the directory:
   _deploy/services/gitlab_.
1. Traefik Forward Auth will use the path-prefixed GitLab instance for
   authorization on the multi-user installation scenario i.e. `foo.com` (but not on `localhost`).