# Install DTaaS Package on Localhost (HTTP)

This page covers package-based DTaaS testing on a local machine over HTTP.

Use package:

- `deploy/dtaas/docker/localhost`

This scenario is intended for single-user localhost testing.

## Requirements

- Docker Engine with Compose plugin
- GitLab account for OAuth sign-in
- Port 80 available

## Quick Start

1. Change directory:

   ```bash
   cd deploy/dtaas/docker/localhost
   ```

2. Create runtime config files:

   ```bash
   cp config/.env.example config/.env
   cp config/client.js.example config/client.js
   ```

3. Update `config/.env`:

   - Set `USERNAME` to your local workspace username.

4. Create user workspace folder:

   ```bash
   cp -R files/template files/<USERNAME>
   sudo chown -R 1000:100 files/*
   ```

5. Start services:

   ```bash
   docker compose --env-file config/.env up -d
   ```

6. Open:

   - <http://localhost>

## Stop

```bash
docker compose --env-file config/.env down
```

## Related Scenarios

- HTTPS localhost package: `secure-localhost.md`
- Server package: `server.md`
- Secure server package: `secure-server.md`
- Secure server and GitLab package: `secure-server-gitlab.md`
