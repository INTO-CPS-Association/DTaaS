# Introduction

Client (frontend) for Digital Twin as a Service (DTaaS) software.
This software shall be used for providing a React single page web
application for the Digital Twin support platform.

## Authorization

The react client website uses OAuth authorization.
The [authorization page](../docs/admin/client/auth.md)
provides details on setting up oauth authorization for
the client application.

## Use in Docker Environment

### Adjust Configuration (Optional)

The client application requires configuration.
See the [config page](../docs/admin/client/config.md)
for an explanation of client configuration.

The docker version of client application uses configuration
file available in `config/test.js`. This default configuration
works well if you have an account on <https://gitlab.com>.
If you would like to adjust the configuration, please change this file.

### Use

The commands to start and stop the appliation are:

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd client
docker compose -f compose.client.yml up -d
```

This command brings up the client docker container and makes
the website available at <http://localhost:4000>.
The `config/test.js` file is used as client configuration.
If you wish to adjust the client configuration, please change
configuration values in this file and restart the container.

```bash
docker compose -f compose.client.yml down
docker compose -f compose.client.yml up -d
```

## Use in Nodejs Environment

The following steps are needed only if you are interested
in building the client application from source code.
The use of docker images is highly recommended.

### Build

The following steps are required to build the client web application.

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd client
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

## Gitlab Runner configuration

To properly use the Digital Twins page preview, you need to configure at least
one project runner in your GitLab profile. Follow the steps below:

1. Login to the GitLab profile that will be used as the OAuth provider.

1. Navigate to the *DTaaS* group and select the project named after your
   GitLab username.

1. In the project menu, go to Settings and select CI/CD.

1. Expand the **Runners** section and click on *New project runner*. Follow the
   configuration instructions carefully:
   - Add **linux** as a tag during configuration.
   - Click on *Create runner*.
   - Ensure GitLab Runner is installed before proceeding. Depending on your
     environment, you will be shown the correct command to install GitLab Runner.
   - Once GitLab Runner is installed, follow these steps to register the runner:
     - Copy and paste the command shown in the GitLab interface into your command
       line to register the runner. It includes a URL and a token for your specific
       GitLab instance.
     - Choose *docker* as executor when prompted by the command line.
     - Choose the default docker image. You must use an image based on Linux,
       like the default one (*ruby:2.7*).

You can manually verify that the runner is available to pick up jobs by running
the following command:

```bash
sudo gitlab-runner run
```

It can also be used to reactivate offline runners during subsequent sessions.