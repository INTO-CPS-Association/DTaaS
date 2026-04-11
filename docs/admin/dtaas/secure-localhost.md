# Install DTaaS Package on Secure Localhost (HTTPS)

This page covers package-based DTaaS testing on localhost over HTTPS.

Use package:

- `deploy/dtaas/docker/secure-localhost`

This scenario is intended for single-user localhost testing where browser-side
OAuth requires HTTPS.

## Requirements

- Docker Engine with Compose plugin
- Local TLS certificate files (`fullchain.pem`, `privkey.pem`)
- GitLab OAuth provider endpoint
- Ports 80 and 443 available

## Quick Start

1. Change directory:

   ```bash
   cd deploy/dtaas/docker/secure-localhost
   ```

2. Create runtime config files:

   ```bash
   cp config/.env.example config/.env
   cp config/client.js.example config/client.js
   ```

3. Create user workspace folder:

   ```bash
   cp -R files/template files/<USERNAME>
   sudo chown -R 1000:100 files/*
   ```

4. Add certificates:

   ```bash
   cp /path/to/fullchain.pem certs/fullchain.pem
   cp /path/to/privkey.pem certs/privkey.pem
   ```

5. Start services:

   ```bash
   docker compose --env-file config/.env up -d
   ```

6. Update OAuth client config in `config/client.js`:

   - `REACT_APP_CLIENT_ID`
   - `REACT_APP_AUTH_AUTHORITY`

   If you use the services-cli local GitLab default, authority is typically:

   - `https://localhost:8090/gitlab`

7. Reload client after OAuth updates:

   ```bash
   docker compose --env-file config/.env up -d --force-recreate client
   ```

## Stop

```bash
docker compose --env-file config/.env down
```

## Related

- Localhost HTTP package: `localhost.md`
- Server package: `server.md`
- Secure server package: `secure-server.md`
- Secure server and GitLab package: `secure-server-gitlab.md`
- Services GitLab integration: `deploy/services/cli/GITLAB_INTEGRATION.md`
