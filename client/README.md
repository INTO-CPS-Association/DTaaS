# Introduction

Client (frontend) for Digital Twin as a Service (DTaaS) software. This software shall be used for providing a React single page web application for the Digital Twin support platform.

## Setup the Environment and Build

The following steps are required to setup the environment and build the application.

### Prerequisites

```bash
cd client
yarn install    #install the nodejs dependencies
yarn format     #format .ts[x] and .js[x] files with prettier.
yarn syntax     #perform linting and static analysis
yarn relay      #generate graphql relay files - run after modifying graphql schema or queries for updated type syntax
yarn build      #build the react app into build/ directory
yarn develop    #start the development server without building. Great for live edits.


#Required: Specify the environment; specify only one
yarn configapp [prod | dev] #If not specified, the app wont run.

yarn start      #start the application
yarn clean      #clean the directory of temporary files
```

It is also possible to run different types of tests using the yarn test command by passing different flags:
```bash
yarn test -a   #run all tests
yarn test -u   #run unit tests
yarn test -i   #run integration tests
yarn test -e   #run end-to-end tests
```
---

## Authentication

The react client website uses OAuth authentication. The [authentication page](../docs/admin/client/auth.md) provides details on setting up oauth authentication for the client application.

## Custom configuration

It is required to have a `env.js` in the root directory of `build` during runtime. This file is used to configure the endpoints of the application. See the [build instructions](../docs/admin/client/CLIENT.md) for an example.

### Multiple configurations

If you want to switch between multiple environments, you can use the `yarn configapp` command to copy a configuration file from `client/config/` to the `build` directory.

1. Save the file as `client/config/<config-name>.js`.
2. Run the config command to copy the file to the `public` directory and the `build` directory, if a build is present.

```bash
yarn configapp <config-name>
```

> Which ever env.js file is present in the `public` directory during `yarn build`, will be used in the build.

It is therefore reccommend to keep the configurations in the `client/config/` directory and use the `yarn configapp` command to switch between them.

## Example configuration for developers

The first step is to collect the URL of gitlab acting as oauth provider. Also collect the client application id. With that information, a configuration file can be made.

A suitable configuration file for developers is:

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_URL: 'http://localhost:4000/',
  REACT_APP_URL_BASENAME: '',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_TERMINAL: '/terminals/main',
  REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
  REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
  REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
  REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',

  REACT_APP_CLIENT_ID: '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
  REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
  REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
  REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/',
  REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
```

Here the gitlab URL is `https://gitlab.foo.com/` and the client ID is `934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0`.

If a basename is needed for the client application, then the configuration file needs to be updated with the basename. For example, with a basename of `au`,
the `build/env.js` file is given below.

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_URL: 'http://localhost:4000/',
  REACT_APP_URL_BASENAME: 'au',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_TERMINAL: '/terminals/main',
  REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
  REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
  REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
  REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',

  REACT_APP_CLIENT_ID: '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
  REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
  REACT_APP_REDIRECT_URI: 'http://localhost:4000/au/Library',
  REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/au',
  REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
```

Do remember that the oauth application on gitlab needs to have the redirect (callback) URL is correctly registered.

## Caveat

The client website relies on the background services to provide most of the functionality. These services would not be running on the developer computer. The complete application setup exists either on the integration server or as an installation instance. During development, there will be 

```txt
Unexpected Application Error!
404 Not Found
```

error on the **Library** and **Digital Twins** pages. This is expected.
