# Configuration Reference

This document provides a detailed reference for every configuration file
in this package. For the quick-start installation guide, see
[README.md](README.md).

> [!IMPORTANT]
> The hostname `intocps.org` is used for illustration throughout
> this guide. Replace it with the actual server hostname of your
> installation.

---

## Table of Contents

- [Configuration Reference](#configuration-reference)
  - [Table of Contents](#table-of-contents)
  - [config/.env — Docker Compose Environment](#configenv--docker-compose-environment)
    - [Server Settings](#server-settings)
    - [OAuth 2.0 Settings](#oauth-20-settings)
    - [How Variables Map to Services](#how-variables-map-to-services)
  - [config/env.js — DTaaS Web Client](#configenvjs--dtaas-web-client)
    - [Variable Reference](#variable-reference)
    - [Example](#example)
  - [config/conf.server — Traefik Forward-Auth Rules](#configconfserver--traefik-forward-auth-rules)
    - [Format](#format)
    - [Default Rules](#default-rules)
    - [Important Rules](#important-rules)
  - [certs/ — TLS Certificates](#certs--tls-certificates)
  - [files/ — User Workspace Directories](#files--user-workspace-directories)
  - [OAuth 2.0 Application Setup](#oauth-20-application-setup)
    - [DTaaS Client Authorization (React Frontend)](#dtaas-client-authorization-react-frontend)
    - [DTaaS Server Authorization (Traefik Forward-Auth)](#dtaas-server-authorization-traefik-forward-auth)
    - [Reload After Configuration](#reload-after-configuration)
  - [Adding More Users](#adding-more-users)
  - [Troubleshooting](#troubleshooting)
    - [GitLab Takes Too Long to Start](#gitlab-takes-too-long-to-start)
    - [Authentication Redirect Loop](#authentication-redirect-loop)
    - [404 on User Workspace](#404-on-user-workspace)
    - [GitLab "502 Bad Gateway"](#gitlab-502-bad-gateway)
    - [Self-Signed Certificate Warning in Browser](#self-signed-certificate-warning-in-browser)

---

## config/.env — Docker Compose Environment

Source: `config/.env.example`

This file provides environment variables consumed by `docker-compose.yml`.

```bash
cp config/.env.example config/.env
```

### Server Settings

| Variable | Example | Description |
| :--- | :--- | :--- |
| `SERVER_DNS` | `intocps.org` | Domain name or IP address of the server. Do **not** include `https://`. |
| `USERNAME1` | `user1` | Path prefix and workspace name for the first user |
| `USERNAME2` | `user2` | Path prefix and workspace name for the second user |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name (rarely needs changing) |

### OAuth 2.0 Settings

These are populated after the GitLab instance is running and
OAuth 2.0 applications have been created (see [OAuth 2.0 Application Setup](#oauth-20-application-setup)).

| Variable | Example | Description |
| :--- | :--- | :--- |
| `OAUTH_URL` | `https://intocps.org/gitlab` | GitLab instance URL used for browser-side authorization redirects. No trailing slash. |
| `OAUTH_CLIENT_ID` | _(from GitLab)_ | Application ID from the **DTaaS Server Authorization** OAuth 2.0 application |
| `OAUTH_CLIENT_SECRET` | _(from GitLab)_ | Secret from the **DTaaS Server Authorization** OAuth 2.0 application |
| `OAUTH_SECRET` | _(random string)_ | Encryption key for OAuth session cookies. Generate with: `openssl rand -base64 32` |

### How Variables Map to Services

| Variable | Used by |
| :--- | :--- |
| `SERVER_DNS` | traefik, client, user1, user2, libms, traefik-forward-auth, gitlab |
| `USERNAME1` / `USERNAME2` | user1, user2 (routing and workspace volumes) |
| `OAUTH_URL` | traefik-forward-auth (browser redirect URL) |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | traefik-forward-auth |
| `OAUTH_SECRET` | traefik-forward-auth |

---

## config/env.js — DTaaS Web Client

Source: `config/env.js.example`

This JavaScript file is mounted into the React client container and
configures the DTaaS web application at runtime.

```bash
cp config/env.js.example config/env.js
```

### Variable Reference

| Variable | Example | Description |
| :--- | :--- | :--- |
| `REACT_APP_ENVIRONMENT` | `prod` | Environment name. Use `prod` for production. |
| `REACT_APP_URL` | `https://intocps.org` | Base URL of the DTaaS web application |
| `REACT_APP_URL_BASENAME` | `''` | Optional URL base path (leave empty for root hosting) |
| `REACT_APP_URL_DTLINK` | `/lab` | URL path for the Digital Twin workbench |
| `REACT_APP_URL_LIBLINK` | `''` | URL path for the Library |
| `REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW` | `/preview/library` | Library preview page |
| `REACT_APP_WORKBENCHLINK_DT_PREVIEW` | `/preview/digitaltwins` | Digital Twins preview page |
| `REACT_APP_CLIENT_ID` | _(from GitLab)_ | Application ID from the **DTaaS Client Authorization** OAuth 2.0 application |
| `REACT_APP_AUTH_AUTHORITY` | `https://intocps.org/gitlab` | URL of the GitLab instance (OAuth 2.0 issuer) |
| `REACT_APP_REDIRECT_URI` | `https://intocps.org/Library` | Where GitLab sends users after sign-in |
| `REACT_APP_LOGOUT_REDIRECT_URI` | `https://intocps.org/` | Where users land after sign-out |
| `REACT_APP_GITLAB_SCOPES` | `openid profile read_user read_repository api` | OAuth 2.0 scopes requested during sign-in |

### Example

```js
if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'prod',
    REACT_APP_URL: 'https://intocps.org',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',
    REACT_APP_CLIENT_ID: '<APPLICATION_ID>',
    REACT_APP_AUTH_AUTHORITY: 'https://intocps.org/gitlab',
    REACT_APP_REDIRECT_URI: 'https://intocps.org/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'https://intocps.org/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
  };
};
```

---

## config/conf.server — Traefik Forward-Auth Rules

Source: `config/conf.server.example`

This file defines per-path authorization rules for
[traefik-forward-auth](https://github.com/thomseddon/traefik-forward-auth).
Each rule restricts a URL path to specific GitLab email addresses.

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

Replace `user1`, `user2`, and the email addresses to match the actual
GitLab accounts.

### Important Rules

> [!WARNING]
> **Usernames must be consistent.** The usernames in `config/.env`
> (`USERNAME1`, `USERNAME2`) must match the `PathPrefix` values in
> `config/conf.server`. Mismatches cause routing or authorization
> failures.

| Scenario | Behavior |
| :--- | :--- |
| Route in `config/.env` but **missing** from `config/conf.server` | Any signed-in user can access the route (default forward-auth behavior) |
| Route in `config/conf.server` but **missing** from `config/.env` | Traefik returns **404** (route not served) |
| The `/lib` rule has **no whitelist** | Any signed-in user can access the library service |

---

## certs/ — TLS Certificates

Place the TLS certificate files here:

```text
certs/
├── fullchain.pem   # Public certificate (or certificate chain)
└── privkey.pem     # Private key
```

The certificates must be valid for `SERVER_DNS` (e.g. `intocps.org`
or `*.intocps.org`).

Obtain certificates via:

```bash
# Using certbot (Let's Encrypt)
sudo certbot certonly --standalone -d intocps.org
sudo cp /etc/letsencrypt/live/intocps.org/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/intocps.org/privkey.pem   certs/
```

If the certificate files are absent or invalid, Traefik runs with
self-signed certificates. Browsers will show a security warning.

---

## files/ — User Workspace Directories

Each user workspace container mounts a directory from `files/` as
its `/workspace` volume. The `files/common/` directory is shared
read-only across all workspaces.

```text
files/
├── common/    # Shared files (mounted to /workspace/common in each container)
├── user1/     # User 1 workspace files
└── user2/     # User 2 workspace files
```

Create directories for each user:

```bash
cp -R files/user1 files/<USERNAME>
sudo chown -R 1000:100 files/*
```

The UID `1000` and GID `100` match the default user inside the
workspace container.

---

## OAuth 2.0 Application Setup

After the GitLab instance is running, two OAuth 2.0 applications must be
registered to connect DTaaS and Traefik forward-auth to the integrated
GitLab.

### DTaaS Client Authorization (React Frontend)

1. In GitLab, go to **Admin Area → Applications** (or the user's
   **Edit Profile → Applications**).
1. Create a new application:
   - **Name**: DTaaS Client Authorization
   - **Redirect URI**: `https://intocps.org/Library`
   - **Confidential**: unticked (public SPA client)
   - **Scopes**: `openid`, `profile`, `read_user`, `read_repository`, `api`
1. Save the **Application ID**.
1. Set `REACT_APP_CLIENT_ID` in `config/env.js` to this Application ID.
1. Set `REACT_APP_AUTH_AUTHORITY` in `config/env.js` to
   `https://intocps.org/gitlab`.

For full details, see the
[client auth documentation](https://into-cps-association.github.io/DTaaS/version0.8/admin/client/auth.html).

### DTaaS Server Authorization (Traefik Forward-Auth)

1. In GitLab, go to **Admin Area → Applications**.
1. Create a new application:
   - **Name**: DTaaS Server Authorization
   - **Redirect URI**: `https://intocps.org/_oauth`
   - **Confidential**: ticked
   - **Scopes**: `read_user`
1. Save the **Application ID** and **Secret**.
1. Set `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in `config/.env`.
1. Set `OAUTH_URL` in `config/.env` to `https://intocps.org/gitlab`.
1. Generate `OAUTH_SECRET`: `openssl rand -base64 32` and set it in
   `config/.env`.

For full details, see the
[server auth documentation](https://into-cps-association.github.io/DTaaS/version0.8/admin/servers/auth.html).

### Reload After Configuration

After updating the OAuth 2.0 tokens in the configuration files, reload
the affected services:

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```

---

## Adding More Users

To add a third user:

1. **Add service to `docker-compose.yml`:**

   ```yaml
   user3:
     image: intocps/workspace:main-967bc10
     restart: unless-stopped
     environment:
       - MAIN_USER=${USERNAME3:-user3}
     volumes:
       - "./files/common:/workspace/common"
       - "./files/${USERNAME3:-user3}:/workspace"
     labels:
       - "traefik.enable=true"
       - "traefik.http.routers.u3.rule=Host(`${SERVER_DNS:-localhost}`) && PathPrefix(`/${USERNAME3:-user3}`)"
       - "traefik.http.routers.u3.tls=true"
       - "traefik.http.routers.u3.middlewares=traefik-forward-auth"
     networks:
       - users
   ```

1. **Add to `config/.env`:**

   ```bash
   USERNAME3=alice
   ```

1. **Create workspace directory:**

   ```bash
   cp -R files/user1 files/alice
   sudo chown -R 1000:100 files/alice
   ```

1. **Add authorization rule to `config/conf.server`:**

   ```text
   rule.onlyu3.action=auth
   rule.onlyu3.rule=PathPrefix(`/alice`)
   rule.onlyu3.whitelist=alice@emailservice.com
   ```

1. **Create a GitLab account** for `alice` in the integrated GitLab instance.

1. **Restart:**

   ```bash
   docker compose --env-file config/.env up -d
   ```

---

## Troubleshooting

### GitLab Takes Too Long to Start

GitLab CE requires significant resources. The first startup may take
5–10 minutes. Monitor with `docker compose --env-file config/.env logs -f gitlab`.
Ensure the host has at least 4 GB RAM available for GitLab.

### Authentication Redirect Loop

1. Verify `OAUTH_URL` in `config/.env` matches the URL accessible from
   the user's browser (e.g. `https://intocps.org/gitlab`).
1. Verify `REACT_APP_AUTH_AUTHORITY` in `config/env.js` matches the same URL.
1. Clear browser cookies for the domain.
1. Check traefik-forward-auth logs:
   `docker compose --env-file config/.env logs traefik-forward-auth`

### 404 on User Workspace

- Ensure `USERNAME1`/`USERNAME2` in `config/.env` matches the
  `PathPrefix` in `config/conf.server`.
- Ensure a corresponding service exists in `docker-compose.yml`.

### GitLab "502 Bad Gateway"

GitLab is still initializing. Wait until `docker ps` shows the
container as `healthy`.

### Self-Signed Certificate Warning in Browser

TLS certificate files are missing or invalid in `certs/`. Replace them
with valid certificates for your domain.
