# :gear: Configuration Reference

This document provides a detailed reference for every configuration
file in this package. For quick-start installation, see
[install.md](install.md).

> [!IMPORTANT]
> The hostname `localhost` is used for illustration throughout this
> guide. Replace it with your actual host if needed.

## :wrench: config/.env - Docker Compose Environment

Source: `config/.env.example`

```bash
cp config/.env.example config/.env
```

| Variable | Example | Description |
| :--- | :--- | :--- |
| `SERVER_DNS` | `localhost` | Hostname used in Traefik routing rules |
| `USERNAME` | `user1` | Workspace route prefix and folder name |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name |

## :globe_with_meridians: config/client.js - DTaaS Web Client

Source: `config/client.js.example`

```bash
cp config/client.js.example config/client.js
```

This file is mounted into the React client container and configures
runtime OAuth behavior.

### :bookmark_tabs: Variable Reference

| Variable | Example | Description |
| :--- | :--- | :--- |
| `REACT_APP_URL` | `https://localhost` | Base URL of the DTaaS web app |
| `REACT_APP_CLIENT_ID` | `<oauth-app-client-id>` | OAuth client id |
| `REACT_APP_AUTH_AUTHORITY` | `<oauth-authority-url>` | OAuth authority URL |
| `REACT_APP_REDIRECT_URI` | `https://localhost/Library` | Redirect URL after sign-in |
| `REACT_APP_LOGOUT_REDIRECT_URI` | `https://localhost/` | Redirect URL after sign-out |
| `REACT_APP_GITLAB_SCOPES` | `openid profile read_user read_repository api` | OAuth scopes variable used by client runtime |

## :lock: config/tls.yml - TLS Provider

Traefik reads TLS certificate metadata from this file.

The expected certificate paths are:

- `certs/fullchain.pem`
- `certs/privkey.pem`

## :file_folder: files/ - Workspace Directories

`files/common` is mounted read-write to `/workspace/common`.

Create the per-user workspace from template:

```bash
cp -R files/template files/<USERNAME>
sudo chown -R 1000:100 files/*
```

## :closed_lock_with_key: OAuth Setup (GitHub Workflow)

Create an OAuth application in GitHub (or GitHub Enterprise) and
configure callback values:

- **Homepage URL**: `https://localhost`
- **Authorization callback URL**: `https://localhost/Library`

Update the OAuth variables in `config/client.js`:

- `REACT_APP_CLIENT_ID`
- `REACT_APP_AUTH_AUTHORITY`
- `REACT_APP_REDIRECT_URI`
- `REACT_APP_LOGOUT_REDIRECT_URI`

## :arrows_counterclockwise: Reload Client After OAuth Changes

After editing `config/client.js`:

```bash
docker compose --env-file config/.env up -d --force-recreate client
```

## :mag: Troubleshooting

### :repeat: Authentication Redirect Loop

1. Verify `REACT_APP_AUTH_AUTHORITY` in `config/client.js`.
1. Verify callback URL configuration in your OAuth application.
1. Clear browser cookies and retry.

### :closed_lock_with_key: Certificate Warning in Browser

TLS certificate files are missing or invalid in `certs/`. Replace with
valid files for your host.
