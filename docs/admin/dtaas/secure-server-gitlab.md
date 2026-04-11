# Install DTaaS Secure Server and GitLab Package

This page documents deployment of DTaaS with an integrated GitLab CE instance.

Package root:

- `deploy/dtaas/docker/secure-server_with_integrated-gitlab`

## Requirements

- Docker Engine v28+ with Compose plugin
- Public DNS name or routable server IP
- TLS certificate files (`fullchain.pem`, `privkey.pem`)

## Quick Start

1. Change directory:

   ```bash
   cd deploy/dtaas/docker/secure-server_with_integrated-gitlab
   ```

2. Create runtime configuration files:

   ```bash
   cp config/.env.example config/.env
   cp config/client.js.example config/client.js
   cp config/conf.server.example config/conf.server
   ```

3. Edit `config/.env` with domain and usernames (`USERNAME1`, `USERNAME2`).

4. Add TLS certificates:

   ```bash
   cp /path/to/fullchain.pem certs/fullchain.pem
   cp /path/to/privkey.pem certs/privkey.pem
   ```

5. Create user workspace folders:

   ```bash
   cp -R files/template files/<USERNAME1>
   cp -R files/template files/<USERNAME2>
   sudo chown -R 1000:100 files/*
   ```

6. Start services:

   ```bash
   docker compose --env-file config/.env up -d
   ```

7. Wait for GitLab to become healthy, then configure:

   - DTaaS Client Authorization OAuth application
   - DTaaS Server Authorization OAuth application

8. Update OAuth values in `config/.env` and `config/client.js`, then reload:

   ```bash
   docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
   ```

## Verify

- `https://<SERVER_DNS>`
- `https://<SERVER_DNS>/gitlab`
- `https://<SERVER_DNS>/user1`
- `https://<SERVER_DNS>/user2`
- `https://<SERVER_DNS>/lib`

## Related

- GitLab server guidance: `../gitlab/index.md`
- GitLab OAuth integration: `../gitlab/integration.md`
- DTaaS server package with external GitLab: `server.md`
