# Host Library Microservice

The **lib microservice** is a simplified file manager providing graphQL API. It has three features:

* provide a listing of directory contents.
* transfer a file to user.
* Source files can either come from local file system or from a gitlab instance.

The library microservice is designed to manage and serve files, functions, and models to users, allowing them to access and interact with various resources.

This document provides instructions for running a stand alone library microservice.

## Setup the File System

The users expect the following file system structure for their reusable assets.

![File System Layout](file-system-layout.png)

There is a skeleton file structure in [DTaaS codebase](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/files). You can copy and create file system for your users.

## Gitlab setup (optional)

For this microserivce to be functional, a certain directory or gitlab project structure is expected. The microservice expects that the gitlab consisting of one group, DTaaS, and within that group, all of the projects be located, **user1**, **user2**, ... , as well as a **commons** project. Each project corresponds to files of one user.
A sample file structure can be seen in [gitlab dtaas group](https://gitlab.com/dtaas). You can visit the gitlab documentation on [groups](https://docs.gitlab.com/ee/user/group/) for help on the management of gitlab groups.

You can clone the git repositories from the `dtaas` group to get a sample file system structure for the lib microservice.

## Setup Microservice

To set up the lib microservice, follow these steps:

Download the **lib-microservice.zip** from the [releases page](https://github.com/INTO-CPS-Association/DTaaS/releases).

## Configuration setup

The microservices uses `.env` environment files to receive configuration.

To set up the environment variables for the lib microservice, create a new file named _.env_ in the `lib-ms` directory. Then, add the following variables and their respective values. Below you can see and how, with included examples:

```ini
PORT='4001'
MODE='local' or 'gitlab'
LOCAL_PATH='/Users/<Username>/DTaaS/files'
GITLAB_GROUP='dtaas'
GITLAB_URL='https://gitlab.com/api/graphql'
TOKEN='123-sample-token'
LOG_LEVEL='debug'
APOLLO_PATH='/lib' or ''
GRAPHQL_PLAYGROUND='false' or 'true'
```

The `LOCAL_PATH` variable is the absolute filepath to the location of the local directory which will be served to users by the Library microservice.

The `GITLAB_URL`, `GITLAB_GROUP` and `TOKEN` are only relevant for `gitlab` mode. The `TOKEN` should be set to your GitLab Group access API token. For more information on how to create and use your access token, [gitlab page](https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html).

Once you've generated a token, copy it and replace the value of `TOKEN` with your token for the gitlab group, can be found.

Replace the default values the appropriate values for your setup.

**NOTE**:

1. When \__MODE=local_, only _LOCAL_PATH_ is used. Other environment variables are unused.
1. When _MODE=gitlab_, _GITLAB_URL, TOKEN_, and _GITLAB_GROUP_ are used; _LOCAL_PATH_ is unused.

### Start Microservice

```bash
yarn install    # Install dependencies for the microservice
yarn build      # build the application
yarn start      # start the application
```

You can press `Ctl+C` to halt the application. If you wish to run the microservice in the background, use

```bash
nohup yarn start & disown
```

The lib microservice is now running and ready to serve files, functions, and models.

Users can access the library microservice at URL: `http://localhost:<PORT>/lib`.

## Developer Commands

```bash
yarn install    # Install dependencies for the microservice
yarn syntax     # analyzes source code for potential errors, style violations, and other issues,
yarn build      # compile ES6 files into ES5 javascript files and copy all JS files into build/ directory
yarn test -a      # run all tests
yarn test -e      # run end-to-end tests
yarn test -i      # run integration tests
yarn test -u      # run unit tests
yarn start      # start the application
yarn clean      # deletes directories "build", "coverage", and "dist"
```

## Service Endpoint

The URL endpoint for this microservice is located at: `localhost:PORT/lib`

