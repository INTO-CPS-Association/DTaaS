# DTaaS - Secure Localhost

![DTaaS logo](dtaas.png)

This package runs DTaaS on localhost over **HTTPS** for a single user
workspace route.

This setup is intended for local testing and development where HTTPS is
required.

For a non-HTTPS localhost setup, use `deploy/dtaas/docker/localhost`.
For full integrated DTaaS + GitLab in one compose package, use
`deploy/dtaas/docker/secure-server_with_integrated-gitlab`.

## Overview

<img src="localhost-https.png" alt="DTaaS on Secure Localhost" width="600px" />

The `docker-compose.yml` starts:

| Service | Purpose |
| :--- | :--- |
| **traefik** | Reverse proxy with TLS termination |
| **client** | DTaaS React frontend |
| **user** | Single user workspace |

## Prerequisites

- Docker Engine with Compose plugin
- TLS certificate files for `localhost` (`fullchain.pem`, `privkey.pem`)
- A GitLab OAuth provider endpoint (for example local GitLab from
  `deploy/services/cli`)

## Quick Start

### 1. Create Configuration Files

```bash
cp config/.env.example config/.env
cp config/client.js.example config/client.js
```

### 2. Create User Workspace Directory

Edit `config/.env` and set `USERNAME`, then create a matching workspace:

```bash
cp -R files/template files/<USERNAME>
sudo chown -R 1000:100 files/*
```

### 3. Add TLS Certificates

```bash
cp /path/to/fullchain.pem certs/fullchain.pem
cp /path/to/privkey.pem certs/privkey.pem
```

### 4. Start DTaaS Services

```bash
docker compose --env-file config/.env up -d
```

### 5. Configure OAuth Client Values

Set these in `config/client.js` to match your GitLab OAuth app:

- `REACT_APP_CLIENT_ID`
- `REACT_APP_AUTH_AUTHORITY`

If you use the services CLI local GitLab default, authority is usually:

- `https://localhost:8090/gitlab`

### 6. Reload Client After OAuth Update

```bash
docker compose --env-file config/.env up -d --force-recreate client
```

## Stop

```bash
docker compose --env-file config/.env down
```

## References

- `deploy/services/cli/GITLAB_INTEGRATION.md`
- `deploy/services/cli.md`
