# Keycloak Setup Guide for DTaaS

This guide explains how to configure Keycloak for authentication in the DTaaS workspace deployment.

## Key Benefits

✅ **Standards-Based**: Uses OIDC/OAuth2 standards

✅ **Enterprise-Ready**: Supports SSO, MFA, user federation

✅ **Minimal Changes**: Environment-variable based configuration

## Overview

The configuration uses:

- **Keycloak** as the identity provider (IdP) with OIDC support
- **Traefik Forward Auth** to protect routes using OIDC
- **Traefik** as the reverse proxy

## Architecture

```text
User Request → Traefik → Forward Auth → Keycloak (OIDC)
               ↓
         Protected Service
```

## Quick Start

In this guide, either `<DOMAIN_NAME>` OR `intocps.org` are used as
placeholders for server hostname of the installation.

### 1. Configure Environment Variables

Keycloak-specific environment variables are:

| Variable | Purpose | Example |
|----------|---------|---------|
| `KEYCLOAK_ADMIN` | Admin username | `admin` |
| `KEYCLOAK_ADMIN_PASSWORD` | Admin password | `changeme` |
| `KEYCLOAK_REALM` | Realm name | `dtaas` |
| `KEYCLOAK_CLIENT_ID` | OIDC client ID | `dtaas-workspace` |
| `KEYCLOAK_CLIENT_SECRET` | OIDC client secret | `<from-Keycloak>` |
| `KEYCLOAK_ISSUER_URL` | OIDC issuer URL | `https://intocps.org/auth/realms/dtaas` |

Edit Keycloak-configuration in `.env`:

```bash
# Keycloak Admin Credentials (for initial setup)
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=changeme

# Keycloak Realm
KEYCLOAK_REALM=dtaas

# Keycloak Client Configuration (will be created in post-install step)
KEYCLOAK_CLIENT_ID=dtaas-workspace
KEYCLOAK_CLIENT_SECRET=<generated-secret>
```

### 2. Configure Keycloak

The following instructions are part of post-install step.

#### Access Keycloak Admin Console

1. Navigate to `https://intocps.org/auth`
2. Click **Administration Console**
3. Login with credentials from the `.env` file (default: `admin` / `changeme`)

#### Create a Realm

1. In the top-left dropdown (currently showing "Master"), click **Create Realm**  
2. **Realm name**: `dtaas` (or match the `KEYCLOAK_REALM` in `.env`)  
3. Click **Create**
4. Click on **Realm Settings** -> **User Profile**
5. Click on **Create attribute** with
   - name: profile
   - display name: profile
   - Permission: **who can edit** ✅ on admin
6. Click **Create**

#### Create Users

1. In the left sidebar, click **Users**
2. Click **Create new user**
3. Fill in user details:
   - **Username**: `user1` (or desired username)
   - **Email**: user's email
   - **First name** / **Last name**: required
   - **Email verified**: OFF
   - **Profile**: `https://intocps.org/auth/realms/dtaas/<USERNAME>`
     The profile URL is created by adding `/<USERNAME>` to
     the `<REACT_APP_AUTH_AUTHORITY>` URL used in the `client.js`
4. Click **Create**
5. Set password:
   - Go to the **Credentials** tab
   - Click **Set password**
   - Enter a password
   - **Temporary**: OFF (so users do not have to change it on first login)  
   - Click **Save**
6. Repeat for additional users (e.g., `user2`)

#### Create OAuth2 Client for Traefik Forward-Auth Service

1. In the left sidebar, click **Clients**
2. Click **Create client**
3. Configure the client:
   - **Client type**: OpenID Connect
   - **Client ID**: `dtaas-workspace` (match `KEYCLOAK_CLIENT_ID` in `.env`)
   - Click **Next**
4. Capability config:
   - Client authentication: ON
   - Authorization: OFF
   - Authentication flow: enable **Standard flow**
   - Click **Next**
5. Login settings:
   - **Root URL**: `https://intocps.org`
   - **Valid redirect URIs**:
    - `https://intocps.org/_oauth/*`
    - `https://intocps.org/*`
   - **Valid post logout redirect URIs**: `https://intocps.org/*`
   - **Web origins**: `https://intocps.org`
   - Click **Save**
6. Get the client secret:
   - Go to the **Credentials** tab
   - Copy the **Client secret** value
   - Update `KEYCLOAK_CLIENT_SECRET` in the `.env` file

#### Create OAuth2 Client for DTaaS Client Service

The DTaaS web client is a React single-page application (SPA) that uses
the **Authorization Code flow with PKCE** (Proof Key for Code Exchange).
This requires a **public** client (no client secret) with PKCE enforced.

1. In the left sidebar, click **Clients**
2. Click **Create client**
3. Configure the client:
   - **Client type**: OpenID Connect
   - **Client ID**: `dtaas-client`
   - Click **Next**
4. Capability config:
   - **Client authentication**: OFF (public client — no secret needed)
   - **Authorization**: OFF
   - **Authentication flow**: enable **Standard flow** only
   - Click **Next**
5. Login settings:
   - **Root URL**: `https://intocps.org`
   - **Valid redirect URIs**: `https://intocps.org/*`
   - **Valid post logout redirect URIs**: `https://intocps.org/*`
   - **Web origins**: `https://intocps.org`
   - Click **Save**
6. Enforce PKCE:
   - Go to the **Advanced** tab of the client
   - Under **Advanced Settings**, set
     **Proof Key for Code Exchange Code Challenge Method** to `S256`
   - Click **Save**
7. Verify scopes:
   - Go to the **Client Scopes** tab of the client
   - Confirm that `profile` is listed as an assigned scope

### 3. Restart Services

After configuring Keycloak, restart the services to apply the new client secret:

```bash
docker compose down
docker compose up -d
```

### 4. Test Authentication

1. Navigate to `https://intocps.org`
2. The user should be redirected to Keycloak login
3. Login with one of the users created
4. The user should be redirected back to the DTaaS landing page

## Production Considerations

To use an external Keycloak instance (recommended for production):

1. Update `KEYCLOAK_ISSUER_URL` in `.env`:
   ```bash
   KEYCLOAK_ISSUER_URL=https://keycloak.intocps.org/auth/realms/dtaas
   ```

Update client redirect URIs in Keycloak to use the production domain

### 1. Secure Credentials

- Change the default Keycloak admin password
- Use strong client secrets
- Store secrets securely (Docker secrets or external secret managers)
- Rotate secrets regularly

### 2. Database Backend

For production, configure Keycloak with a proper database (PostgreSQL, MySQL):

```yaml
keycloak:
  environment:
   - KC_DB=postgres
   - KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
   - KC_DB_USERNAME=keycloak
   - KC_DB_PASSWORD=secure_password
```

## Troubleshooting

### Cannot Access Keycloak Admin Console

- Ensure the Keycloak service is running: `docker compose ps`
- Check Keycloak logs: `docker compose logs keycloak`
- Verify port 80/443 is accessible

### Authentication Loop/Redirect Issues

- Verify `KEYCLOAK_ISSUER_URL` matches the realm name
- Ensure redirect URIs in the Keycloak client include `/_oauth/*`
- Confirm `COOKIE_DOMAIN` matches the domain
- Clear browser cookies and retry

### "Invalid Client" Error

- Verify `KEYCLOAK_CLIENT_ID` matches the client ID in Keycloak
- Ensure `KEYCLOAK_CLIENT_SECRET` is correct
- Confirm client authentication is enabled for the client

### Forward Auth Not Working

- Check traefik-forward-auth logs: `docker compose logs traefik-forward-auth`
- Verify environment variables are set correctly
- Ensure Keycloak is reachable from the traefik-forward-auth container

## Advanced Configuration

### Custom Claims and Scopes

To access custom user attributes:

1. In Keycloak, create client scopes with mappers
2. Assign scopes to the client
3. Configure traefik-forward-auth to request additional scopes

### Role-Based Access Control (RBAC)

RBAC is supported in Keycloak but not implemented in the traefik-forward-auth service by default.

### Single Sign-On (SSO)

Keycloak supports SSO across multiple applications. Configure additional clients for other services as needed.

## References

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Traefik Forward Auth](https://github.com/thomseddon/traefik-forward-auth)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)
