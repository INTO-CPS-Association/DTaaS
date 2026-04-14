# Configuration Reference

This document provides a detailed reference for each configuration file
in this package.

For the quick-start installation guide, see [README.md](README.md).

## config/.env

Source: `config/.env.example`

```bash
cp config/.env.example config/.env
```

| Variable | Example | Description |
| :--- | :--- | :--- |
| `DEFAULT_USER` | `user1` | Workspace path prefix and workspace folder name |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name |

The `DEFAULT_USER` value is used in:

- Router path prefix (`/${DEFAULT_USER}`)
- Workspace volume mount (`./files/${DEFAULT_USER}`)
- Workspace container `MAIN_USER` environment variable

## config/client.js

Source: `config/client.js.example`

```bash
cp config/client.js.example config/client.js
```

| Variable | Example | Description |
| :--- | :--- | :--- |
| `REACT_APP_URL` | `http://localhost` | Base URL of DTaaS |
| `REACT_APP_CLIENT_ID` | _(OAuth client id)_ | Client OAuth application ID |
| `REACT_APP_AUTH_AUTHORITY` | `https://gitlab.com/` | OAuth authority URL |
| `REACT_APP_REDIRECT_URI` | `http://localhost/Library` | Redirect URI after sign-in |
| `REACT_APP_LOGOUT_REDIRECT_URI` | `http://localhost/` | Redirect URI after sign-out |

## files/

`files/common` is mounted read-write to `/workspace/common`.

Create a per-user workspace from `files/template`:

```bash
cp -R files/template files/<DEFAULT_USER>
sudo chown -R 1000:100 files/*
```

## Reload client config

After editing `config/client.js`, reload only the client service:

```bash
docker compose --env-file config/.env up -d --force-recreate client
```
