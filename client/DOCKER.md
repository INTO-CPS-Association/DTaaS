# Introduction

Client (frontend) for Digital Twin as a Service (DTaaS) software.
This software shall be used for providing a React single page web
application for the Digital Twin support platform.

## Authorization

The react client website uses OAuth authorization.
The [authorization page](https://into-cps-association.github.io/DTaaS/development/admin/client/auth.html)
provides details on setting up oauth authorization for
the client application.

## Use in Docker Environment

### Adjust Configuration

The client application requires configuration.
See the [config page](https://into-cps-association.github.io/DTaaS/development/admin/client/config.html)
for an explanation of client configuration.

The docker version of client application uses configuration
file available in `config/test.js`. This default configuration
works well if you have an account on <https://gitlab.com>.
If you would like to adjust the configuration, please change this file.

### Use

The commands to start and stop the appliation are:

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd client
docker compose -f compose.client.yml up -d
```

This command brings up the client docker container and makes
the website available at <http://localhost:4000>.
The `config/test.js` file is used as client configuration.
If you wish to adjust the client configuration, please change
configuration values in this file and restart the container.

```bash
docker compose -f compose.client.yml down
docker compose -f compose.client.yml up -d
```

## Missing Workspace

The development environment does not have user workspaces and
traefik gateway running in the background. As a consequence, the iframe
links pointing to user workspace will not work correctly. Instead, you
will see the following error.

```txt
Unexpected Application Error!
404 Not Found
```

This error can be seen on the **Library** and **Digital Twins** pages.
This error is expected.

If you would like to try the complete DTaaS application, please see
localhost installation in
[docs](https://into-cps-association.github.io/DTaaS/development/admin/localhost.html).
