![DTaaS logo](dtaas.png)

Thank you for downloading **Digital Twin as a Service v1.0-alpha**.

## Install

The installation instructions provided in this README are
ideal for hosting the DTaaS as web application
for multiple users.

## Design

An illustration of the docker containers used and the authorization
setup is shown here.

<img src="server.png" alt="DTaaS on Server" width="600px" />

The installation requirements to run this docker version of the DTaaS are:

### Domain name

The DTaaS software is a web application and is preferably hosted
on a server with a domain name like _intocps.org_.
It is also possible to use an IP address in place of domain name.

### OAuth Provider

**[Gitlab Instance](https://about.gitlab.com/install/)** -
The DTaaS uses Gitlab OAuth2.0 authorization for user authorization.
You can either have an on-premise instance of gitlab, or
use [gitlab.com](https://gitlab.com) itself.

### User Accounts

Create user accounts in a linked gitlab instance for all the users.

The default docker compose configuration file contains
two users - _user1_ and _user2_.
These names need to be changed to suitable usernames.

### OAuth2 Application Registration

The multi-user installation setup requires dedicated authorization
setup for both frontend website and backend services.
Both these authorization requirements are satisfied
using OAuth2 protocol.

- The frontend website is a React single page application (SPA).
- The details of Oauth2 app for the frontend website are in
  [client docs](https://into-cps-association.github.io/DTaaS/version0.8/admin/client/auth.html).
- The Oauth2 authorization for backend services is managed
  by [Traefik forward-auth](https://github.com/thomseddon/traefik-forward-auth).
  The details of this authorization setup are in
  [server docs](https://into-cps-association.github.io/DTaaS/version0.8/admin/servers/auth.html).

It is possible to use <https://gitlab.com> or a local installation
of Gitlab can be used for this purpose.
Based on your selection of gitlab instance, it is necessary
to register these two OAuth2 applications and link them
to your intended DTaaS installation.

Please see
[gitlab oauth provider](https://docs.gitlab.com/ee/integration/oauth_provider.html)
documentation for further help with creating these two OAuth applications.

## Configuration

Copy and customize the three configuration files.

```bash
cp .env.example .env
cp conf.server.example conf.server
cp client.js.example client.js
```

### Docker Compose

The docker compose configuration is in `.env`.
It is a sample file containing environment variables
that are used by the docker compose files.
It can be updated to suit your local installation scenario.

### Website Client

The frontend React website requires configuration which is specified
in the client configuration file (`env.js`).

There is a default OAuth application registered on <https://gitlab.com>
for client. The corresponding OAuth application
details are:

```js
REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/',
```

**This can be used for test purposes**. Use your own OAuth application
for secure production deployments.

### Create User Workspace

The existing filesystem for installation is setup for `files/user1`.
A new filesystem directory needs to be created for the selected user.

Please execute the following commands from the top-level directory
of the DTaaS project.

```bash
cp -R files/user1 files/username
```

where _username_ is one of the selected usernames. This command
needs to be repeated for all the selected users.

Set the file permissions for the user workspaces.

```bash
sudo chown -R 1000:100 files/*
```

### Configure Authorization Rules for Traefik Forward-Auth

The Traefik forward-auth microservices requires configuration rules to manage
authorization for different URL paths.
The `conf.server` file can be used to
configure the authorization for user workspaces.

```text
rule.onlyu1.action=auth
rule.onlyu1.rule=Path(`/user1`)
rule.onlyu1.whitelist = user1@localhost

rule.onlyu1.action=auth
rule.onlyu1.rule=Path(`/user2`)
rule.onlyu1.whitelist = user2@localhost
```

Please change the usernames and email addresses to the matching
user accounts on the OAuth provider
(either <https://intocps.org/gitlab> or <https://gitlab.com>).

#### Caveat

The usernames in the `.env` file need to match those in
the `conf.server` file.

Traefik routes are controlled by the `.env` file.
Authorization on these routes is controlled by the `conf.server` file.
If a route is not specified in `conf.server` file
but an authorisation is requested by traefik for this unknown route,
the default behavior of
traefik forward-auth kicks in. This default behavior is to enable
endpoint being available to any signed in user.

If there are extra routes in `conf.server` file but these are not
in `.env` file,
such routes are not served by traefik; it will give **404 server response**.

## Run

### Obtain TLS / HTTPS Certificate

Obtain the required TLS certificate either through
[certbot](https://certbot.eff.org/) or directly from
online certificate providers.

The certificates need to be issued for `foo.com` or `*.foo.com`.
The names of the certificates must be `fullchain.pem` and `privkey.pem`.
The `fullchain.pem` corresponds to public certificate and
the `privkey.pem` corresponds to private key.

### Add TLS Certificates to Traefik

Copy the two certificate files into:

- `certs/fullchain.pem`
- `certs/privkey.pem`

Traefik will run with self-issued certificates if the above two certificates
are either not found or found invalid.

### Start

The commands to start and stop the appliation are:

```bash
docker compose up -d
docker compose down
```

## Use

The application will be accessible at:
`https://intocps.org` from web browser.
Sign in using your account linked to
either _gitlab.com_ or your local gitlab instance.

All the functionality of DTaaS should be available to your users
through the single page client now.

## Documentation

Please see
<https://into-cps-association.github.io/DTaaS/development/index.html>
for complete documentation.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[gitlab](https://gitlab.com)
