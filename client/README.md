# Introduction

Client (frontend) for Digital Twin as a Service (DTaaS) software.
This software shall be used for providing a React single page web
application for the Digital Twin support platform.

## Authorization

The react client website uses OAuth authorization.
The [authorization page](../docs/admin/client/auth.md)
provides details on setting up oauth authorization for
the client application.

### Use

Refer to [DOCKER.md](DOCKER.md) for containerized deployment of
the client service.

## Use in Nodejs Environment

The following steps are needed only if you are interested
in building the client application from source code.
The use of docker images is highly recommended.

### Build

The following steps are required to build the client web application.

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS/client
yarn install --production   # install dependencies without Playwright and devDependencies
yarn build      #build the react app into build/ directory
```

### Adjust Configuration

It is required to have a `env.js` in the root directory of
`build` during runtime. This file is used to configure the
endpoints of the application.
See the [config page](../docs/admin/client/config.md)
for an explanation of client configuration.

Update the configuration in `client/test.js` and execute
the following commands.

```bash
yarn config:test
yarn start       #start the application
yarn clean       #clean the directory of temporary files
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
