<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

🎉 Thank you for downloading **Digital Twin as a Service**.

This README provides a quick-start installation guide for a secure,
multi-user DTaaS deployment that uses an **external GitLab instance**
for OAuth 2.0 authorisation.

For a full configuration reference, see [config.md](config.md).

## Overview

This package deploys DTaaS with Traefik, OAuth forward-auth, and
multiple user workspaces.

<img src="server.png" alt="DTaaS on Server" width="600px" />

The `docker-compose.yml` starts the following services:

| Service | Purpose |
| :--- | :--- |
| **traefik** | Reverse proxy with TLS termination |
| **client** | DTaaS React frontend |
| **user1 / user2** | JupyterLab user workspaces |
| **libms** | Library management microservice |
| **traefik-forward-auth** | OAuth 2.0 authorisation middleware |

## Prerequisites

| Requirement | Details |
| :--- | :--- |
| Docker Engine | v28 or later with Compose plugin |
| Domain name | Public DNS name or server IP |
| TLS certificates | `fullchain.pem` and `privkey.pem` for your domain |
| OAuth provider | External GitLab (`gitlab.com` or self-hosted GitLab) |

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

See [config.md](config.md) for full details.

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

If certificates are missing or invalid, Traefik runs with self-signed
certificates.

### 4. Configure OAuth 2.0 Applications in GitLab :fox_face:

1. Create user accounts (see
   [GitLab docs](https://docs.gitlab.com/ee/user/profile/account/create_accounts.html)).
   The usernames **must** match `USERNAME1`/`USERNAME2` in `config/.env`.

1. Register two OAuth 2.0 applications in GitLab
   (Admin Area → Applications):

   - **DTaaS Client Authorization** — for the React SPA frontend.
     See [client auth docs](https://into-cps-association.github.io/DTaaS/development/admin/client/auth.html).
   - **DTaaS Server Authorization** — for Traefik forward-auth backend.
     See [server auth docs](https://into-cps-association.github.io/DTaaS/development/admin/servers/auth.html).

1. Update configuration files (`config/.env` and `config/client.js`) with
   the generated OAuth 2.0 tokens:
   - Set `REACT_APP_CLIENT_ID` and `REACT_APP_AUTH_AUTHORITY` in
     `config/client.js`.
   - Set `OAUTH_URL`, `OAUTH_CLIENT_ID`, and `OAUTH_CLIENT_SECRET` in
     `config/.env`.

Update `config/client.js` and `config/.env` with generated credentials,
then reload affected services:

### 5. Start Services

```bash
docker compose --env-file config/.env up -d
```

### 6. Verify

| URL | Expected result |
| :--- | :--- |
| `https://<SERVER_DNS>` | DTaaS web interface |
| `https://<SERVER_DNS>/user1` | User 1 workspace after sign-in |
| `https://<SERVER_DNS>/user2` | User 2 workspace after sign-in |
| `https://<SERVER_DNS>/lib` | Library service |

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
|  |- conf.server         # Traefik forward-auth authorization rules
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
