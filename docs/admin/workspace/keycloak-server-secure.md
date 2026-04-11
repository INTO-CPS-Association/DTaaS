# Workspace with Keycloak on a Secure Server

This scenario is intended for secure multi-user workspace deployment using
Keycloak as the OIDC provider.

Package root:

- `deploy/workspace/keycloak/production`

## Requirements

- Docker Engine v27+
- Domain name resolving to your server
- TLS certificates (`fullchain.pem`, `privkey.pem`)
- Ports 80 and 443 available

## Setup Flow

1. Change directory:

   ```bash
   cd deploy/workspace/keycloak/production
   ```

2. Create runtime config files:

   ```bash
   cp .env.example .env
   cp config/client.js.example config/client.js
   cp config/forward-auth-conf.example config/forward-auth-conf
   ```

3. Configure domain, certs, usernames, and forward-auth rules as described in:

   - `deploy/workspace/keycloak/production/CONFIGURATION.md`

4. Start services:

   ```bash
   docker compose up -d
   ```

5. Configure Keycloak realm, users, and OAuth clients as described in:

   - `deploy/workspace/keycloak/production/KEYCLOAK_SETUP.md`

6. Recreate forward-auth after Keycloak/OAuth updates:

   ```bash
   docker compose up -d --force-recreate traefik-forward-auth
   ```

## Verify

- `https://<SERVER_DNS>` opens DTaaS client
- Login redirects to Keycloak
- User-specific workspace routes are protected

## References

- `deploy/workspace/keycloak/production/README.md`
- `deploy/workspace/keycloak/production/CONFIGURATION.md`
- `deploy/workspace/keycloak/production/KEYCLOAK_SETUP.md`
