# GitLab Instance Integration Guide

This guide integrates the local GitLab CE instance with the DTaaS server,
enabling OAuth2 authorization for the DTaaS client application and
Traefik Forward Auth.

After following this guide, the GitLab instance will serve as the OAuth2
provider for both the DTaaS client application and the Traefik Forward Auth
backend authorization.

> [!IMPORTANT]
> The DTaaS client uses the `react-oidc-context` node package,
> which incorrectly causes authorization redirects to use the `HTTPS` URL
> scheme. This is a
> [known issue with the package](https://github.com/authts/react-oidc-context/issues/1288).
> The server must therefore be accessible over HTTPS. This guide uses `foo.com`
> to represent your domain name.

## Integration Steps

### 1. Set up DTaaS with the Integrated GitLab Instance

Follow the [README](README.md) to complete the initial DTaaS installation,
including the
[Post-Install GitLab Configuration](README.md#post-install-gitlab-configuration)
section. After this step you will have:

- DTaaS running at `https://foo.com`
- GitLab CE running at `https://foo.com/gitlab`

> [!NOTE]
> You may skip steps related to configuring OAuth application tokens during
> the initial setup. OAuth tokens are created in the next step below using
> the running GitLab instance.

### 2. Create OAuth Tokens in GitLab

Follow these guides to create OAuth application tokens in the integrated
GitLab instance:

- [Backend authorization](../../../docs/admin/servers/auth.md)
- [Client authorization](../../../docs/admin/client/auth.md)

After this step you will have credentials for the application tokens titled
**DTaaS Server Authorization** and **DTaaS Client Authorization**.

### 3. Use Valid OAuth Application Tokens

Update the configuration files with the OAuth tokens generated in Step 2:

1. Set `REACT_APP_CLIENT_ID` and `REACT_APP_AUTH_AUTHORITY` in
   `config/env.js` using the **DTaaS Client Authorization** token.
1. Set `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in `config/.env`
   using the **DTaaS Server Authorization** token.

## Restart Services

Reload the updated configuration into the running services:

```sh
docker compose --env-file config/.env up -d --force-recreate client
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

## Post Setup Usage

After completing this guide:

1. DTaaS is available at `https://foo.com` using the integrated GitLab
   instance for authentication.
1. GitLab is available at `https://foo.com/gitlab`, usable in the same
   manner as [https://gitlab.com](https://gitlab.com).
1. GitLab data, configuration, and logs are stored in:
   - `config/gitlab/` – configuration
   - `logs/` – logs
   - `data/` – persistent data
