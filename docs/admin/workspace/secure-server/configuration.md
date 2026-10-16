# DTaaS Configuration

This document describes the configuration needed for the docker compose file.
It has pre-install and post-install parts. Complete the pre-install tasks
before bringing up the docker compose services, and the post-install tasks
after.

**Pre-install Configuration Tasks:**

- [Environment](#environment)
- [Domain](#domain)
- [TLS Certificates](#tls-certificates)
- [Usernames](#usernames)
- [Forward Auth](#traefik-forward-auth-configuration)

**Post-install Configuration Tasks:**

- [Keycloak Integration](#keycloak-integration)
- [Web Client](#dtaas-web-client-config)

## Environment

The compose commands in the setup guides read their environment from
an environment file. An example of this file is at
`config/.env.example`.

Create a copy of this example file without the example suffix:

```bash
cp config/.env.example config/.env
```

## Domain

Decide whether the deployment is local or remote.

Wherever `<DOMAIN_NAME>` or `intocps.org` appears
in this guide, replace it with the domain name of the remote machine.
The remote machine must have a domain name and be reachable from the
internet.

Open `config/.env` and replace the current value of
the `SERVER_DNS` variable with the domain name:

```bash
# Server Configuration
# Replace with the actual domain name
SERVER_DNS=<DOMAIN_NAME>
```

## TLS Certificates

Ensure that valid TLS certificates are present on the machine.
The `fullchain.pem` and `privkey.pem` files must be in the `certs/`
directory. Traefik reads them through `config/tls.yml`.

There are several ways to obtain TLS certificates. On a web server
you can use Certbot from Let's Encrypt:

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

## Usernames

The usernames of the main workspace users are set in
the [environment variable file](#environment) `config/.env`.
Change the default values (`user1` and `user2`) to the desired usernames:

```bash
# Username Configuration
# These usernames will be used as path prefixes for user workspaces
# Example: https://intocps.org/user1, https://intocps.org/user2
USERNAME1=user1
USERNAME2=user2
```

**NOTE:** These usernames must match the names of the Keycloak users
used in the forward auth configuration.

## Traefik Forward Auth Configuration

The `config/forward-auth-conf.example` file contains an
example configuration for the forward-auth service.

Create a copy of this example file without the example suffix:

```bash
cp config/forward-auth-conf.example config/forward-auth-conf
```

Then update the Traefik forward auth configuration file with the usernames
and emails of the Keycloak users that correspond to `user1` and `user2`.

```txt
rule.user1_access.action=auth
rule.user1_access.rule=PathPrefix(`/<USERNAME_USER1>`)
rule.user1_access.whitelist = <EMAIL_USER1>

rule.user2_access.action=auth
rule.user2_access.rule=PathPrefix(`/<USERNAME_USER2>`)
rule.user2_access.whitelist = <EMAIL_USER2>
```

**NOTE:** The usernames set in the
[Usernames configuration step](#usernames) must be the same as those
in the Traefik forward auth configuration file.

## Keycloak Integration

The default `docker-compose.yml` uses **Keycloak** for authentication
through OIDC (OpenID Connect).
The `traefik-forward-auth` and DTaaS `client` docker services use
**Keycloak** for authentication and authorisation. Each one needs an OAuth2
application in the integrated **Keycloak** service.

**For detailed Keycloak setup instructions,
see [keycloak-setup.md](keycloak-setup.md)**

### Configure Environment Variables

1. Edit `config/.env` and fill in the Keycloak credentials:

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

## DTaaS Web Client Config

The DTaaS web client is configured with a small JavaScript file.
An example is at `config/client.js.example`.

Create a copy of this example file without the example suffix:

```bash
cp config/client.js.example config/client.js
```

Then edit the new web client config file and update the following values.

### Client OAuth2 Setup

The DTaaS web client is a React SPA that authenticates with Keycloak using
the **Authorization Code flow with PKCE**. Follow the
[Create OAuth2 Client for DTaaS Client Service](keycloak-setup.md#create-oauth2-client-for-dtaas-client-service)
instructions to create the public PKCE client in Keycloak, then update
`config/client.js`:

```js
REACT_APP_CLIENT_ID: 'dtaas-client',          // Client ID set in Keycloak
REACT_APP_AUTH_AUTHORITY: 'https://<DOMAIN_NAME>/auth/realms/dtaas',
REACT_APP_REDIRECT_URI: 'https://<DOMAIN_NAME>/workbench',
REACT_APP_LOGOUT_REDIRECT_URI: 'https://<DOMAIN_NAME>/',
REACT_APP_GITLAB_SCOPES: 'openid profile',    // OIDC scopes requested from Keycloak
REACT_APP_PROFILE: 'workbench',              // Show only the Workbench page
```

`openid` and `profile` are standard OIDC scopes that Keycloak provides by
default. `openid` is required for OIDC authentication and issues the ID
token. `profile` adds the profile claims, including `preferred_username`
and the `profile` claim mapped from the `profile` user attribute that
[Create Users](keycloak-setup.md#create-users) sets.

The web client takes the username from the first of these claims that is
present: `preferred_username`, `username`, `nickname`, `login`, the part of
`email` before `@`, the part of `upn` before `@`, the last path segment of
the `profile` URL, and `sub`. The `profile` URL is also shown as the
user's profile link.
The variable is named `REACT_APP_GITLAB_SCOPES` for historical reasons;
it carries the Keycloak OIDC scopes.

`REACT_APP_PROFILE: 'workbench'` limits the web client to the Workbench
page, which is the only page a workspace installation serves. The other
pages need a GitLab instance, which this installation does not have.
Remove the line, or set it to `'full'`, to show every page.
With the `workbench` profile, `REACT_APP_REDIRECT_URI` must end in
`/workbench`; any other page shows the page-not-found message after
sign-in.
Web client images that predate the key ignore it and show every page.

Replace `<DOMAIN_NAME>` with the value set in the
[Domain](#domain) section, and replace `dtaas` with the Keycloak realm name
if you chose a different one.

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
