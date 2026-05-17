# Client Application — Docker Deployment

This container image provides the client application for
Digital Twin as a Service (DTaaS).
It delivers a React single-page web application for DTaaS.

## 🔐 Authorisation

The React client website uses OAuth authorisation.
The
[authorisation page](../docs/admin/client/auth.md)
provides details on setting up OAuth authorisation for the client application.

## 🐳 Use in Docker Environment

### Create Configuration

The client application requires an `env.js` configuration file before
starting the container.
See the
[config page](../docs/admin/client/config.md)
for an explanation of client configuration.

Create `env.js` in the `client/` directory with the following contents:

```js
if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL: 'http://localhost:4000/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

    REACT_APP_CLIENT_ID:
      '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/',
    REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
  };
}
```

This default configuration works when an account is available on
<https://gitlab.com>. Modify this file as needed for
environment-specific values.

### Run

Use the following commands to start and stop the container:

```bash
docker compose up -d
docker compose down
```

The website is available at <http://localhost:4000>.

## Missing Workspace

Docker Compose in this setup starts only the client application.
This development environment does not include user workspaces or a Traefik
gateway running in the background. As a result, the following error appears.

```txt
Unexpected Application Error!
404 Not Found
```

This error appears on the **Library** and **Digital Twins** pages.
The error is expected.

To run the complete DTaaS application, see the localhost installation documentation:
[docs](https://into-cps-association.github.io/DTaaS/development/admin/localhost.html).
