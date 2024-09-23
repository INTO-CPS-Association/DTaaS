# GitLab Instance Integration Guide

This guide helps with setting up a GitLab instance on a DTaaS server, and
integrating its OAuth Authorization feature with the rest of web application.

> [!IMPORTANT]
> The DTaaS client uses the `react-oidc-context` node package,
> which incorrectly causes authorization redirects to use the `HTTPS` URL
> scheme. This is a
> [known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
> and forces us to use `HTTPS` for the DTaaS server. However, Traefik Forward
> Auth cannot work with self-signed or invalid certificates, which means you
> will be unable to use the GitLab instance locally at
> `https://localhost/gitlab` (as this would require a self-signed certificate).
> Hence, you will need a dedicated server with a TLS certificate.

After following this guide, the GitLab instance will be available at the URL:
`https://foo.com/gitlab`. Traefik Forward Auth will use the endpoints of this
URL for authorization.

## Integration Steps

### 1. Setting up the DTaaS server

Normally, to set up the web application, you would need to follow either
installation scenario in the guide - _deploy/README.md_. However, since `HTTPS`
is mandatory and localhost is not supported as of yet, you may follow this
guide - _deploy/docker/SERVER.md_.

> [!NOTE]
> The section "Add TLS Certificates (Optional)" should be treated as
> mandatory for now, to ensure `react-oidc-context` correctly redirects users
> for authorization.

> [!NOTE]
> You may ignore steps related to configuring OAuth application tokens
> at `https://gitlab.com`. We will be using this initial installation to host
> the local GitLab instance, on which we will create the OAuth application
> tokens.

After this step, you will have a functioning DTaaS server and client available
at your URL.

### 2. Setting up the GitLab Instance

Follow the guide to set up a GitLab instance -
_deploy/services/gitlab/README.md_.

After this step, and once you have run `gitlab-ctl reconfigure`, you will have a
functioning GitLab instance at `https://foo.com/localhost`, and the login
credentials of the root user.

### 3. Creating OAuth Tokens in GitLab

Follow these guides to create OAuth Application Tokens -
**_docs/admin/servers/auth.md_** and **_docs/admin/client/auth.md_**.

After this step you will have credentials for the application tokens titled
"DTaaS Server Authorization" and "DTaaS Client Authorization", which we will use
in the next step.

### 4. Using the Valid Oauth Application Tokens

We can now use the OAuth tokens generated on the GitLab instance to enable
authorization.

Configure the following files:

1. _deploy/config/client/env.js_ - Add the client ID from the **DTaaS Client
   Authorization** token
1. _deploy/docker/.env.server_ - Add the client ID and client secret from the
   **DTaaS Server Authorization** token

Restart the DTaaS server to use these token details in production.

## Post Setup Usage

If you have set up everything correctly:

1. You will have a functioning path-prefixed GitLab instance available to use in
   a similar manner to [https://gitlab.com](https://gitlab.com).
1. Data, configuration settings and logs pertaining to the GitLab installation
   will be available on the DTaaS server within the directory:
   _deploy/services/gitlab_.
1. Traefik Forward Auth will use the path-prefixed GitLab instance for
   authorization.
