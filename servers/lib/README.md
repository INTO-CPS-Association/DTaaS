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

## Configuration setup

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

The `LOCAL_PATH` variable is the absolute filepath to the
location of the local directory which will be served to users
by the Library microservice.

The `GITLAB_URL`, `GITLAB_GROUP` and `TOKEN` are only relevant for `gitlab` mode.
The `TOKEN` should be set to your GitLab Group access API token.
For more information on how to create and use your access token,
[gitlab page](https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html).

Once you've generated a token, copy it and replace
the value of `TOKEN` with your token for the gitlab group, can be found.

Replace the default values the appropriate values for your setup.

**NOTE**:

1. When \__MODE=local_, only _LOCAL_PATH_ is used.
   Other environment variables are unused.
1. When _MODE=gitlab_, _GITLAB_URL, TOKEN_,
   and _GITLAB_GROUP_ are used; _LOCAL_PATH_ is unused.

## User Commands

```bash
yarn install    # Install dependencies for the microservice
yarn build      # build the application
yarn start      # start the application
```

If the environment file is named something other than `.env`,
the filename must be specifed with the command `-c, --config <path>`,
when starting the application. For instance,

```sh
yarn start -c ".env.development"
```

You can press `Ctl+C` to halt the application.
If you wish to run the microservice in the background, use

```bash
nohup yarn start & disown
```

## Developer Commands

```bash
yarn install    # Install dependencies for the microservice
yarn syntax     # analyzes source code for potential errors, style violations, and other issues,
yarn graph       # generate dependency graphs in the code
yarn build      # compile ES6 files into ES5 javascript files and copy them into dist/ directory
yarn test -a      # run all tests
yarn test -e      # run end-to-end tests
yarn test -i      # run integration tests
yarn test -u      # run unit tests
yarn start      # start the application
yarn start -h   # list of all the CLI commands
yarn clean      # deletes directories "build", "coverage", and "dist"
```

## :package: :ship: NPM package

Use the instructions in
[publish npm package](../../docs/developer/npm-packages.md) for help
with publishing **libms npm package**.

Application of the advice given on that page for **libms** will require
running the following commands.

### Publish

```bash
yarn install
yarn build #the dist/ directory is needed for publishing step
yarn publish --no-git-tag-version #increments version in package.json, publishes to registry
yarn publish #increments version in package.json, publishes to registry and adds a git tag
```

### Unpublish

```bash
npm unpublish  --registry http://localhost:4873/ @dtaas/libms@0.2.0
```

## Service Endpoint

The URL endpoint for this microservice is located at: `localhost:PORT/lib`

The [API](./API.md) page shows sample queries and responses.
