# Client Application

React single-page web application for the Digital Twin as a Service (DTaaS)
platform.

## 🔐 Authorisation

The React client website uses OAuth authorisation.
The [authorisation page](../docs/admin/client/auth.md)
provides details on setting up OAuth authorisation for
the client application.

### Use

Refer to [DOCKER.md](DOCKER.md) for containerised deployment of
the client service.

## 📦 Use in Node.js Environment

The following steps are required only when building the client application
from source code. Docker images are the recommended deployment approach.

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

This error appears on the **Library** and **Digital Twins** pages and is
expected in a development environment.

To run the complete DTaaS application, refer to the localhost installation
in the [project documentation](https://into-cps-association.github.io/DTaaS/development/admin/localhost.html).
