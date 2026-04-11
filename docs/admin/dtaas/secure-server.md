# Install DTaaS Secure Server Package

This page documents deployment of the secure-server package.

Package root:

- `deploy/dtaas/docker/secure-server`

The secure-server package is maintained as a compatibility package for
installations that already use this package name in deployment scripts.
Its behaviour is aligned with the server package.

## Requirements

- Docker Engine v28+ with Compose plugin
- Public DNS name or routable server IP
- TLS certificate files (`fullchain.pem`, `privkey.pem`)
- External GitLab OAuth provider

## Quick Start

1. Change directory:

   ```bash
   cd deploy/dtaas/docker/secure-server
   ```

2. Create runtime configuration files:

   ```bash
   cp config/.env.example config/.env
   cp config/client.js.example config/client.js
   cp config/conf.server.example config/conf.server
   ```

3. Edit `config/.env` and `config/client.js` with domain, user, and OAuth
   values.

4. Add TLS certificates:

   ```bash
   cp /path/to/fullchain.pem certs/fullchain.pem
   cp /path/to/privkey.pem certs/privkey.pem
   ```

5. Create workspace directories:

   ```bash
   cp -R files/template files/<USERNAME1>
   cp -R files/template files/<USERNAME2>
   sudo chown -R 1000:100 files/*
   ```

6. Start services:

   ```bash
   docker compose --env-file config/.env up -d
   ```

7. Reload OAuth-facing services after creating OAuth applications:

   ```bash
   docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
   ```

## Verify

- `https://<SERVER_DNS>`
- `https://<SERVER_DNS>/user1`
- `https://<SERVER_DNS>/user2`
- `https://<SERVER_DNS>/lib`

## Related

- Primary server package: `server.md`
- Server package with integrated GitLab: `secure-server-gitlab.md`
