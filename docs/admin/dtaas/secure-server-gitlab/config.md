# :gear: Configuration Reference

This document provides a detailed reference for every configuration file
in this package. For the quick-start installation guide, see
[install.md](install.md).

> [!IMPORTANT]
> The hostname `intocps.org` is used for illustration throughout
> this guide. Replace it with the actual server hostname of the
> installation.

---

## :page_facing_up: Table of Contents

- [:gear: Configuration Reference](#gear-configuration-reference)
  - [:page\_facing\_up: Table of Contents](#page_facing_up-table-of-contents)
  - [:wrench: config/.env — Docker Compose Environment](#wrench-configenv--docker-compose-environment)
    - [:desktop\_computer: Server Settings](#desktop_computer-server-settings)
    - [:key: OAuth 2.0 Settings](#key-oauth-20-settings)
    - [:link: How Variables Map to Services](#link-how-variables-map-to-services)
  - [:globe\_with\_meridians: config/client.js — DTaaS Web Client](#globe_with_meridians-configclientjs--dtaas-web-client)
    - [:bookmark\_tabs: Variable Reference](#bookmark_tabs-variable-reference)
    - [:bulb: Example](#bulb-example)
  - [:shield: config/conf.server — Traefik Forward-Auth Rules](#shield-configconfserver--traefik-forward-auth-rules)
    - [:pencil: Format](#pencil-format)
    - [:page\_with\_curl: Default Rules](#page_with_curl-default-rules)
    - [:warning: Important Rules](#warning-important-rules)
  - [:lock: certs/ — TLS Certificates](#lock-certs--tls-certificates)
  - [:file\_folder: files/ — User Workspace Directories](#file_folder-files--user-workspace-directories)
  - [:closed\_lock\_with\_key: OAuth 2.0 Application Setup](#closed_lock_with_key-oauth-20-application-setup)
    - [:computer: DTaaS Client Authorization (React Frontend)](#computer-dtaas-client-authorization-react-frontend)
    - [:satellite: DTaaS Server Authorization (Traefik Forward-Auth)](#satellite-dtaas-server-authorization-traefik-forward-auth)
    - [:arrows\_counterclockwise: Reload After Configuration](#arrows_counterclockwise-reload-after-configuration)
  - [:busts\_in\_silhouette: Adding More Users](#busts_in_silhouette-adding-more-users)
  - [:mag: Troubleshooting](#mag-troubleshooting)
    - [:hourglass\_flowing\_sand: GitLab Takes Too Long to Start](#hourglass_flowing_sand-gitlab-takes-too-long-to-start)
    - [:repeat: Authentication Redirect Loop](#repeat-authentication-redirect-loop)
    - [:no\_entry\_sign: 404 on User Workspace](#no_entry_sign-404-on-user-workspace)
    - [:construction: GitLab "502 Bad Gateway"](#construction-gitlab-502-bad-gateway)
    - [:closed\_lock\_with\_key: Self-Signed Certificate Warning in Browser](#closed_lock_with_key-self-signed-certificate-warning-in-browser)

---

## :wrench: config/.env — Docker Compose Environment

Source: `config/.env.example`

This file provides environment variables consumed by `docker-compose.yml`.

```bash
cp config/.env.example config/.env
```

### :desktop_computer: Server Settings

| Variable | Example | Description |
| :--- | :--- | :--- |
| `SERVER_DNS` | `intocps.org` | Domain name or IP address of the server. Do **not** include `https://`. |
| `USERNAME1` | `user1` | Path prefix and workspace name for the first user |
| `USERNAME2` | `user2` | Path prefix and workspace name for the second user |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name (rarely needs changing) |

### :key: OAuth 2.0 Settings

These are populated after the GitLab instance is running and
OAuth 2.0 applications have been created (see
[OAuth 2.0 Application Setup](#closed_lock_with_key-oauth-20-application-setup)).

| Variable | Example | Description |
| :--- | :--- | :--- |
| `OAUTH_URL` | `https://intocps.org/gitlab` | GitLab instance URL used for browser-side authorisation redirects. No trailing slash. |
| `OAUTH_CLIENT_ID` | _(from GitLab)_ | Application ID from the **DTaaS Server Authorization** OAuth 2.0 application |
| `OAUTH_CLIENT_SECRET` | _(from GitLab)_ | Secret from the **DTaaS Server Authorization** OAuth 2.0 application |
| `OAUTH_SECRET` | _(random string)_ | Encryption key for OAuth session cookies. Generate with: `openssl rand -base64 32` |

### :link: How Variables Map to Services

| Variable | Used by |
| :--- | :--- |
| `SERVER_DNS` | traefik, client, user1, user2, libms, traefik-forward-auth, gitlab |
| `USERNAME1` / `USERNAME2` | user1, user2 (routing and workspace volumes) |
| `OAUTH_URL` | traefik-forward-auth (browser redirect URL) |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | traefik-forward-auth |
| `OAUTH_SECRET` | traefik-forward-auth |

---

## :globe_with_meridians: config/client.js — DTaaS Web Client

Source: `config/client.js.example`

This JavaScript file is mounted into the React client container and
configures the DTaaS web application at runtime.

```bash
cp config/client.js.example config/client.js
```

### :bookmark_tabs: Variable Reference

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

### :bulb: Example

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

## :shield: config/conf.server — Traefik Forward-Auth Rules

Source: `config/conf.server.example`

This file defines per-path authorisation rules for
[traefik-forward-auth](https://github.com/thomseddon/traefik-forward-auth).
Each rule restricts a URL path to specific GitLab email addresses.

```bash
cp config/conf.server.example config/conf.server
```

### :pencil: Format

```text
rule.<NAME>.action=auth
rule.<NAME>.rule=PathPrefix(`/<path>`)
rule.<NAME>.whitelist=<email>
```

### :page_with_curl: Default Rules

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

### :warning: Important Rules

> [!WARNING]
> **Usernames must be consistent.** The usernames in `config/.env`
> (`USERNAME1`, `USERNAME2`) must match the `PathPrefix` values in
> `config/conf.server`. Mismatches cause routing or authorisation
> failures.

| Scenario | Behaviour |
| :--- | :--- |
| Route in `config/.env` but **missing** from `config/conf.server` | Any signed-in user can access the route (default forward-auth behaviour) |
| Route in `config/conf.server` but **missing** from `config/.env` | Traefik returns **404** (route not served) |
| The `/lib` rule has **no whitelist** | Any signed-in user can access the library service |

---

## :lock: certs/ — TLS Certificates

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

## :file_folder: files/ — User Workspace Directories

Each user workspace container mounts a directory from `files/` as
its `/workspace` volume. The `files/common/` directory is shared
across all workspaces and mounted to `/workspace/common` in each
container.

```text
files/
├── common/    # Shared files (mounted to /workspace/common in each container)
└── template/  # template workspace files
```

Create directories for each user:

```bash
cp -R files/template files/<USERNAME>
sudo chown -R 1000:100 files/*
```

The UID `1000` and GID `100` match the default user inside the
workspace container.

---

## :closed_lock_with_key: OAuth 2.0 Application Setup

After the GitLab instance is running, two OAuth 2.0 applications must be
registered to connect DTaaS and Traefik forward-auth to the integrated
GitLab.

### :computer: DTaaS Client Authorization (React Frontend)

1. In GitLab, go to **Admin Area → Applications** (or the user's
   **Edit Profile → Applications**).
1. Create a new application:
   - **Name**: DTaaS Client Authorization
   - **Redirect URI**: `https://intocps.org/Library`
   - **Confidential**: unticked (public SPA client)
   - **Scopes**: `openid`, `profile`, `read_user`, `read_repository`, `api`
1. Save the **Application ID**.
1. Set `REACT_APP_CLIENT_ID` in `config/client.js` to this Application ID.
1. Set `REACT_APP_AUTH_AUTHORITY` in `config/client.js` to
   `https://intocps.org/gitlab`.

For full details, see the
[client auth documentation](https://into-cps-association.github.io/DTaaS/version0.8/admin/client/auth.html).

### :satellite: DTaaS Server Authorization (Traefik Forward-Auth)

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

### :arrows_counterclockwise: Reload After Configuration

After updating the OAuth 2.0 tokens in the configuration files, reload
the affected services:

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```

---

## :busts_in_silhouette: Adding More Users

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

1. **Add authorisation rule to `config/conf.server`:**

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

## :mag: Troubleshooting

### :hourglass_flowing_sand: GitLab Takes Too Long to Start

GitLab CE requires significant resources. The first startup may take
5–10 minutes. Monitor with `docker compose --env-file config/.env logs -f gitlab`.
Ensure the host has at least 4 GB RAM available for GitLab.

### :repeat: Authentication Redirect Loop

1. Verify `OAUTH_URL` in `config/.env` matches the URL accessible from
   the user's browser (e.g. `https://intocps.org/gitlab`).
1. Verify `REACT_APP_AUTH_AUTHORITY` in `config/client.js` matches the same URL.
1. Clear browser cookies for the domain.
1. Check traefik-forward-auth logs:
   `docker compose --env-file config/.env logs traefik-forward-auth`

### :no_entry_sign: 404 on User Workspace

- Ensure `USERNAME1`/`USERNAME2` in `config/.env` matches the
  `PathPrefix` in `config/conf.server`.
- Ensure a corresponding service exists in `docker-compose.yml`.

### :construction: GitLab "502 Bad Gateway"

GitLab is still initializing. Wait until `docker ps` shows the
container as `healthy`.

### :closed_lock_with_key: Self-Signed Certificate Warning in Browser

TLS certificate files are missing or invalid in `certs/`. Replace them
with valid certificates for the domain.
