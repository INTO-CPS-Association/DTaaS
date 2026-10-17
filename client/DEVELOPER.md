# Client Application — Developer Notes

This document provides developer guidance for the React single-page
web application.

## Setup and Build

A ready-made container with Node, yarn and the rest of the toolchain
is available; see
[developer/devenv/README.md](../developer/devenv/README.md). It saves
installing these on your host.

The following steps are required to configure the environment and build the application.

### Prerequisites

```bash
cd client
yarn install    #install the nodejs dependencies
yarn format     #format .ts, .tsx, .css and .scss files with prettier
yarn syntax     #perform linting and static analysis
yarn typecheck  #run TypeScript type checking without building
yarn graph      # generate dependency graphs in the code
yarn prep       #format, lint, fix quality checks, and run all tests

yarn build      #typecheck and build the React app into build/ with source maps
yarn build:fast #typecheck and build the React app without source maps

yarn analyze    #shows the source map to help identify under utilized packages

#Required: Choose one config for application (mandatory)
yarn config:local
yarn config:dev
yarn config:prod
yarn config:test

# develop commands require a configuration
yarn config:dev
yarn develop    #start the Vite development server without
                #  building. Great for live edits.

yarn start       #preview the production build in the foreground
yarn stop        #stop the application if running in the background

yarn clean       #clean the directory of temporary files but keep node_modules
yarn clean:all   #clean the directory of temporary files and node_modules
```

Different test suites can be executed with the following `yarn` commands:

```bash
#Tests require installation of devDependencies
yarn test:unit  #run unit tests
yarn test:int   #run integration tests
yarn test:coverage:int-unit #combine coverage from unit and integration tests

yarn test:e2e   #run end-to-end tests by launching application on localhost
yarn test:e2e:ext  #run end-to-end tests against application
                   #  running on external server
yarn test:all   #run all tests
```

## Authorisation

The React client website uses OAuth authorisation.
The
[authorisation page](../docs/admin/client/auth.md) provides details for configuring
OAuth authorisation for the client application.

A
[user-owned OAuth application](https://docs.gitlab.com/ee/integration/oauth_provider.html#create-a-user-owned-application)
is sufficient and can be created in a GitLab account.
Ensure that the OAuth application's redirect (callback) URL is registered correctly.

A test OAuth application is registered on <https://gitlab.com>.
The application uses client ID:
`1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c`.
It can be used for development purposes.
A <https://gitlab.com> account is required to use this OAuth application.

## Custom Configuration

An `env.js` file is required in the root directory of `build` during runtime.
This file configures the application endpoints.
See the [config page](../docs/admin/client/config.md) for an explanation of
client configuration.

### Multiple configurations

To switch between multiple environments, use the `yarn config` sub-command to copy
a configuration file from `client/config/` to the `build` directory.

1. Save the file as `client/config/<config-name>.js`.
1. Run the config command to copy the file to the `public` directory
   and the `build` directory, if a build is present.

```bash
yarn config:<config-name>
```

> The `env.js` file present in the `public` directory at the time of
> `yarn build` is used in the build.

It is therefore recommended to keep configurations in the
`client/config/` directory and use one of the `yarn config`
sub-commands to switch between them.

The purpose of different configuration files are given in the table below.

| Configuration File Name | Usage Scenario                                                                                                                                                        |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev.js`                | Check functionality of the client application without using any other parts of the DTaaS software                                                                     |
| `local.js`              | Used with `yarn config:local`, or mounted as `env.js` into the `intocps/dtaas-web` container, to test the client on localhost (see `docs/developer/contributions/docker.md`) |
| `prod.js`               | Used for running the client application on a production server. This file is kept here for reference. Installations use the `config/client.js` of each package in `deploy/dtaas/docker/`, created from `client.js.example`. |
| `test.js`               | Used by all the tests                                                                                                                                                 |

## Example configuration for developers

Collect the GitLab OAuth provider URL and client application ID to create
a configuration file.

An example configuration for developers is available in `config/test.js`:

```js
if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL: 'http://localhost:4000/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',

    REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com',
    REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
    LOGGER_URL: 'http://localhost:4003/logger', // NOSONAR
  };
}
```

In this example, the GitLab URL is `https://gitlab.com` and the client ID is
`1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c`.

If a basename is required for the client application, the configuration file
must be updated accordingly. For example, with a basename of `au`, the
`build/env.js` file is shown below.

```js
if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL: 'http://localhost:4000/',
    REACT_APP_URL_BASENAME: 'au',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',

    REACT_APP_CLIENT_ID:
      '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com',
    REACT_APP_REDIRECT_URI: 'http://localhost:4000/au/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/au',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
    LOGGER_URL: 'http://localhost:4003/logger', // NOSONAR
  };
}
```

### Missing Workspace

The development environment does not include user workspaces or a Traefik
gateway running in the background. As a result, iframe links pointing to
user workspaces do not resolve correctly and the application's not-found
page is displayed with the following heading.

```txt
This Page Does Not Exist
```

The page also shows the unmatched path, so you can see which workspace
address the gateway failed to route.

This error appears on the **Library** and **Digital Twins** pages.
This error is expected.

## Quality Check

A docker compose-based [development environment](../developer/check/README.md)
is available to test the DTaaS application on a local machine.

Testing different port and basename options is currently difficult in the
Docker-based development environment.

## Publish Docker Images

Each new release of the client web application is published as a Docker
container image. See the [publishing](../developer/check/README.md) page for
information about publishing Docker images.
