# GitLab Integration Guide

This guide provides instructions for integrating a local GitLab instance with
a DTaaS server installation and integrating the OAuth 2.0 Authorization feature
with the DTaaS installation. The
[installation of Gitlab](index.md) should be completed before attempting
the integration steps described here.

After following this guide, the GitLab instance will be integrated
as an OAuth 2.0 provider for both the DTaaS client application and
Traefik Forward Auth backend authorization.

!!! note
    The DTaaS client uses the `react-oidc-context` node package,
    which incorrectly causes authorization redirects to use the `HTTPS` URL
    scheme. This is a
    [known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
    and forces us to use `HTTPS` for the DTaaS server. This means your server
    should be set up to use either <https://localhost> or <https://foo.com>. This
    guide will henceforth use `foo.com` to represent either localhost or a custom
    domain.

## Integration Steps

### 1. Set up the DTaaS server over HTTPS

The existing guides should be followed
to set up the DTaaS web application over HTTPS connection on either
[localhost](../localhost-secure.md) (<https://localhost>) or
a [custom domain](../server.md) (<https://foo.com>).

!!! note
    Steps related to configuring OAuth 2.0 application tokens
    at <https://gitlab.com> may be ignored. The initial installation will host
    the local GitLab instance, on which the OAuth 2.0
    application tokens will later be created.

### 2. Set up the GitLab Instance

The [guide](index.md) should be followed to set up a GitLab instance.

After this step, a
functioning GitLab instance (at either <https://localhost/gitlab>
or <https://foo.com/gitlab>) will be available,
along with login credentials for the root user.

### 3. Create Users

The newly installed GitLab only contains a `root` user. The users specified
in installation configuration files (`.env.local` / `.env.server`) must
be created in this integrated GitLab server.

### 4. Create OAuth 2.0 Tokens in GitLab

Log in as a non-root user and
follow these guides to create OAuth 2.0 Application Tokens for the
[backend](../servers/auth.md) and
[client](../client/auth.md). Note that
the [backend](../servers/auth.md) is not required
for <https://localhost> installation.

After this step, credentials for the application tokens titled
"DTaaS Server Authorization" and "DTaaS Client Authorization" will be available
for use in the next step.

### 5. Use Valid OAuth 2.0 Application Tokens

The OAuth 2.0 tokens generated on the GitLab instance can now be used to enable
authorization.

If the DTaaS platform is hosted at <https://localhost>, configure
the following files:

1. **DTaaS Client Authorization** token in
   _deploy/config/client/env.local.js_.
1. _deploy/docker/.env.local_ - Add localpath and username.

If the DTaaS platform is hosted at <https://foo.com>, configure
the following files:

1. **DTaaS Client Authorization** token in
   _deploy/config/client/env.js_.
1. _deploy/docker/.env.server_ - Add localpath and username,
   OAuth 2.0 client ID and client secret from the
   **DTaaS Server Authorization** token.

## Restart Services

### Localhost Installation

The updated OAuth 2.0 application configuration needs to be loaded into
the **client website** service.

```sh
cd deploy/docker
docker compose -f compose.local.yml --env-file .env.local up \
  -d --force-recreate client
```

### Production Server Installation

The updated OAuth 2.0 application configuration needs to be loaded into
the **client website** and the **forward-auth** services.

The production server can be installed with either **http**
or **https** option.
If it is installed with **http** option, run the following commands.

```sh
cd deploy/docker
docker compose -f compose.server.yml --env-file .env.server up \
  -d --force-recreate client
docker compose -f compose.server.yml --env-file .env.server up \
  -d --force-recreate traefik-forward-auth
```

If the production server is installed with **https** option,
run the following commands.

```sh
cd deploy/docker
docker compose -f compose.server.secure.yml --env-file .env.server up \
  -d --force-recreate client
docker compose -f compose.server.secure.yml --env-file .env.server up \
  -d --force-recreate traefik-forward-auth
```

## Post Setup Usage

If the setup has been completed correctly:

1. A functioning path-prefixed GitLab instance will be available at
   `https://foo.com/gitlab` that can be used in a similar manner to
   [https://gitlab.com](https://gitlab.com).
1. Data, configuration settings, and logs pertaining to the GitLab installation
   will be available on the DTaaS server within the directory:
   _deploy/services/gitlab_.
1. Traefik Forward Auth will use the path-prefixed GitLab instance for
   authorization on the multi-user installation scenario (i.e.,
   `foo.com` but not `localhost`).

## Federation of DTaaS Installations

It is possible to use a single GitLab to serve multiple instances of the DTaaS installations.
Please see
[DTaaS and DevOps](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250502_DTaaS-and-DevOps.mp4)
video for an overview of

* Features in DTaaS v0.7 (Timestamps: 00:00 to 10:24)
* DTaaS and DevOps (Timestamps: 10:25 to 16:04)
* Federation of DTaaS (Timestamps: 16:05 till the end)
