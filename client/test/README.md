# End-to-End (E2E) Tests

The E2E tests require the Playwright test runner and an on-premise
GitLab OAuth setup.
The <https://gitlab.com> service uses CAPTCHA protection, which blocks
automated end-to-end tests.
An on-premise or third-party GitLab instance without CAPTCHA
protection is therefore required.

An active internet connection is required while these tests run because they simulate
real user interactions with a GitLab account.

Two test setups are supported.

1. Host the website on the developer computer and run tests from the developer computer.
   This is the default E2E testing scenario.
   The DTaaS client application runs at `http://localhost:4000`.
1. Host the website on the integration server and run tests from the
   integration server.
   The DTaaS client application runs at `https://foo.com`.

The following sections describe the configuration and `yarn` test commands
for both scenarios.

## Install Playwright

The E2E tests use the Playwright test runner.
If it is not installed, use the following command.

```bash
yarn playwright install --with-deps
```

## Setup Test Configuration

### OAuth Setup

Follow the instructions on the
[authorization page](../../docs/admin/client/auth.md) to configure OAuth for
the React client website.
The correct callback URL must be added to the OAuth application.
Depending on the location of the client website, register one of the
following callback URLs.

| Location of client application | URL                     |
| :----------------------------- | :---------------------- |
| Localhost                      | `http://localhost:4000` |
| External / Integration server  | `https://foo.com`       |

GitLab still runs on a remote machine.
Running both GitLab and the React client website on localhost is not supported.

### Client Configuration

Before running E2E tests, update the client configuration file at `config/test.js`.

Ensure that the configuration in `config/test.js` matches the test environment.
For example, adjust:

- `REACT_APP_URL`
- `REACT_APP_AUTH_AUTHORITY`
- `REACT_APP_REDIRECT_URI`
- `REACT_APP_LOGOUT_REDIRECT_URI`

to reflect the selected test setup.
Additional information on environment settings is available in the
[authorization](../../docs/admin/client/auth.md) and
[client configuration](../../docs/admin/client/config.md) pages.

The following example values are suitable for testing on the developer
computer (`localhost`).

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_URL: 'http://localhost:4000/',
  REACT_APP_URL_BASENAME: '',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
  REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

  REACT_APP_CLIENT_ID:
    '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
  REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
  REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
  REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/',
  REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
};
```

The corresponding values for running the DTaaS client application on an integration
server hosted at `https://foo.com` are:

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_URL: 'https://foo.com/',
  REACT_APP_URL_BASENAME: '',
  REACT_APP_URL_DTLINK: '/lab',
  REACT_APP_URL_LIBLINK: '',
  REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
  REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

  REACT_APP_CLIENT_ID:
    '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
  REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
  REACT_APP_REDIRECT_URI: 'https://foo.com/Library',
  REACT_APP_LOGOUT_REDIRECT_URI: 'https://foo.com/',
  REACT_APP_GitLab_SCOPES: 'openid profile read_user read_repository api',
};
```

### Test User Credentials

A test environment file named `test/.env` is required to store GitLab user
credentials and the DTaaS application URL.
These credentials are used by Playwright to simulate real user interactions
during E2E tests.

A template `test/.env` for running the DTaaS client application on
the developer computer (`localhost`) is shown below:

```env
REACT_APP_TEST_USERNAME=your_username
REACT_APP_TEST_PASSWORD=your_password
REACT_APP_URL='http://localhost:4000'
PRIMARY_RUNNER=your_primary_gitlab_runner_tag
SECONDARY_RUNNER=your_secondary_gitlab_runner_tag
```

Replace _your_username_ and _your_password_ with the actual username and password
for the selected on-premise GitLab account (`gitlab.foo.com`) or test account.
If you do not have a secondary gitlab runner, you can use the same one for both.
They will be the ones used in the e2e tests for executing twins and taking
measurements.

The following is an example `test/.env` for a setup where tests run on
the developer machine and the DTaaS client application runs on a remote
integration server:

```env
REACT_APP_TEST_USERNAME=TestUsername
REACT_APP_TEST_PASSWORD=TestPassword123
REACT_APP_URL='https://foo.com'
PRIMARY_RUNNER=linux
SECONDARY_RUNNER=windows
```

Here, `https://foo.com` is the application URL.
Replace _foo.com_ with the actual application URL.

## Run Tests

### Localhost

Run end-to-end tests as follows:

```bash
yarn install
yarn build
yarn config:test
yarn test:e2e
```

The `yarn test:e2e` command launches the test runner and the DTaaS client application,
then executes all end-to-end tests.
The client application is terminated at the end of end-to-end tests.

## Testing on the integration server

In this setup, the DTaaS application runs at `https://foo.com` and
the GitLab instance runs at `https://gitlab.foo.com`.
The E2E tests are executed from the developer computer.
The same codebase commit should be used on both the developer computer
and integration server.

Notes:

1. To run tests on the integration server, disable HTTPS authorization
   (if configured) on the Traefik server and make the website
   accessible without authentication by the
   [Traefik forward auth](../../docs/admin/servers/auth.md) service.
1. Tests from the developer computer to the integration server work only
   with a null basename.
   Tests fail if a basename (for example, `au`) is specified.
   This appears to be caused by interaction between the developer computer, Traefik
   gateway, and the client website hosted behind Traefik.

Run end-to-end tests as follows:

```bash
yarn install
yarn test:e2e:ext
```
