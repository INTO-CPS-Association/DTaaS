# Install DTaaS Server Package

This page documents deployment of the DTaaS server package with an external
GitLab OAuth provider.

Package root:

- `deploy/dtaas/docker/server`

## Requirements

- Docker Engine v28+ with Compose plugin
- Public DNS name or routable server IP
- TLS certificate files (`fullchain.pem`, `privkey.pem`)
- External GitLab OAuth provider

## Quick Start

1. Change directory:

   ```bash
   cd deploy/dtaas/docker/server
   ```

2. Create runtime configuration files:

   ```bash
   cp config/.env.example config/.env
   cp config/client.js.example config/client.js
   cp config/conf.server.example config/conf.server
   ```

3. Edit `config/.env`:

   - `SERVER_DNS`
   - `USERNAME1`, `USERNAME2`
   - `OAUTH_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_SECRET`

4. Edit `config/client.js` OAuth values:

   - `REACT_APP_CLIENT_ID`
   - `REACT_APP_AUTH_AUTHORITY`
   - `REACT_APP_REDIRECT_URI`
   - `REACT_APP_LOGOUT_REDIRECT_URI`

5. Add TLS certificates:

   ```bash
   cp /path/to/fullchain.pem certs/fullchain.pem
   cp /path/to/privkey.pem certs/privkey.pem
   ```

6. Create user workspace folders:

   ```bash
   cp -R files/template files/<USERNAME1>
   cp -R files/template files/<USERNAME2>
   sudo chown -R 1000:100 files/*
   ```

7. Start services:

   ```bash
   docker compose --env-file config/.env up -d
   ```

8. After creating OAuth applications in GitLab, reload:

   ```bash
   docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
   ```

## Verify

- `https://<SERVER_DNS>`: DTaaS client
- `https://<SERVER_DNS>/user1`: user workspace
- `https://<SERVER_DNS>/user2`: user workspace
- `https://<SERVER_DNS>/lib`: library service

## Related Scenarios

- Localhost package (HTTP): `localhost.md`
- Localhost package (HTTPS): `secure-localhost.md`
- Secure server compatibility package: `secure-server.md`
- Secure server with integrated GitLab: `secure-server-gitlab.md`
