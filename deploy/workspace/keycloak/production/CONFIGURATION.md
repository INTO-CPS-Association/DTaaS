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

- [Web Client](#️-dtaas-web-client-config)
- [OAuth2](#-oauth2-configuration)

## 🌍 Environment

The compose commands used in the setup guides sets the environment
with an environment file. An example of this file can be found at
[`.env.example`](.env.example).

Create a copy of this example file without the example suffix:

```bash
cp .env.example .env
```

## 🌐 Domain

Decide on whether you are testing locally or remotely.

From now on whenever you see `<DOMAIN_NAME>` in this guide, replace it with
your remote machines domain name. (Ensure that you remote machine has
a domain name, and that it is accesible from the internet.)

Go to the [Environment file](.env) and replace the current value of
the `SERVER_DNS` variable with your domain name:

```bash
# Server Configuration
# Replace with your domain name
SERVER_DNS=<DOMAIN_NAME>
```

## 🔒 TLS Certificates

Make sure that you have valid TLS certifcates on the machine and
that they are properly located. The `fullchain.pem` and `privkey.pem`
secrets should be located in the [`certs/`](certs/) directory.

There are multiple ways to setup of TLS certificates. If you are hosting on
a webserver, then you can use Certbot from Let's Encrypt:

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
the [environment variable file](#-environment) `config/.env`.
Change the default values (`user1` and `user2`) to your desired usernames:

```bash
# Username Configuration
# These usernames will be used as path prefixes for user workspaces
# Example: https://foo.com/user1, https://foo.com/user2
USERNAME1=user1
USERNAME2=user2
```

**NOTE:** These usernames must match the names of the keycloak users
used in the forward auth.

## 🚪 Traefik Forward Auth Configuration

The [`config/conf.example`](./config/conf.example) contains
example configuration for the forward-auth service.

Create a copy of this example file without the example suffix:

```bash
cp config/conf.example config/conf
```

Then update the configuration file with the usernames and emails of
the GitLab users that correspond to user 1 and 2 respectively.
(You must either have two seperate GitLab users, or skip the configuration of
one of the two users).

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

## 🖥️ DTaaS Web Client Config

The DTaaS Web Client can be configured with a small javascript file,
an example of which can be found at
[`config/client.js.example`](config/client.js.example).

Create a copy of this example file without the example suffix:

```bash
cp config/client.js.example config/client.js
```

Then, edit the new DTaaS Web Client config file, updating the following values:

### 🔑🖥️ Client OAuth2 Setup

In addition, the DTaaS web client uses OAuth2 authorization as well.
It needs a client application.
The following steps explain creation of Client OAuth2 application
on a Gitlab installation.

1. Go to your GitLab instance → Edit Profile Settings → Applications
2. Create a new OAuth App with:
   - **Application name**: DTaaS Workspace
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/Library`
   - **Scopes**: `openid`, `profile`, `read_user`, `read_repository`, `api`
3. Save the **Client ID**

Create and update the DTaaS web client configuration.

```bash
cp dtaas/client.js.example dtaas/client.js
```

Update the `REACT_APP_CLIENT_ID` with the **Client ID** generated above
and `REACT_APP_AUTH_AUTHORITY` with URL of your GitLab instance, for example
`https://gitlab.com`.

## 🔑 OAuth2 Configuration

Both this composition and the contained DTaaS Web Client uses
OAuth2 for authentication. You'll need to configure an OAuth2 apllication
for each, with your OAuth2 provider. This guide assumes that you use
Gitlab as your provider; other providers are possible but are not covered
by this guide.

### 🎯 Keycloak Authentication

The default configuration for `compose.traefik.secure.yml` now uses **Keycloak** 
for authentication via OIDC (OpenID Connect). Keycloak provides a robust, 
enterprise-grade identity and access management solution.

**For detailed Keycloak setup instructions, see [KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md)**

Quick overview:
1. Start services with `docker compose up -d`
2. Access Keycloak at `https://foo.com/auth`
3. Create a realm and OIDC client
4. Create users in Keycloak
5. Update `.env` with client credentials


#### Configure Environment Variables

1. **For Keycloak (default)**, edit `config/.env` and fill in your Keycloak credentials:

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
   KEYCLOAK_ISSUER_URL=http://keycloak:8080/auth/realms/dtaas

   # Secret key for encrypting OAuth session data
   # Generate a random string (at least 16 characters)
   OAUTH_SECRET=$(openssl rand -base64 32)
   ```

## 📚 Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
