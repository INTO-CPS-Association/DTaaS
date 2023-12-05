# End-to-End (E2E) Tests

The E2E tests require a functional gitlab oauth setup, traefik gateway and a
live react client website. The E2E tests do not launch the react client website.
So it is important to launch the website using `yarn start`. Keep this server
running while performing the E2E tests with `yarn test -e` command.

The E2E tests use playwright test runner. You also need to have the software
installed. If it is not installed, you can install with the following command.

```bash
sudo npx playwright install-deps
```

## OAuth Setup

You can follow the instructions in
[authentication page](../../docs/admin/client/auth.md) to setup oauth for the
react client website. Remember to add the `http://localhost:4000` as callback URL
in the oauth application. The gitlab will still be running on a remote machine.
It is not possible to run both the gitlab and react client website on localhost.

## config/test.js file

Before running the E2E tests, you need to update the `config/test.js` file.
If you have a live DTaaS client website running, you can copy the `build/env.js`
into `config/test.js`.

Open `config/test.js` in a text editor and make sure the configuration matches
the details of your testing environment. For instance, you need to adjust:

* `REACT_APP_URL`
* `REACT_APP_AUTH_AUTHORITY`
* `REACT_APP_REDIRECT_URI`
* `REACT_APP_LOGOUT_REDIRECT_URI`

to reflect your test setup. More information on about the environment settings is
available in [authentication](../../docs/admin/client/auth.md) and
[client deployment](../../docs/admin/client/CLIENT.md) pages.

Here's an example of relevant values for variables. This example is suitable for
testing on developer computer.

```js
REACT_APP_URL="http://localhost:4000"
REACT_APP_AUTH_AUTHORITY="http://gitlab.foo.com"
REACT_APP_REDIRECT_URI="http://localhost:4000/Library"
REACT_APP_LOGOUT_REDIRECT_URI="http://localhost:4000"
```

## env file

You need to create a `test/.env` file where you will store the GitLab user
credentials. These credentials will be used by playwright to simulate real
user interactions during the E2E tests.

A template for `test/.env` is given here:

```env
REACT_APP_TEST_USERNAME=your_username
REACT_APP_TEST_PASSWORD=your_password
REACT_APP_URL='https://foo.com'
```

Replace _your_username_ and _your_password_ with the actual username and password
of your GitLab account or the testing account that you intend to use. Finally
replace _foo.com_ with the URL of your application, as you did in `env.js`.

Here's an example for test setup on the developer machine and on the
integration server:

```env
REACT_APP_TEST_USERNAME=TestUsername
REACT_APP_TEST_PASSWORD=TestPassword123
REACT_APP_URL='http://localhost:4000'
```

## Testing on localhost

There are two possible testing setups you can create.

1. Host website on the developer computer and test from developer computer
1. Host website on the integration server and test from the integration server

If you use `localhost` in the `REACT_APP_URL` the above the two mentioned setups
are essentially the same.
In order to run the tests on the integration server, you need to disable the
HTTP authentication (if setup in the first place) on the Traefik server and
let the website be accessible without any authenticaiton.

### The configuration files for the test on localhost

The `config/test.js` file is given below. The `build/env.js` also holds the
same content.

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
};
```

## test/.env - localhost

```ini
REACT_APP_TEST_USERNAME=TestUsername
REACT_APP_TEST_PASSWORD=TestPassword123
REACT_APP_URL='http://localhost:4000'
```

Please note that the username and password are the user
credentials on `gitlab.foo.com`.

## Testing on the integration server

In this test setup, the DTaaS application is running at `https://foo.com` and
the gitlab instance is running at `https://gitlab.foo.com`. The E2E test shall
be run from the developer computer. The codebase commit should be the same on
both the developer computer and integration server.

The `config/test.js` file on the developer computer is given below. The
`build/env.js` of the integration server also holds the same content.

```js
window.env = {
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_URL: 'https://foo.com/',
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
  REACT_APP_REDIRECT_URI: 'https://foo.com/Library',
  REACT_APP_LOGOUT_REDIRECT_UR: 'https://foo.com/',
  REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
};
```

## test/.env - Integration server

```ini
REACT_APP_TEST_USERNAME=TestUsername
REACT_APP_TEST_PASSWORD=TestPassword123
REACT_APP_URL='https://foo.com'
```

Please note that the username and password are the user credentials on `gitlab.foo.com`.

**NOTE:** The tests from developer computer to the integration server only
work with null basename. The test fails if a basename (say `au`) is specified.
This might be due to a complex interaction of developer computer, traefik
gateway and the client website hosted behind traefik.

## Running the Tests

Once you've properly set up your .env file, you can now run the end-to-end tests.

```bash
yarn test -e
```

This command launches the test runner and executes all end-to-end tests.
Make sure you have an active internet connection while running these tests,
as they simulate real user interactions with your GitLab account.
