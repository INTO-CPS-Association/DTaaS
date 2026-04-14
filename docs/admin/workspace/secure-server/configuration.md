# ⚙️ DTaaS Configuration

This document outlines the configuration needed for the docker compose file.
The configuration can be divided into pre and post-install parts.
The pre-install configuration tasks must be completed before bringing up
the docker compose services, while the post-install configuration tasks must be
completed after bringing up the docker compose services.

**Pre-install Configuration Tasks:**

- [Environment](#-environment)
- [Domain](#-domain)
- [TLS Certificates](#-tls-certificates)
- [Usernames](#-usernames)
- [Forward Auth](#-traefik-forward-auth-configuration)

**Post-install Configuration Tasks:**

- [Keycloak Integration](#-keycloak-integration)
- [Web Client](#️-dtaas-web-client-config)

## 🌍 Environment

The compose commands used in the setup guides sets the environment
with an environment file. An example of this file can be found at
`.env.example`.

Create a copy of this example file without the example suffix:

```bash
cp .env.example .env
```

## 🌐 Domain

Decide whether the deployment is local or remote.

From now on whenever `<DOMAIN_NAME>` or `intocps.org` appears
in this guide, replace it with the domain name of the remote machine.
Ensure that the remote machine has a domain name and that it is
accessible from the internet.

Open `.env` and replace the current value of
the `SERVER_DNS` variable with the domain name:

```bash
# Server Configuration
# Replace with your domain name
SERVER_DNS=<DOMAIN_NAME>
```

## 🔒 TLS Certificates

Ensure that valid TLS certificates are present on the machine and
that they are properly located. The `fullchain.pem` and `privkey.pem`
secrets should be located in the `certs/` directory.

There are multiple ways to set up TLS certificates. If hosting on
a webserver, Certbot from Let's Encrypt may be used:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d <DOMAIN_NAME>

# Copy certificates to the project
sudo cp /etc/letsencrypt/live/<DOMAIN_NAME>/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/<DOMAIN_NAME>/privkey.pem ./certs/
sudo chown $USER:$USER ./certs/*.pem
chmod 644 ./certs/fullchain.pem
chmod 600 ./certs/privkey.pem
```

## 👥 Usernames

The usernames of the main users for the workspaces can be changed in
the [environment variable file](#-environment) `.env`.
Change the default values (`user1` and `user2`) to the desired usernames:

```bash
# Username Configuration
# These usernames will be used as path prefixes for user workspaces
# Example: https://intocps.org/user1, https://intocps.org/user2
USERNAME1=user1
USERNAME2=user2
```

**NOTE:** These usernames must match the names of the keycloak users
used in the forward auth.

## 🚪 Traefik Forward Auth Configuration

The `config/forward-auth-conf.example` file contains
example configuration for the forward-auth service.

Create a copy of this example file without the example suffix:

```bash
cp config/forward-auth-conf.example config/forward-auth-conf
```

Then update the traefik forward auth configuration file with the usernames
and emails of the Keycloak users that correspond to `user1` and `user2`
respectively.

```txt
rule.user1_access.action=auth
rule.user1_access.rule=PathPrefix(`/<USERNAME_USER1>`)
rule.user1_access.whitelist = <EMAIL_USER1>

rule.user2_access.action=auth
rule.user2_access.rule=PathPrefix(`/<USERNAME_USER2>`)
rule.user2_access.whitelist = <EMAIL_USER2>
```

**NOTE:** Ensure that the usernames set in the
[Usernames configuration step](#-usernames) are the same as those set
in the Traefik Forward Auth configuration file.

## 🎯 Keycloak Integration

The default configuration for `docker-compose.yml` now uses **Keycloak**
for authentication via OIDC (OpenID Connect). Keycloak provides a robust,
enterprise-grade identity and access management solution.
The `traefik-forward-auth` and the DTaaS `client` docker services use
**Keycloak** for authentication and authorisation. An OAuth2 application
must be configured for each, using the integrated **Keycloak** service.

**For detailed Keycloak setup instructions,
see [keycloak-setup.md](keycloak-setup.md)**

### Configure Environment Variables

1. **For Keycloak (default)**, edit `.env` and fill in the Keycloak credentials:

   ```bash
   # Keycloak Admin Credentials
   KEYCLOAK_ADMIN=admin
   KEYCLOAK_ADMIN_PASSWORD=changeme

   # Keycloak Realm
   KEYCLOAK_REALM=dtaas

   # Keycloak Client Credentials (obtain from Keycloak after creating client)
   KEYCLOAK_CLIENT_ID=dtaas-workspace
   KEYCLOAK_CLIENT_SECRET=your_client_secret_here

   # Keycloak Issuer URL
   KEYCLOAK_ISSUER_URL=https://<DOMAIN_NAME>/auth/realms/<REALM>

   # Secret key for encrypting OAuth session data
   # Generate a random string (at least 16 characters)
   # for example, using the following command
   # openssl rand -base64 32
   OAUTH_SECRET=your-oauth-secret
   ```

## 🖥️ DTaaS Web Client Config

The DTaaS Web Client can be configured with a small javascript file,
an example of which can be found at
`config/client.js.example`.

Create a copy of this example file without the example suffix:

```bash
cp config/client.js.example config/client.js
```

Then, edit the new DTaaS Web Client config file, updating the following values:

### 🔑🖥️ Client OAuth2 Setup

The DTaaS web client is a React SPA that authenticates via Keycloak using
the **Authorization Code flow with PKCE**. Follow the
[Create OAuth2 Client for DTaaS Client Service](keycloak-setup.md#create-oauth2-client-for-dtaas-client-service)
instructions in [keycloak-setup.md](keycloak-setup.md#create-oauth2-client-for-dtaas-client-service)
to create the public PKCE client in
Keycloak, then update `config/client.js`:

```js
REACT_APP_CLIENT_ID: 'dtaas-client',          // Client ID set in Keycloak
REACT_APP_AUTH_AUTHORITY: 'https://<DOMAIN_NAME>/auth/realms/dtaas',
REACT_APP_REDIRECT_URI: 'https://<DOMAIN_NAME>/Library',
REACT_APP_LOGOUT_REDIRECT_URI: 'https://<DOMAIN_NAME>/',
REACT_APP_GITLAB_SCOPES: 'openid profile',    // OIDC scopes requested from Keycloak
```

`openid` and `profile` are standard OIDC scopes provided by Keycloak by default.
`openid` is required for OIDC authentication and issues the ID token.
`profile` triggers the `profile` claim mapper configured on the Keycloak client,
which returns a URL of the form `https://<DOMAIN_NAME>/<username>` set as a
user attribute in Keycloak. The DTaaS web client extracts the username from
the last path segment of this URL.
The variable is named `REACT_APP_GITLAB_SCOPES` for legacy reasons;
it now carries the Keycloak OIDC scopes.

Replace `<DOMAIN_NAME>` with the value set in the
[Domain](#-domain) section and `dtaas` with the Keycloak realm name
if a different one was chosen.

## 📚 Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
