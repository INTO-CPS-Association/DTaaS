# Overview

The **lib microservice** is a simplified file manager providing graphQL API.
It has three features:

* provide a listing of directory contents.
* transfer a file to user.
* Source files can either come from local file system or from a gitlab instance.

## Gitlab setup

For this microserivce to be functional,
a certain directory or gitlab project structure is expected.
The microservice expects that the gitlab consisting of one group, DTaaS,
and within that group, all of the projects be located,
**user1**, **user2**, ... , as well as a **commons** project.
Each project corresponds to files of one user.
A sample file structure can be seen in [gitlab dtaas group](https://gitlab.com/dtaas).
You can visit the gitlab documentation on
[groups](https://docs.gitlab.com/ee/user/group/)
for help on the management of gitlab groups.

You can clone the git repositories from the `dtaas` group
to get a sample file system structure for the lib microservice.

## Configure

The microservices uses `.env` environment files to receive configuration.

In order to create this environment, you need to create a `.env` file,
wherein you create the following environment variables,
and insert with the correct-information relevant for your setup:

```env
PORT='4001'
MODE='local' or 'gitlab'
LOCAL_PATH ='/Users/<Username>/DTaaS/files'
GITLAB_GROUP ='dtaas'
GITLAB_URL='https://gitlab.com/api/graphql'
TOKEN='123-sample-token'
LOG_LEVEL='debug'
APOLLO_PATH='/lib' or ''
GRAPHQL_PLAYGROUND='false' or 'true'
```

If the environment file is named something other than `.env`,
the filename must be specifed with the command `-c, --config <path>`,
when starting the application. For instance,

```sh
yarn start -c ".env.development"
```

The `TOKEN` should be set to your GitLab Group access API token.
For more information on how to create and use your access token,
[gitlab page](https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html).

Once you've generated a token, copy it and replace
the value of `TOKEN` with your token for the gitlab group, can be found.

## Use

### Publish NPM packages

The DTaaS software is developed as a monorepo with multiple npm packages.
Since publishing to [npmjs](https://www.npmjs.com/) is
irrevocable and public, developers are encouraged to setup their own private
npm registry for local development.

A private npm registry will help with local publish and unpublish steps.

### Setup private npm registry

We recommend using [verdaccio](https://verdaccio.org) for this task.
The following commands help you create a working private npm registry
for development.

```bash
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
npm adduser --registry http://localhost:4873 #create a user on the verdaccio registry
npm set registry http://localhost:4873/
yarn config set registry "http://localhost:4873"
yarn login --registry "http://localhost:4873" #login with the credentials for yarn utility
npm login #login with the credentials for npm utility
```

You can open `http://localhost:4873` in your browser, login with
the user credentials to see the packages published.

### Publish to private npm registry

To publish a package to your local registry, do:

```bash
yarn install
yarn build #the dist/ directory is needed for publishing step
yarn publish --no-git-tag-version #increments version in package.json, publishes to registry
yarn publish #increments version in package.json, publishes to registry and adds a git tag
```

The package version in package.json gets updated as well. You can
open `http://localhost:4873` in your browser, login with the user credentials
to see the packages published. Please see
[verdaccio docs](https://verdaccio.org/docs/installation/#basic-usage)
for more information.

If there is a need to unpublish a package, ex: `@dtaas/runner@0.0.2`, do:

```bash
npm unpublish  --registry http://localhost:4873/ @dtaas/runner@0.0.2
```

To install / uninstall this utility for all users, do:

```bash
sudo npm install  --registry http://localhost:4873 -g @dtaas/runner
sudo npm list -g # should list @dtaas/runner in the packages
sudo npm remove --global @dtaas/runner
```

### :rocket: Use the packages

The packages available in private npm registry can be used like
the regular npm packages installed from [npmjs](https://www.npmjs.com/).

For example, to use `@dtaas/runner@0.0.2` package, do:

```bash
sudo npm install  --registry http://localhost:4873 -g @dtaas/runner
runner # launch the digital twin runner
```

The microservice is available at: http://localhost:PORT/lib

The [API](https://into-cps-association.github.io/DTaaS/development/user/servers/lib/LIB-MS.html) page shows sample queries and responses.

