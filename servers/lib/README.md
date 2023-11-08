# Overview

The **lib microservice** is a simplified file manager providing graphQL API.
It has three features:

* provide a listing of directory contents.
* transfer a file to user.
* Source files can either come from local file system or from a gitlab instance.

## Gitlab setup

For this microserivce to be functional,
a certain directory or gitlab project structure is expected.
The microservice expects that the gitlab consisting of one group, dtaas (by convention),
and within that group, all of the projects be located,
**user1**, **user2**, ... , as well as a **commons** projects.
Each project corresponds to files of one user.
A sample file structure can be seen in [gitlab dtaas group](https://gitlab.com/dtaas).
You can visit the gitlab documentation on
[groups](https://docs.gitlab.com/ee/user/group/)
for help on the management of gitlab groups.

You can clone the git repositories from the [gitlab dtaas](https://gitlab.com/dtaas) group
to get a sample file system structure for the lib microservice.

## :arrow_down: Install

The package is available in github packages registry.
You can install the package using

```bash
sudo npm install -g @into-cps-association/libms --registry=https://npm.pkg.github.com/
```

## :gear: Configure

The microservices requires config specified in INI format. The template configuration file is:

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

The `TOKEN` should be set to your GitLab Group access API token.
For more information on how to create and use your access token,
[gitlab page](https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html).

Once you've generated a token, copy it and replace
the value of `TOKEN` with your token for the gitlab group,

You can adjust other config values as per your local setup.

This config is saved `.env` file by convention. The __libms__ looks for `.env` file in the working directory from which it is run.

If the environment file is named something other than `.env`,
the filename must be explicitly provided to __libms__ at the execution time.

## :rocket: Use

Display help.

```bash
libms -h
```

Run __libms__ with `.env` existing in the launch directory.

```bash
libms
```

Run __libms__ with a custom config file.

```bash
libms -c FILE-PATH
libms --config FILE-PATH
```

The microservice is available at: http://localhost:PORT/lib

The [API](https://into-cps-association.github.io/DTaaS/development/user/servers/lib/LIB-MS.html) page shows sample queries and responses.
