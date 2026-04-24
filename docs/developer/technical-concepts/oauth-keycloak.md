# OAuth 2.0 and Keycloak Summary :lock:

DTaaS uses OAuth 2.0/OIDC patterns at two levels:

- Browser-side login for the web client.
- Gateway-side protection for backend routes and workspaces.

## Two Deployment Patterns

### 1. GitLab-Centered OAuth

This pattern is common in DTaaS package scenarios that use GitLab as identity provider.

- The web client authenticates users through OAuth/OIDC settings in runtime config.
- Gateway authorization is handled by `traefik-forward-auth`.
- GitLab applications provide client ID and client secret values used by DTaaS components.

### 2. Keycloak-Centered OIDC

This pattern is used in workspace secure-server deployments.

- Keycloak provides realm, users, and OIDC clients.
- `traefik-forward-auth` validates sessions/tokens and enforces route access.
- Workspace routes stay protected even when users access different sub-paths.

## Control Plane vs Data Plane

- Control plane: provider setup, secret management, callback URI configuration.
- Data plane: request flow through Traefik and forward-auth before DTaaS.

## Core Runtime Values

Typical secure-server OIDC variables include:

- `KEYCLOAK_ISSUER_URL`
- `KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_CLIENT_SECRET`
- `OAUTH_SECRET`

GitLab-oriented scenarios use equivalent OAuth authority and client settings in
scenario-specific configuration files.

## Why This Matters for Developers

When debugging login failures, first identify which identity provider pattern
is active. Most issues come from mismatch in one of these:

- Redirect/callback URL.
- Client ID and secret.
- Hostname and TLS assumptions.
- User whitelist/route policy in forward-auth config.

Start troubleshooting at configuration boundaries, then inspect gateway and
provider logs.
