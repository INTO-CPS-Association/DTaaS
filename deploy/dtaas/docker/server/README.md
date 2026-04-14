# DTaaS - Secure Server (External GitLab)

![DTaaS logo](dtaas.png)

Thank you for downloading **Digital Twin as a Service**.

This README provides a quick-start installation guide for
a multi-user DTaaS deployment that uses an **external GitLab instance**
for OAuth 2.0 authorisation. **This is an insecure deployment.**
A secure version is recommended for production use.

For a full configuration reference, see [CONFIG.md](CONFIG.md).

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

See [CONFIG.md](CONFIG.md) for full details.

### 2. Create User Workspace Directories

```bash
cp -R files/template files/<USERNAME1>
cp -R files/template files/<USERNAME2>
sudo chown -R 1000:100 files/*
```

### 3. Start Services

```bash
docker compose --env-file config/.env up -d
```

### 4. Configure OAuth 2.0 Applications in GitLab

Create two applications in the external GitLab instance:

1. **DTaaS Client Authorization** (React SPA)
2. **DTaaS Server Authorization** (Traefik forward-auth)

Update `config/client.js` and `config/.env` with generated credentials,
then reload affected services:

```bash
docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
```

### 5. Verify

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

## Documentation

For full DTaaS administrator documentation, see:
<https://into-cps-association.github.io/DTaaS/development/admin/overview.html>
