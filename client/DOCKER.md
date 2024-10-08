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

Create a file `compose.client.yml` and copy the following:

```yml
services:
  client:
    image: intocps/dtaas-web:latest
    restart: unless-stopped
    volumes:
      - ./config/test.js:/dtaas/client/build/env.js
    ports:
      - "4000:4000"
```

Create a file `config/test.js` with the following contents:

```js
if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL: 'http://localhost:4000/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
    REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',

    REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/',
    REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
  };
};
```

Note that you will need a GitLab account (at https://gitlab.com) to be authorized to access the client application.

Use the following commands to run and stop the container respectively:

```bash
docker compose -f compose.client.yml up -d
docker compose -f compose.client.yml down
```

The website is available at <http://localhost:4000>.

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
