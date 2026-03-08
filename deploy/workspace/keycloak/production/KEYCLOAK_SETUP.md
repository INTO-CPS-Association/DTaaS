# Keycloak Setup Guide for DTaaS

This guide explains how to configure Keycloak for authentication in the DTaaS workspace deployment.

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

### 1. Configure Environment Variables

Copy the example environment file and update it:

```bash
cd workspaces/test/dtaas
cp config/.env.example config/.env
```

Edit `config/.env`:

```bash
# Keycloak Admin Credentials (for initial setup)
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=changeme

# Keycloak Realm
KEYCLOAK_REALM=dtaas

# Keycloak Client Configuration (will be created in step 2)
KEYCLOAK_CLIENT_ID=dtaas-workspace
KEYCLOAK_CLIENT_SECRET=<generated-secret>

# Server Configuration
SERVER_DNS=foo.com

# Generate a secure secret for OAuth sessions (run locally)
OAUTH_SECRET=$(openssl rand -base64 32)

# Usernames
USERNAME1=user1
USERNAME2=user2
```

### 2. Start Services

Build and start all services:

```bash
docker compose -f compose.traefik.secure.tls.yml build
docker compose -f compose.traefik.secure.tls.yml --env-file config/.env up -d
```

### 3. Configure Keycloak

#### Access Keycloak Admin Console

1. Navigate to `https://foo.com/auth`
2. Click **Administration Console**
3. Login with credentials from your `.env` file (default: `admin` / `admin`)

#### Create a Realm

1. In the top-left dropdown (currently showing "Master"), click **Create Realm**  
2. **Realm name**: `dtaas` (or match your `KEYCLOAK_REALM` in `.env`)  
3. Click **Create**

#### Create a Client

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
   - **Root URL**: `https://foo.com`
   - **Valid redirect URIs**:
    - `https://foo.com/_oauth/*`
    - `https://foo.com/*`
   - **Valid post logout redirect URIs**: `https://foo.com/*`
   - **Web origins**: `https://foo.com`
   - Click **Save**
6. Get the client secret:
   - Go to the **Credentials** tab
   - Copy the **Client secret** value
   - Update `KEYCLOAK_CLIENT_SECRET` in your `.env` file

#### Create Users

1. In the left sidebar, click **Users**
2. Click **Create new user**
3. Fill in user details:
   - **Username**: `user1` (or desired username)
   - **Email**: user's email (optional)
   - **First name** / **Last name**: optional
   - **Email verified**: ON (optional, for testing)
4. Click **Create**
5. Set password:
   - Go to the **Credentials** tab
   - Click **Set password**
   - Enter a password
   - **Temporary**: OFF (so users don't have to change it on first login)  
   - Click **Save**
6. Repeat for additional users (e.g., `user2`)

### 4. Restart Services

After configuring Keycloak, restart the services to apply the new client secret:

```bash
docker compose down
docker compose up -d
```

### 5. Test Authentication

1. Navigate to `https://foo.com/`
2. You should be redirected to Keycloak login
3. Login with one of the users you created
4. You should be redirected back to the DTaaS interface

## Access Control Configuration

Copy `config/conf.example` to `config/conf` and edit it:

```ini
# Allow only user1 to access /user1 paths
rule.user1_access.action=auth
rule.user1_access.rule=PathPrefix(`/user1`)
rule.user1_access.whitelist=user1@localhost

# Allow only user2 to access /user2 paths
rule.user2_access.action=auth
rule.user2_access.rule=PathPrefix(`/user2`)
rule.user2_access.whitelist=user2@localhost
```

**Note**: The whitelist uses the email address from Keycloak. Adjust accordingly.

## Production Considerations

### 1. Use HTTPS

Use `compose.traefik.secure.tls.yml` for TLS/HTTPS in production.

### 2. External Keycloak

To use an external Keycloak instance (recommended for production):

1. Update `KEYCLOAK_ISSUER_URL` in `.env`:
   ```bash
   KEYCLOAK_ISSUER_URL=https://keycloak.example.com/auth/realms/dtaas
   ```

2. Optionally remove the `keycloak` service from `compose.traefik.secure.tls.yml`:
   - Comment out or delete the `keycloak` service section
   - Remove `keycloak` from `depends_on` in `traefik-forward-auth`
   - Remove the `keycloak-data` volume

3. Update client redirect URIs in Keycloak to use your production domain

### 3. Secure Credentials

- Change the default Keycloak admin password
- Use strong client secrets
- Store secrets securely (Docker secrets or external secret managers)
- Rotate secrets regularly

### 4. Database Backend

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
- Confirm `COOKIE_DOMAIN` matches your domain
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

## Migration from GitLab OAuth

If you're migrating from the previous GitLab OAuth setup:

1. Backup your current `.env` file
2. Update `.env` with Keycloak configuration
3. Update user whitelist in `config/conf` to use Keycloak usernames/emails
4. Test with a single user before migrating all users

## References

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Traefik Forward Auth](https://github.com/thomseddon/traefik-forward-auth)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)
