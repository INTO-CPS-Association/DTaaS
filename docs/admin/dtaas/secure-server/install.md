<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas-logo-full-192h.png#only-light)
![DTaaS logo](dtaas-logo-full-white-192h.png#only-dark)

This guide installs a **secure, multi-user DTaaS deployment** that uses
an **external GitLab instance** for OAuth 2.0 authorisation.

Download **dtaas-secure-server-xx.zip** from the latest
[release / pre-release](https://github.com/INTO-CPS-Association/DTaaS/releases)
page.

For the full configuration reference, see [config.md](config.md).

## Overview

This package deploys DTaaS with Traefik, OAuth forward-auth and
two user workspaces.

![DTaaS on Server](server.png)

A path such as `/user1` is the URL route of that service, for example
`https://intocps.org/user1`.
The thick arrow is the forward-auth check: Traefik asks
traefik-forward-auth to authorise each request before it routes it.

The `docker-compose.yml` starts the following services:

| Service                  | Purpose                            |
| :----------------------- | :--------------------------------- |
| **traefik**              | Reverse proxy with TLS termination |
| **client**               | DTaaS React frontend               |
| **logger-ms**            | Logger microservice                |
| **user1 / user2**        | JupyterLab user workspaces         |
| **libms**                | Library management microservice    |
| **traefik-forward-auth** | OAuth 2.0 authorisation middleware |

## Prerequisites

| Requirement      | Details                                                 |
| :--------------- | :------------------------------------------------------ |
| Docker Engine    | v28 or later with Compose plugin                        |
| Domain name      | Public DNS name or server IP                            |
| TLS certificates | `fullchain.pem` and `privkey.pem` for the target domain |
| OAuth provider   | External GitLab (`gitlab.com` or self-hosted GitLab)    |

## Quick Start

### 1. Create Configuration Files

```bash
cp config/.env.example config/.env
cp config/conf.server.example config/conf.server
cp config/client.js.example config/client.js
```

Edit `config/.env`:

- `SERVER_DNS`
- `USERNAME1`
- `USERNAME2`
- `OAUTH_URL`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `OAUTH_SECRET`

Edit `config/client.js`:

- `REACT_APP_CLIENT_ID`
- `REACT_APP_AUTH_AUTHORITY`
- `REACT_APP_REDIRECT_URI`
- `REACT_APP_LOGOUT_REDIRECT_URI`

See [config.md](config.md) for details.

### 2. Create User Workspace Directories

```bash
cp -R files/template files/<USERNAME1>
cp -R files/template files/<USERNAME2>
sudo chown -R 1000:100 files/*
```

### 3. Add TLS Certificates

```bash
cp /path/to/fullchain.pem certs/fullchain.pem
cp /path/to/privkey.pem certs/privkey.pem
```

If the certificates are missing or invalid, Traefik falls back to
self-signed certificates.

### 4. Configure OAuth 2.0 Applications in GitLab

1. Create user accounts (see
   [GitLab docs](https://docs.gitlab.com/ee/user/profile/account/create_accounts.html)).
   The usernames **must** match `USERNAME1`/`USERNAME2` in `config/.env`.

1. Register two OAuth 2.0 applications in GitLab
   (Admin Area → Applications):

   - **DTaaS Client Authorization** for the React SPA frontend.
     See the [client auth docs](../../client/auth.md).
   - **DTaaS Server Authorization** for the Traefik forward-auth backend.
     See the [server auth docs](../../servers/auth.md).

1. Put the generated OAuth 2.0 credentials into the configuration files:
   - Set `REACT_APP_CLIENT_ID` and `REACT_APP_AUTH_AUTHORITY` in
     `config/client.js`.
   - Set `OAUTH_URL`, `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in
     `config/.env`.

### 5. Start Services

```bash
docker compose --env-file config/.env up -d
```

### 6. Verify

| URL                          | Expected result                |
| :--------------------------- | :----------------------------- |
| `https://<SERVER_DNS>`       | DTaaS web interface            |
| `https://<SERVER_DNS>/user1` | User 1 workspace after sign-in |
| `https://<SERVER_DNS>/user2` | User 2 workspace after sign-in |
| `https://<SERVER_DNS>/lib`   | Library service                |

## Stop

```bash
docker compose --env-file config/.env down
```

## Directory Layout

```text
.
|- certs/                 # TLS certificates (fullchain.pem, privkey.pem)
|- config/
|  |- .env                # Docker Compose environment variables
|  |- conf.server         # Traefik forward-auth authorisation rules
|  |- client.js           # DTaaS React client configuration
|  |- .env.example
|  |- conf.server.example
|  |- client.js.example
|  \- tls.yml            # Traefik TLS provider configuration
|- files/
|  |- common/             # Shared files across all workspaces
|  \- template/           # sample user workspace files
|- docker-compose.yml     # Service definitions
|- CONFIG.md              # Detailed configuration reference
\- README.md              # This file
```
