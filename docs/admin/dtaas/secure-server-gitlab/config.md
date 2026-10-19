# Configuration Reference

This page describes every configuration file in this package. For the
quick-start installation guide, see [install.md](install.md).

!!! important
    This guide uses the hostname `intocps.org` as an example. Replace it
    with the hostname of your server.

## config/.env - Docker Compose Environment

Source: `config/.env.example`

This file holds the environment variables that `docker-compose.yml` reads.

```bash
cp config/.env.example config/.env
```

### Server Settings

| Variable               | Example       | Description                                                             |
| :--------------------- | :------------ | :---------------------------------------------------------------------- |
| `SERVER_DNS`           | `intocps.org` | Domain name or IP address of the server. Do **not** include `https://`. |
| `USERNAME1`            | `user1`       | Path prefix and workspace name for the first user                       |
| `USERNAME2`            | `user2`       | Path prefix and workspace name for the second user                      |
| `COMPOSE_PROJECT_NAME` | `dtaas`       | Docker Compose project name (rarely needs changing)                     |

### OAuth 2.0 Settings

Fill these in after the GitLab instance is running and the OAuth 2.0
applications exist (see
[OAuth 2.0 Application Setup](#oauth-20-application-setup)).

| Variable              | Example                      | Description                                                                           |
| :-------------------- | :--------------------------- | :------------------------------------------------------------------------------------ |
| `OAUTH_URL`           | `https://intocps.org/gitlab` | GitLab instance URL used for browser-side authorisation redirects. No trailing slash. |
| `OAUTH_CLIENT_ID`     | _(from GitLab)_              | Application ID from the **DTaaS Server Authorization** OAuth 2.0 application          |
| `OAUTH_CLIENT_SECRET` | _(from GitLab)_              | Secret from the **DTaaS Server Authorization** OAuth 2.0 application                  |
| `OAUTH_SECRET`        | _(random string)_            | Encryption key for OAuth session cookies. Generate with: `openssl rand -base64 32`    |

### How Variables Map to Services

| Variable                                  | Used by                                                              |
| :---------------------------------------- | :------------------------------------------------------------------- |
| `SERVER_DNS`                              | client, logger-ms, user1, user2, libms, traefik-forward-auth, gitlab |
| `USERNAME1` / `USERNAME2`                 | user1, user2 (routing and workspace volumes)                         |
| `OAUTH_URL`                               | traefik-forward-auth (browser redirect URL)                          |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | traefik-forward-auth                                                 |
| `OAUTH_SECRET`                            | traefik-forward-auth                                                 |

traefik-forward-auth reaches the token and user endpoints over the
internal Docker network (`http://gitlab/gitlab/...`), so only the
authorisation redirect uses `OAUTH_URL`.

## config/client.js - DTaaS Web Client

Source: `config/client.js.example`

This JavaScript file is mounted into the React client container and
configures the DTaaS web application at runtime.

```bash
cp config/client.js.example config/client.js
```

### Variable Reference

| Variable                        | Example                                        | Description                                                                  |
| :------------------------------ | :--------------------------------------------- | :--------------------------------------------------------------------------- |
| `REACT_APP_ENVIRONMENT`         | `prod`                                         | Environment name. Use `prod` for production.                                 |
| `REACT_APP_URL`                 | `https://intocps.org`                          | Base URL of the DTaaS web application                                        |
| `REACT_APP_URL_BASENAME`        | `''`                                           | Optional URL base path (leave empty for root hosting)                        |
| `REACT_APP_URL_DTLINK`          | `/lab`                                         | URL path for the Digital Twin workbench                                      |
| `REACT_APP_URL_LIBLINK`         | `''`                                           | URL path for the Library                                                     |
| `REACT_APP_CLIENT_ID`           | _(from GitLab)_                                | Application ID from the **DTaaS Client Authorization** OAuth 2.0 application |
| `REACT_APP_AUTH_AUTHORITY`      | `https://intocps.org/gitlab`                   | URL of the GitLab instance (OAuth 2.0 issuer)                                |
| `REACT_APP_REDIRECT_URI`        | `https://intocps.org/Library`                  | Where GitLab sends users after sign-in                                       |
| `REACT_APP_LOGOUT_REDIRECT_URI` | `https://intocps.org/`                         | Where users land after sign-out                                              |
| `REACT_APP_GITLAB_SCOPES`       | `openid profile read_user read_repository api` | OAuth 2.0 scopes requested during sign-in                                    |
| `LOGGER_URL`                    | `https://intocps.org/logger`                   | URL of the logger service                                                    |

### Example

```js
if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'prod',
    REACT_APP_URL: 'https://intocps.org',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_CLIENT_ID: '<APPLICATION_ID>',
    REACT_APP_AUTH_AUTHORITY: 'https://intocps.org/gitlab',
    REACT_APP_REDIRECT_URI: 'https://intocps.org/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'https://intocps.org/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
    LOGGER_URL: 'https://intocps.org/logger',
  };
};
```

## config/conf.server - Traefik Forward-Auth Rules

Source: `config/conf.server.example`

This file defines per-path authorisation rules for
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

rule.signals.action=auth
rule.signals.rule=PathPrefix(`/signals`)

rule.onlyu1.action=auth
rule.onlyu1.rule=PathPrefix(`/user1`)
rule.onlyu1.whitelist=user1@emailservice.com

rule.onlyu2.action=auth
rule.onlyu2.rule=PathPrefix(`/user2`)
rule.onlyu2.whitelist=user2@emailservice.com
```

Replace `user1`, `user2` and the email addresses with those of the
actual GitLab accounts.

### Important Rules

!!! warning
    The usernames in `config/.env` (`USERNAME1`, `USERNAME2`) must match
    the `PathPrefix` values in `config/conf.server`. A mismatch causes
    routing or authorisation failures.

| Scenario                                                         | Behaviour                                                                |
| :--------------------------------------------------------------- | :----------------------------------------------------------------------- |
| Route in `config/.env` but **missing** from `config/conf.server` | Any signed-in user can access the route (default forward-auth behaviour) |
| Route in `config/conf.server` but **missing** from `config/.env` | Traefik returns **404** (route not served)                               |
| The `/lib` rule has **no whitelist**                             | Any signed-in user can access the library service                        |

## certs/ - TLS Certificates

Place the TLS certificate files here:

```text
certs/
├── fullchain.pem   # Public certificate (or certificate chain)
└── privkey.pem     # Private key
```

The certificates must be valid for `SERVER_DNS` (e.g. `intocps.org`
or `*.intocps.org`).

To obtain certificates with certbot:

```bash
# Using certbot (Let's Encrypt)
sudo certbot certonly --standalone -d intocps.org
sudo cp /etc/letsencrypt/live/intocps.org/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/intocps.org/privkey.pem   certs/
```

If the certificate files are absent or invalid, Traefik uses
self-signed certificates and browsers show a security warning.

## files/ - User Workspace Directories

Each user workspace container mounts a directory from `files/` as
its `/workspace` volume. All workspaces share the `files/common/`
directory, which is mounted at `/workspace/common` in each container.

```text
files/
├── common/    # Shared files (mounted to /workspace/common in each container)
└── template/  # template workspace files
```

Create a directory for each user:

```bash
cp -R files/template files/<USERNAME>
sudo chown -R 1000:100 files/*
```

UID `1000` and GID `100` match the default user inside the
workspace container.

## logs/logger/ - Logger Microservice Events

The logger microservice writes the captured events to
`logs/logger/workflow-logs.jsonl`. Create the directory and give it to
uid 1000, the user that runs the logger:

```bash
mkdir -p logs/logger
sudo chown -R 1000:1000 logs/logger
```

`logs/` itself holds the GitLab logs, so change the owner of
`logs/logger` only.

## config/signals.yaml - Signals Gateway

Source: `config/signals.yaml.example`

The signals gateway serves the live and past signals of digital twins to the
client at `/signals`. It starts only with the `signals` profile, so a
deployment without it starts as before.

1. Copy the configuration and set the addresses of GitLab, RabbitMQ and
   InfluxDB:

   ```bash
   cp config/signals.yaml.example config/signals.yaml
   ```

1. Write the password of the read-only RabbitMQ user to
   `config/secrets/rabbitmq-password`, and a JSON object that maps each
   InfluxDB org to a read-only token to `config/secrets/influx-tokens.json`.
   The gateway runs as uid 1000, so give it both files:

   ```bash
   chmod 600 config/secrets/*
   sudo chown 1000:1000 config/secrets/*
   ```

1. Uncomment `COMPOSE_PROFILES=signals` in `config/.env`, and set
   `REACT_APP_VIZ_SIGNALS_URL` in `config/client.js` to the `/signals`
   address of this server.

[Service Users](../../servers/signals/service-users.md) describes the
read-only service user and the InfluxDB tokens.

## OAuth 2.0 Application Setup

Once the GitLab instance is running, register two OAuth 2.0 applications
to connect DTaaS and Traefik forward-auth to the integrated GitLab.

### DTaaS Client Authorization (React Frontend)

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

For details, see the
[client auth documentation](../../client/auth.md).

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
1. Generate `OAUTH_SECRET` with `openssl rand -base64 32` and set it in
   `config/.env`.

For details, see the
[server auth documentation](../../servers/auth.md).

### Reload After Configuration

After putting the OAuth 2.0 credentials into the configuration files,
reload the affected services:

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```

## Adding More Users

To add a third user:

1. **Add a service to `docker-compose.yml`:**

   ```yaml
   user3:
     image: intocps/workspace:main-56c6f68
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

1. **Create the workspace directory:**

   ```bash
   cp -R files/template files/alice
   sudo chown -R 1000:100 files/alice
   ```

1. **Add an authorisation rule to `config/conf.server`:**

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

## Troubleshooting

### GitLab Takes Too Long to Start

GitLab CE needs substantial resources, and the first startup can take
5 to 10 minutes. Follow progress with
`docker compose --env-file config/.env logs -f gitlab`.
Make sure the host has at least 4 GB of RAM available for GitLab.

### Authentication Redirect Loop

1. Check that `OAUTH_URL` in `config/.env` matches the URL that the
   user's browser can reach (e.g. `https://intocps.org/gitlab`).
1. Check that `REACT_APP_AUTH_AUTHORITY` in `config/client.js` matches the
   same URL.
1. Clear the browser cookies for the domain.
1. Check the traefik-forward-auth logs:
   `docker compose --env-file config/.env logs traefik-forward-auth`

### 404 on User Workspace

- Make sure `USERNAME1`/`USERNAME2` in `config/.env` match the
  `PathPrefix` values in `config/conf.server`.
- Make sure a matching service exists in `docker-compose.yml`.

### GitLab "502 Bad Gateway"

GitLab is still initialising. Wait until `docker ps` shows the
container as `healthy`.

### Self-Signed Certificate Warning in Browser

The TLS certificate files in `certs/` are missing or invalid. Replace
them with valid certificates for the domain.
