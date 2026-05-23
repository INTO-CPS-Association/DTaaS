# Configuration Reference

This document provides a detailed reference for each configuration file
in this package.

For the quick-start installation guide, see [README.md](README.md).

## Table of Contents

- [Configuration Reference](#configuration-reference)
  - [Table of Contents](#table-of-contents)
  - [config/.env - Docker Compose Environment](#configenv---docker-compose-environment)
    - [Server Settings](#server-settings)
    - [OAuth 2.0 Settings](#oauth-20-settings)
    - [How Variables Map to Services](#how-variables-map-to-services)
  - [config/client.js - DTaaS Web Client](#configclientjs---dtaas-web-client)
    - [Variable Reference](#variable-reference)
  - [config/conf.server - Traefik Forward-Auth Rules](#configconfserver---traefik-forward-auth-rules)
    - [Format](#format)
    - [Default Rules](#default-rules)
    - [Important Rules](#important-rules)
  - [certs - TLS Certificates](#certs---tls-certificates)
  - [files - User Workspace Directories](#files---user-workspace-directories)
  - [OAuth 2.0 Application Setup](#oauth-20-application-setup)
    - [DTaaS Client Authorization (React Frontend)](#dtaas-client-authorization-react-frontend)
    - [DTaaS Server Authorization (Traefik Forward-Auth)](#dtaas-server-authorization-traefik-forward-auth)
    - [Reload After Configuration](#reload-after-configuration)
  - [Adding More Users](#adding-more-users)
  - [Troubleshooting](#troubleshooting)

## config/.env - Docker Compose Environment

Source: `config/.env.example`

This file provides environment variables consumed by `docker-compose.yml`.

```bash
cp config/.env.example config/.env
```

### Server Settings

| Variable | Example | Description |
| :--- | :--- | :--- |
| `SERVER_DNS` | `intocps.org` | Domain name or IP address of the server. Do not include `https://`. |
| `USERNAME1` | `user1` | Path prefix and workspace name for the first user |
| `USERNAME2` | `user2` | Path prefix and workspace name for the second user |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name |

### OAuth 2.0 Settings

These are set from the external GitLab OAuth 2.0 applications.

| Variable | Example | Description |
| :--- | :--- | :--- |
| `OAUTH_URL` | `https://gitlab.com` | GitLab base URL used by traefik-forward-auth |
| `OAUTH_CLIENT_ID` | _(from GitLab)_ | Application ID from the **DTaaS Server Authorization** OAuth app |
| `OAUTH_CLIENT_SECRET` | _(from GitLab)_ | Secret from the **DTaaS Server Authorization** OAuth app |
| `OAUTH_SECRET` | _(random string)_ | Encryption key for OAuth session cookies. Example generation: `openssl rand -base64 32` |

### How Variables Map to Services

| Variable | Used by |
| :--- | :--- |
| `SERVER_DNS` | traefik, client, user1, user2, libms, traefik-forward-auth |
| `USERNAME1` / `USERNAME2` | user1, user2 (routing and workspace volumes) |
| `OAUTH_URL` | traefik-forward-auth (authorize, token, userinfo endpoints) |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | traefik-forward-auth |
| `OAUTH_SECRET` | traefik-forward-auth |

## config/client.js - DTaaS Web Client

Source: `config/client.js.example`

This JavaScript file is mounted into the React client container and
configures DTaaS web behaviour at runtime.

```bash
cp config/client.js.example config/client.js
```

### Variable Reference

| Variable | Example | Description |
| :--- | :--- | :--- |
| `REACT_APP_ENVIRONMENT` | `prod` | Environment name |
| `REACT_APP_URL` | `https://intocps.org` | Base URL of the DTaaS web application |
| `REACT_APP_URL_BASENAME` | `''` | Optional URL base path |
| `REACT_APP_URL_DTLINK` | `/lab` | URL path for the Digital Twin workbench |
| `REACT_APP_URL_LIBLINK` | `''` | URL path for the Library |
| `REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW` | `/preview/library` | Library preview page |
| `REACT_APP_WORKBENCHLINK_DT_PREVIEW` | `/preview/digitaltwins` | Digital Twins preview page |
| `REACT_APP_CLIENT_ID` | _(from GitLab)_ | Application ID from **DTaaS Client Authorization** OAuth app |
| `REACT_APP_AUTH_AUTHORITY` | `https://gitlab.com` | OAuth issuer URL |
| `REACT_APP_REDIRECT_URI` | `https://intocps.org/Library` | Redirect URI after sign-in |
| `REACT_APP_LOGOUT_REDIRECT_URI` | `https://intocps.org/` | Redirect URI after sign-out |
| `REACT_APP_GITLAB_SCOPES` | `openid profile read_user read_repository api` | Requested OAuth scopes |

## config/conf.server - Traefik Forward-Auth Rules

Source: `config/conf.server.example`

This file defines per-path authorisation rules for traefik-forward-auth.
Each rule restricts a URL path to specific email addresses.

```bash
cp config/conf.server.example config/conf.server
```

### Format

```text
rule.<NAME>.action=auth
rule.<NAME>.rule=PathPrefix(`/<path>`)
rule.<NAME>.whitelist=<email>
```

### Default Rules

```text
rule.libms.action=auth
rule.libms.rule=PathPrefix(`/lib`)

rule.onlyu1.action=auth
rule.onlyu1.rule=PathPrefix(`/user1`)
rule.onlyu1.whitelist=user1@emailservice.com

rule.onlyu2.action=auth
rule.onlyu2.rule=PathPrefix(`/user2`)
rule.onlyu2.whitelist=user2@emailservice.com
```

Replace usernames and email addresses to match the actual users.

### Important Rules

- Usernames in `config/.env` (`USERNAME1`, `USERNAME2`) must match
  `PathPrefix` values in `config/conf.server`.
- If a route exists in `docker-compose.yml` but has no rule in
  `config/conf.server`, the default behaviour allows any signed-in user.
- If a rule exists in `config/conf.server` but no router serves that path,
  the URL returns 404.

## certs - TLS Certificates

Place these TLS certificate files in `certs/`:

```text
certs/
|- fullchain.pem   # Public certificate or certificate chain
\- privkey.pem     # Private key
```

Certificates must be valid for `SERVER_DNS`.

## files - User Workspace Directories

Each user workspace container mounts a directory from `files/` as
its `/workspace` volume. `files/common/` is shared across all workspaces.

```text
files/
|- common/    # Shared files (mounted to /workspace/common)
|- user1/     # User 1 workspace files
\- user2/     # User 2 workspace files
```

Create user directories:

```bash
cp -R files/template files/<USERNAME>
sudo chown -R 1000:100 files/*
```

## OAuth 2.0 Application Setup

Two OAuth 2.0 applications are needed in the external GitLab instance.

### DTaaS Client Authorization (React Frontend)

1. In GitLab, open **Applications**.
2. Create an application:
   - **Name**: DTaaS Client Authorization
   - **Redirect URI**: `https://<SERVER_DNS>/Library`
   - **Confidential**: unticked (public SPA client)
   - **Scopes**: `openid`, `profile`, `read_user`, `read_repository`, `api`
3. Save the **Application ID** and set `REACT_APP_CLIENT_ID` in `config/client.js`.
4. Set `REACT_APP_AUTH_AUTHORITY` in `config/client.js` to the GitLab URL.

### DTaaS Server Authorization (Traefik Forward-Auth)

1. In GitLab, create another application:
   - **Name**: DTaaS Server Authorization
   - **Redirect URI**: `https://<SERVER_DNS>/_oauth`
   - **Confidential**: ticked
   - **Scopes**: `read_user`
2. Save **Application ID** and **Secret**.
3. Set `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_URL` in `config/.env`.
4. Generate `OAUTH_SECRET` and set it in `config/.env`.

### Reload After Configuration

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```

## Adding More Users

To add a third user:

1. Add service `user3` in `docker-compose.yml` based on `user1` / `user2`.
2. Add `USERNAME3=<name>` in `config/.env`.
3. Create `files/<name>` directory.
4. Add matching authorisation rule in `config/conf.server`.
5. Restart:

```bash
docker compose --env-file config/.env up -d
```

## Troubleshooting

### Authentication redirect loop

- Verify `OAUTH_URL` in `config/.env`.
- Verify `REACT_APP_AUTH_AUTHORITY` in `config/client.js`.
- Clear browser cookies for the domain.
- Check logs:

```bash
docker compose --env-file config/.env logs traefik-forward-auth
```

### 404 on user workspace

- Verify usernames are consistent across:
  - `config/.env`
  - `config/conf.server`
  - `docker-compose.yml`

### TLS warning in browser

- Replace `certs/fullchain.pem` and `certs/privkey.pem` with valid certificates.
