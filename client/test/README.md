# End-to-End (E2E) Tests

The E2E tests require playwright test runner and an on-premise GitLab OAuth setup.
The <https://gitlab.com> has CAPTCHA protection blocking the end-to-end tests.
Thus on-premise or third-party Gitlab instance hosted without CAPTCHA protection
is needed.

Make sure you have an active internet connection while running these tests,
as the tests simulate real user interactions with your GitLab account.

There are two possible testing setups you can create.

1. Host website on the developer computer and test from developer computer.
   This is the default E2E testing scenario.
   The DTaaS client application will be running at `http://localhost:4000`.
1. Host website on the integration server and test from the integration server.
   The DTaaS client application will be running at `https://foo.com`.

The following sections describe configuration and yarn test commands for
both these scenarios.

## Install Playwright

The E2E tests use playwright test runner. You also need to have the software
installed. If it is not installed, you can install it with the following command.

```bash
yarn playwright install --with-deps
```

## Setup Test Configuration

### OAuth Setup

You can follow the instructions in
[authorization page](../../docs/admin/client/auth.md) to setup OAuth for
the react client website.
Remember to add the correct callback URL in the OAuth
application. Depending the location of the client website,
one of the following URLs must be registered as callback URL.

| Location of client application | URL |
| : --- | : --- |
| Localhost | `http://localhost:4000` |
| External / Integration server | `https://foo.com` |

The GitLab will still be running on a remote machine.
It is not possible to run both the GitLab and react client website on localhost.

### Client Configuration

Before running the E2E tests, you need to update
the client configuration file available at `config/test.js`.

Make sure the configuration in `config/test.js` matches
the details of your testing environment. For instance, you need to adjust:

* `REACT_APP_URL`
* `REACT_APP_AUTH_AUTHORITY`
* `REACT_APP_REDIRECT_URI`
* `REACT_APP_LOGOUT_REDIRECT_URI`

to reflect your test setup. More information on about the environment settings is
available in [authorization](../../docs/admin/client/auth.md) and
[client configuration](../../docs/admin/client/config.md) pages.

Here's an example of relevant values for variables. This example is suitable for
testing on developer computer, i.e., `localhost`.

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_URL: 'http://localhost:4000/',
  REACT_APP_URL_BASENAME: '',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
  REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
  REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
  REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
  REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
  REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

  REACT_APP_CLIENT_ID: '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
  REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
  REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
  REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/',
  REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
};
```

The matching values for the running the DTaaS client applicat on an integration
server hosted at `https://foo.com` are:

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_URL: 'https://foo.com/',
  REACT_APP_URL_BASENAME: '',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
  REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
  REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
  REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
  REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
  REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

  REACT_APP_CLIENT_ID: '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
  REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
  REACT_APP_REDIRECT_URI: 'https://foo.com/Library',
  REACT_APP_LOGOUT_REDIRECT_UR: 'https://foo.com/',
  REACT_APP_GitLab_SCOPES: 'openid profile read_user read_repository api',
};
```

### Test User Credentials

You need to create a test environment file named `test/.env`
in which you will store the GitLab user credentials and
the DTaaS application URL for the website. The credentials will be
used by playwright to simulate real user interactions during the E2E tests.

A template for `test/.env` for running the DTaaS client application
on the developer computer, i.e., `localhost` is given here:

```env
REACT_APP_TEST_USERNAME=your_username
REACT_APP_TEST_PASSWORD=your_password
REACT_APP_URL='http://localhost:4000'
```

Replace _your_username_ and _your_password_ with the actual username and password
of your on-premise GitLab account (`gitlab.foo.com`) or the testing account that
you intend to use.

Here's an example `test/.env` for test setup on the developer machine and
and the DTaaS client application running on a remote integration server:

```env
REACT_APP_TEST_USERNAME=TestUsername
REACT_APP_TEST_PASSWORD=TestPassword123
REACT_APP_URL='https://foo.com'
```

Here `https://foo.com` is the URL of the application.
Remember to replace _foo.com_ with the URL of your application.

## Run Tests

### Localhost

You can run the end-to-end tests as follows:

```bash
yarn install
yarn build
yarn config:test
yarn test:e2e
```

The `yarn test:e2e` command launches the test runner, the DTaaS client application
and execute all end-to-end tests.
The client application is terminated at the end of end-to-end tests.

## Testing on the integration server

In this test setup, the DTaaS application is running at `https://foo.com` and
the GitLab instance is running at `https://gitlab.foo.com`. The E2E test shall
be run from the developer computer. The codebase commit should be the same on
both the developer computer and integration server.

Points to note:

1. In order to run the tests on the integration server, you need to disable the
   HTTPS authorization (if setup in the first place) on the Traefik server and
   let the website be accessible without any authenticaiton done by
   [Traefik forward auth](../../docs/admin/servers/auth.md) service.
1. The tests from developer computer to the integration server only
   work with null basename. The tests fail if a basename (say `au`) is specified.
   This might be due to a complex interaction of developer computer, traefik
   gateway and the client website hosted behind traefik.

You can run the end-to-end tests as follows:

```bash
yarn install
yarn test:e2e:ext
```
