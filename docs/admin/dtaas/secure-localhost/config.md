# Configuration Reference

This document provides a detailed reference for each configuration file
in this package.

For quick-start installation, see [install.md](install.md).

## config/.env

Source: `config/.env.example`

```bash
cp config/.env.example config/.env
```

| Variable | Example | Description |
| :--- | :--- | :--- |
| `SERVER_DNS` | `localhost` | Hostname used in Traefik router rules |
| `USERNAME` | `user1` | Workspace path prefix and workspace folder name |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name |

## config/client.js

Source: `config/client.js.example`

```bash
cp config/client.js.example config/client.js
```

Update OAuth settings to match your GitLab OAuth app:

- `REACT_APP_CLIENT_ID`
- `REACT_APP_AUTH_AUTHORITY`
- `REACT_APP_REDIRECT_URI`
- `REACT_APP_LOGOUT_REDIRECT_URI`

If you use services CLI local GitLab defaults, authority is typically:

- `https://localhost:8090/gitlab`

## config/tls.yml

Traefik TLS certificate provider file.

Certificates are expected at:

- `certs/fullchain.pem`
- `certs/privkey.pem`

## files/

`files/common` is mounted read-write to `/workspace/common`.

Create the per-user workspace from template:

```bash
cp -R files/template files/<USERNAME>
sudo chown -R 1000:100 files/*
```

## Reload client config

After editing `config/client.js`:

```bash
docker compose --env-file config/.env up -d --force-recreate client
```
