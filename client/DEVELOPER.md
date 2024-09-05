# Introduction

This is the developer documentation for React single page web application.

## Setup the Environment and Build

The following steps are required to setup the environment and develop
the application.

### Prerequisites

```bash
cd client
yarn install    #install the nodejs dependencies
yarn format     #format .ts[x] and .js[x] files with prettier.
yarn syntax     #perform linting and static analysis
yarn graph      # generate dependency graphs in the code
yarn build      #build the react app into build/ directory
yarn develop    #start the development server without building. Great for live edits.

#Required: Choose one config for application (mandatory)
yarn config:local
yarn config:dev
yarn config:prod
yarn config:test

yarn start       #start the application
yarn clean       #clean the directory of temporary files
```

It is also possible to run different types of tests using the yarn
test commands:

```bash
#Tests require installation of devDependencies
yarn test:unit  #run unit tests
yarn test:int   #run integration tests
yarn test:e2e   #run end-to-end tests
yarn test:all   #run all tests
```

:bug: The end-to-end tests are extremely brittle.
They are not being used at present.

## Authorization

The react client website uses OAuth authorization.
The [authorization page](../docs/admin/client/auth.md)
provides details on setting up oauth authorization for
the client application.

It is sufficient to have
[user-owned oauth](https://docs.gitlab.com/ee/integration/oauth_provider.html#create-a-user-owned-application)
application. You can create this application in your gitlab account.
Do remember that the oauth application on gitlab needs to have the redirect
(callback) URL is correctly registered.

A test OAuth application has been registered on <https://gitlab.com>.
The application is available with client ID:
`1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c`.
It can be used for development purposes.
Please note that you need an account on <https://gitlab.com> in
order to use this OAuth application.

## Custom configuration

It is required to have a `env.js` in the root directory of
`build` during runtime. This file is used to configure the
endpoints of the application.
See the [config page](../docs/admin/client/config.md)
for an explanation of client configuration.

### Multiple configurations

If you want to switch between multiple environments,
you can use the `yarn config` sub-command to copy a configuration
file from `client/config/` to the `build` directory.

1. Save the file as `client/config/<config-name>.js`.
1. Run the config command to copy the file to the `public` directory
   and the `build` directory, if a build is present.

```bash
yarn config:<config-name>
```

> Which ever env.js file is present in the `public` directory during
`yarn build`, will be used in the build.

It is therefore reccommend to keep the configurations in the
`client/config/` directory and use one of the `yarn config`
sub-commands to switch between them.

## Example configuration for developers

The first step is to collect the URL of gitlab acting as oauth provider.
Also collect the client application id. With that information,
a configuration file can be made.

A suitable configuration file for developers is in `config/test.js`.:

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
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

    REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/',
    REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
  };
};
```

Here the gitlab URL is `https://gitlab.com/` and the client ID is
`1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c`.

If a basename is needed for the client application, then the configuration
file needs to be updated with the basename. For example, with a basename of
`au`, the `build/env.js` file is given below.

```js
if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL: 'http://localhost:4000/',
    REACT_APP_URL_BASENAME: 'au',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
    REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

    REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/',
    REACT_APP_REDIRECT_URI: 'http://localhost:4000/au/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/au',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
  };
};
```

### Missing Workspace

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

## Quality Check

A docker compose-based [development environment](../docker/README.md)
is available to test the DTaaS application on your local machine.

Please note that it is currently not easy to test for different
port and basename options in the docker-based development environment.

## Publish Docker Images

Each new release of client web application is published as a docker
container image. Please see [publishing](../docker/README.md) page
for more information publishing docker images.

## Gitlab Integration

The client codebase has been using Gitlab for OAuth2 only. There is
an ongoing effort to integrate Gitlab CI/CD capabilities to automate
the execution of Digital Twins. This code is in alpha stage and is
available in `src/util/gitlab*.ts`.
This code can be developed and tested using the following yarn commands.

```bash
yarn gitlab:compile
yarn gitlab:run
```
