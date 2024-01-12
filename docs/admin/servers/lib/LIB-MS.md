# Host Library Microservice

The **lib microservice** is a simplified file manager providing graphQL API.
It has three features:

* provide a listing of directory contents.
* transfer a file to user.
* Source files can either come from local file system or from
  a gitlab instance.

The library microservice is designed to manage and serve files,
functions, and models to users, allowing them to access and interact
with various resources.

This document provides instructions for running a stand alone library microservice.

## Setup the File System

The users expect the following file system structure for their reusable assets.

![File System Layout](file-system-layout.png)

There is a skeleton file structure in
[DTaaS codebase](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/files).
You can copy and create file system for your users.

## Gitlab setup (optional)

For this microserivce to be functional,
a certain directory or gitlab project structure is expected.
The microservice expects that the gitlab consisting of one group,
DTaaS, and within that group, all of the projects be located,
**user1**, **user2**, ... , as well as a **commons** project.
Each project corresponds to files of one user.
A sample file structure can be seen in [gitlab dtaas group](https://gitlab.com/dtaas).
You can visit the gitlab documentation on [groups](https://docs.gitlab.com/ee/user/group/)
for help on the management of gitlab groups.

You can clone the git repositories from the `dtaas` group
to get a sample file system structure for the lib microservice.

## :arrow_down: Install

The package is available in Github
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages).

Set the registry and install the package with the one of
the two following commands

```bash
sudo npm install -g @into-cps-association/libms  # requires no login
sudo npm config set @into-cps-association:registry https://npm.pkg.github.com
```

The _github package registry_ asks for username and password. The username is
your Github username and the password is your Github
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
In order for the npm to download the package, your personal access token
needs to have _read:packages_ scope.

## :gear: Configure

The microservices requires config specified in INI format.
The template configuration file is:

```ini
PORT='4001'
MODE='local'
LOCAL_PATH='/Users/<Username>/DTaaS/files'
LOG_LEVEL='debug'
APOLLO_PATH='/lib' or ''
GRAPHQL_PLAYGROUND='false' or 'true'
```

The `LOCAL_PATH` variable is the absolute filepath to the
location of the local directory which will be served to users
by the Library microservice.

Replace the default values the appropriate values for your setup.

## :rocket: Use

Display help.

```bash
libms -h
```

The config is saved `.env` file by convention. The **libms** looks for
`.env` file in the working directory from which it is run.
If you want to run **libms** without explicitly specifying the configuration
file, run

```bash
libms
```

To run **libms** with a custom config file,

```bash
libms -c FILE-PATH
libms --config FILE-PATH
```

If the environment file is named something other than `.env`,
for example as `.env.development`, you can run

```sh
libms -c ".env.development"
```

You can press `Ctl+C` to halt the application.
If you wish to run the microservice in the background, use

```bash
nohup libms [-c FILE-PATH] & disown
```

The lib microservice is now running and ready to serve files, functions, and models.

## Service Endpoint

The URL endpoint for this microservice is located at: `localhost:PORT/lib`

The service API documentation is available on
[user page](../../../user/servers/lib/LIB-MS.md).
