# Install DTaaS on a Production Server

The installation instructions provided in this document are
ideal for hosting the DTaaS as web application
for multiple users.

## Design

An illustration of the docker containers used and the authorization
setup is presented here.

![Traefik OAuth 2.0](server.png)

🗒️ The text starting with `/` at the beginning indicates the URL route
at which a certain service is available. For example, user workspace
is available at <https://localhost/user1>.

In the new application configuration, there are two OAuth 2.0 applications.

## Requirements

The installation requirements to run this docker version of the DTaaS are:

### Docker with Compose Plugin

Docker installation is mandatory.
[Docker](https://www.docker.com/) must be installed
on the host computer.

### Domain name

The DTaaS software is a web application and is preferably hosted
on a server with a domain name like <http:>_foo.com_</http:>.
It is also possible to use an IP address in place of domain name.

### TLS / HTTPS Certificate (Optional)

HTTPS functionality can be added to the DTaaS software installation.
The required TLS certificates can be created through
[certbot](https://certbot.eff.org/).

### OAuth 2.0 Provider

**[GitLab Instance](https://about.gitlab.com/install/)** -
The DTaaS uses GitLab OAuth 2.0 authorization for user authorization.
Either an on-premise instance of GitLab can be used, or
[gitlab.com](https://gitlab.com) itself.

### User Accounts

Create user accounts in a linked GitLab instance for all the users.

The default docker compose file contains two - _user1_ and _user2_.
These names need to be changed to suitable usernames.

### OAuth 2.0 Application Registration

The multi-user installation setup requires dedicated authorization
setup for both frontend website and backend services.
Both these authorization requirements are satisfied
using OAuth 2.0 protocol.

- The frontend website is a React single page application (SPA).
- The details of OAuth 2.0 application for the frontend website are in
  [client docs](client/auth.md).
- The OAuth 2.0 authorization for backend services is managed
  by [Traefik forward-auth](https://github.com/thomseddon/traefik-forward-auth).
  The details of this authorization setup are in
  [server docs](servers/auth.md).

It is possible to use <https://gitlab.com> or a local installation
of GitLab can be used for this purpose.
Based on your selection of gitlab instance, it is necessary
to register these two OAuth 2.0 applications and link them
to the intended DTaaS installation.

The
[GitLab OAuth 2.0 provider](https://docs.gitlab.com/ee/integration/oauth_provider.html)
documentation provides further guidance on creating these two OAuth 2.0 applications.

## Clone Codebase

If the DTaaS git repository has not been cloned, cloning is
the first step.
If the codebase already exists, the cloning step can be skipped.
To clone:

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS
```

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip file pathnames

    1. The filepaths shown here follow Linux OS.
       The installation procedures also work with Windows
       OS.
    1. The description below refers to filenames. All the file
       paths mentioned below are relatively to the top-level
       **DTaaS** directory.
<!-- markdownlint-enable MD046 -->

## Configuration

Three following configuration files need to be updated.

### Docker Compose

The docker compose configuration is in `deploy/docker/.env.server`.
it is a sample file.
It contains environment variables
that are used by the docker compose files.
It can be updated to suit your local installation scenario.
It contains the following environment variables.

All fields should be edited according to the specific deployment case.

| URL Path            | Example Value                 | Explanation                                                                                                                               |
| :------------------ | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| DTAAS_DIR           | '/Users/username/DTaaS'       | Full path to the DTaaS directory. This is an absolute path with no trailing slash.                                                        |
| SERVER_DNS          | <http>_foo.com_</http>        | The server DNS, if you are deploying with a dedicated server. Remember not use  <http:>http(s)</http:> at the beginning of the DNS string |
| OAUTH_URL           | <http>_gitlab.foo.com_<http/> | The URL of your GitLab instance. It can be <http>_gitlab.com_<http/> if you are planning to use it for authorization.                     |
| OAUTH_CLIENT_ID     | 'xx'                          | The ID of your server OAuth 2.0 application                                                                                               |
| OAUTH_CLIENT_SECRET | 'xx'                          | The Secret of your server OAuth 2.0 application                                                                                           |
| OAUTH_SECRET        | 'random-secret-string'        | Any private random string. This is a password you choose for local installation.                                                          |
| username1           | 'user1'                       | The GitLab instance username of a user of DTaaS                                                                                           |
| username2           | 'user2'                       | The GitLab instance username of a user of DTaaS                                                                                           |

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    Important points to note:

    1. The path examples given here are for Linux OS.
       These paths can be Windows OS compatible paths as well.
    1. The client configuration file is located at `deploy/config/client/env.js`.
    1. The Server DNS can also be an IP address.
       However, for proper working it is neccessary to use the
       same convention (IP/DNS) in the client configuration file as well.
<!-- markdownlint-enable MD046 -->

### Website Client

The frontend React website requires configuration which is specified
in the client configuration file (`deploy/config/client/env.js`).

Further explanation on the client configuration is available in
[client config](client/config.md).

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    There is a default OAuth 2.0 application registered on <https://gitlab.com>
    for client. The corresponding OAuth 2.0 application
    details are:

    ```js
    REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/',
    ```

    **This can be used for test purposes**. Please use your own OAuth 2.0 application
    for secure production deployments.
<!-- markdownlint-enable MD046 -->

### Create User Workspace

The existing filesystem for installation is configured for `files/user1`.
A new filesystem directory must be created for the selected user.

The following commands should be executed from the top-level directory
of the DTaaS project.

```bash
cp -R files/user1 files/username
```

where _username_ is one of the selected usernames. This command
needs to be repeated for all the selected users.

### Configure Authorization Rules for Backend Authorization

The Traefik forward-auth microservices requires configuration rules to manage
authorization for different URL paths.
The `deploy/docker/conf.server` file can be used to
configure the authorization for user workspaces.

```text
rule.onlyu1.action=auth
rule.onlyu1.rule=Path(`/user1`)
rule.onlyu1.whitelist = user1@localhost

rule.onlyu1.action=auth
rule.onlyu1.rule=Path(`/user2`)
rule.onlyu1.whitelist = user2@localhost
```

The usernames and email addresses should be changed to match the
user accounts on the OAuth 2.0 provider
(either <https://gitlab.foo.com> or <https://gitlab.com>).

#### Caveat

The usernames in the `deploy/docker/.env.server` file need to match those in
the `deploy/docker/conf.server` file.

Traefik routes are controlled by the `deploy/docker/.env.server` file.
Authorization on these routes is controlled by the `deploy/docker/conf.server` file.
If a route is not specified in `deploy/docker/conf.server` file
but an authorisation is requested by traefik for this unknown route,
the default behavior of
traefik forward-auth kicks in. This default behavior is to enable
endpoint being available to any signed in user.

If there are extra routes in `deploy/docker/conf.server` file but these are not
in `deploy/docker/.env.server` file,
such routes are not served by traefik; it will give **404 server response**.

## Access Rights Over Files

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! warning
    The default setting in docker compose file exposes
    all user files at <http://foo.com/lib/files>.
    All files of all the users are readable-writable by
    all logged in users.
    The `compose.server.yml` / `compose.server.secure.yml` file needs to be
    updated to expose another directory like common assets directory.
<!-- markdownlint-enable MD046 -->

If you wish to reduce this scope to only **common assets**,
please change,

```yaml
  libms:
    image: intocps/libms:latest
    restart: unless-stopped
    volumes:
      - ${DTAAS_DIR}/deploy/config/libms.yaml:/dtaas/libms/libms.yaml
      - ${DTAAS_DIR}/files/common:/dtaas/libms/files
```

The change in the last line. The `${DTAAS_DIR}/files`
got replaced by `${DTAAS_DIR}/files/common`. With this change, only
common files are readable-writable by all logged in users.

### Add TLS Certificates (Optional)

The application can be served on HTTPS connection for which TLS certificates
are needed. The certificates need to be issued for `foo.com` or `*.foo.com`.
The names of the certificates must be `fullchain.pem` and `privkey.pem`. Copy
these two certificate files into:

- `certs/foo.com/fullchain.pem`
- `certs/foo.com/privkey.pem`

Traefik will run with self-issued certificates if the above two certificates
are either not found or found invalid.

Remember to update `dynamic/tls.yml` with correct path matching your DNS name.
For example, if your DNS name is `www.foo.com`, then copy the
TLS certificates of `www.foo.com` to `certs/` directory and update
`dynamic/tls.yml` as follows.

```yml
tls:
  certificates:
    - certFile: /etc/traefik-certs/www.foo.com/fullchain.pem
      keyFile: /etc/traefik-certs/www.foo.com/privkey.pem
      stores:
        - default
```

## Run

### Over HTTP

This docker compose file serves application over HTTP.

The commands to start and stop the appliation are:

```bash
docker compose -f compose.server.yml --env-file .env.server up -d
docker compose -f compose.server.yml --env-file .env.server down
```

To restart only a specific container, for example `client`

```bash
docker compose -f compose.server.yml --env-file .env.server up \
  -d --force-recreate client
```

### Over HTTPS

This docker compose file serves application over HTTP.

The commands to start and stop the appliation are:

```bash
docker compose -f compose.server.secure.yml --env-file .env.server up -d
docker compose -f compose.server.secure.yml --env-file .env.server down
```

To restart only a specific container, for example `client`

```bash
docker compose -f compose.server.secure.yml --env-file .env.server up \
  -d --force-recreate client
```

## Use

The application will be accessible at:
<http(s)://foo.com> from a web browser.
Users can sign in using accounts linked to
either _gitlab.com_ or the local GitLab instance.

All the functionality of DTaaS should be available to users
through the single page client.

Users may need to click Sign in to GitLab on the Client page
and authorize access to the displayed application.

### Adding a new user

Please see the [add new user](guides/add_user.md) to add new users.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[ml-workspace](https://github.com/ml-tooling/ml-workspace),
[reactjs](https://krify.co/about-reactjs/),
[GitLab](https://gitlab.com)
