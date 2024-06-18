# Install DTaaS on a Production Server

The installation instructions provided in this README are
ideal for hosting the DTaaS as web application
for multiple users.

## Design

An illustration of the docker containers used and the authorization
setup is shown here.

![Traefik OAuth](./server.png)

In the new application configuration, there are two OAuth2 applications.

## Requirements

The installation requirements to run this docker version of the DTaaS are:

### Docker with Compose Plugin

It is mandatory to have [Docker](https://www.docker.com/) installed
on your computer. We highly recommend using
[Docker Desktop](https://www.docker.com/products/docker-desktop/).

### Domain name

The DTaaS software is a web application and is preferably hosted
on a server with a domain name like <http:>_foo.com_</http:>.
It is also possible to use an IP address in place of domain name.

### OAuth Provider

**[Gitlab Instance](https://about.gitlab.com/install/)** -
The DTaaS uses Gitlab OAuth2.0 authorization for user authorization.
You can either have an on-premise instance of gitlab, or
use [gitlab.com](https://gitlab.com) itself.

### User Accounts

Create user accounts in the linked gitlab instance for all the users.

### OAuth2 Application Registration

The multi-user installation setup requires dedicated authorization
setup for both frontend website and backend services.
Both these authorization requirements are satisfied
using OAuth2 protocol.

- The frontend website is a React single page application (SPA).
- The details of Oauth2 app for the frontend website are in
  [client docs](client/auth.md).
- The Oauth2 authorization for backend services is managed
  by [Traefik forward-auth](https://github.com/thomseddon/traefik-forward-auth).
  The details of this authorization setup are in
  [server docs](servers/auth.md).

Based on your selection of gitlab instance, it is necessary
to register these two OAuth2 applications and link them
to your intended DTaaS installation.

Please see
[gitlab oauth provider](https://docs.gitlab.com/ee/integration/oauth_provider.html)
documentation for further help with creating these two OAuth applications.

## Download Release Package

The software is available for as
a [zip package](https://github.com/INTO-CPS-Association/DTaaS/releases/download/v0.5.0/DTaaS-v0.5.0.zip).
Please download and unzip the same. A new **DTaaS-v0.5.0** folder gets created.
The rest of the installation instructions assume that you are using
Windows/Linux/MacOS terminal in **DTaaS-v0.5.0** folder.

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

Edit all the fields according to your specific case.

  | URL Path | Example Value | Explanation |
  |:------------|:---------------|:---------------|
  | DTAAS_DIR | '/Users/username/DTaaS' | Full path to the DTaaS directory. This is an absolute path with no trailing slash. |
  | SERVER_DNS | <http>_foo.com_</http> | The server DNS, if you are deploying with a dedicated server. Remember not use  <http:>http(s)</http:> at the beginning of the DNS string |
  | OAUTH_URL | <http>_gitlab.foo.com_<http/> | The URL of your Gitlab instance. It can be <http>_gitlab.com_<http/> if you are planning to use it for authorization. |
  | CLIENT_ID | 'xx' | The ID of your server OAuth application |
  | CLIENT_SECRET | 'xx' | The Secret of your server OAuth application |
  | OAUTH_SECRET | 'random-secret-string' | Any private random string. This is a password you choose for local installation. |
  | username1 | 'user1' | The gitlab instance username of a user of DTaaS |
  | username2 | 'user2' | The gitlab instance username of a user of DTaaS |
  | CLIENT_CONFIG | '/Users/username/DTaaS/deploy/config/client/env.js' | Full path to env.js file for client |

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    Important points to note:

    1. The path examples given here are for Linux OS.
       These paths can be Windows OS compatible paths as well.
    1. The Server DNS can also be an IP address.
       However, for proper working it is neccessary to use the
       same convention (IP/DNS) in the `CLIENT_CONFIG` file as well.
<!-- markdownlint-enable MD046 -->

### Website Client

The frontend React website requires configuration which is specified
via a filename provided in `CLIENT_CONFIG` variable of
`deploy/docker/.env.server` file.

The `CLIENT_CONFIG` file is in relative directory of
`deploy/config/client/env.js`.

Further explanation on the client configuration is available in
[client config](client/config.md).

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    There is a default OAuth application registered on <https://gitlab.com>
    for client. The corresponding OAuth application
    details are:

    ```js
    REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/',
    ```

    **This can be used for test purposes**. Please use your own OAuth application
    for secure production deployments.
<!-- markdownlint-enable MD046 -->

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

Please change the usernames and email addresses to the matching
user accounts on the OAuth provider
(either <https://gitlab.foo.com> or <https://gitlab.com>).

### Caveat

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
    The `compose.server.yml` file needs to updated to
    expose another directory like common assets directory.
<!-- markdownlint-enable MD046 -->

If you wish to reduce this scope to only **common assets**,
please change,

```yaml
  libms:
    image: intocps/libms:latest
    restart: unless-stopped
    volumes:
      - ${DTAAS_DIR}/deploy/config/lib.docker:/dtaas/libms/.env
      - ${DTAAS_DIR}/files/common:/dtaas/libms/files
```

The change in the last line. The `${DTAAS_DIR}/files`
got replaced by `${DTAAS_DIR}/files/common`. With this change, only
common files are readable-writable by all logged in users.

## Run

The commands to start and stop the appliation are:

```bash
docker compose -f compose.server.yml --env-file .env.server up -d
docker compose -f compose.server.yml --env-file .env.server down
```

To restart only a specific container, for example `client``

```bash
docker compose -f compose.server.yml --env-file .env.server up -d --force-recreate client
```

## Use

The application will be accessible at:
<http://foo.com> from web browser.
Sign in using your account linked to
either _gitlab.com_ or your local gitlab instance.

All the functionality of DTaaS should be available to your users
through the single page client now.

You may have to click Sign in to Gitlab on the Client page
and authorize access to the shown application.

### Adding a new user

Please see the [add new user](guides/add_user.md) to add new users.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[ml-workspace](https://github.com/ml-tooling/ml-workspace),
[reactjs](https://krify.co/about-reactjs/),
[gitlab](https://gitlab.com)
