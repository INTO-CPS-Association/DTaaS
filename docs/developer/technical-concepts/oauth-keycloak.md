# OAuth 2.0 and Keycloak Summary :lock:

DTaaS uses OAuth 2.0/OIDC at two levels:

- Browser-side login for the web client.
- Gateway-side protection for backend routes and workspaces.

## Two Deployment Patterns

### 1. GitLab-Centred OAuth

The DTaaS packages that use GitLab as the identity provider follow this
pattern.

- The web client authenticates users through the OAuth/OIDC settings in its
  runtime config.
- `traefik-forward-auth` handles gateway authorization.
- GitLab applications provide the client ID and client secret values that
  DTaaS components use.

### 2. Keycloak-Centred OIDC

Workspace secure-server deployments use this pattern.

- Keycloak provides the realm, users and OIDC clients.
- `traefik-forward-auth` validates sessions and tokens and enforces route
  access.
- Workspace routes stay protected when users access different sub-paths.

## Control Plane vs Data Plane

- Control plane: provider setup, secret management and callback URI
  configuration.
- Data plane: the request flow through Traefik and forward-auth before it
  reaches DTaaS.

## Core Runtime Values

The secure-server OIDC variables include:

- `KEYCLOAK_ISSUER_URL`
- `KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_CLIENT_SECRET`
- `OAUTH_SECRET`

GitLab-based scenarios set the equivalent OAuth authority and client values
in their own configuration files.

## Debugging Login Failures

When debugging a login failure, first identify which identity provider
pattern is active. Most failures come from a mismatch in one of these:

- Redirect/callback URL.
- Client ID and secret.
- Hostname and TLS assumptions.
- User whitelist or route policy in the forward-auth config.

Check the configuration first, then the gateway and provider logs.
