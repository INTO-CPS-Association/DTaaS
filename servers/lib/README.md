# Overview

The **lib microservice** is a simplified file manager providing graphQL API.
It has two features:

* provide a listing of directory contents.
* transfer a file to user.

## :arrow_down: Install

The package is available in Github
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages).

Set the registry and install the package with the following commands

```bash
sudo npm config set @into-cps-association:registry https://npm.pkg.github.com
sudo npm install -g @into-cps-association/libms
```

The _npm install_ command asks for username and password. The username is
your Github username and the password is your Github
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
In order for the npm to download the package, your personal access token
needs to have _read:packages_ scope.

## :gear: Configure

The microservices requires config specified in INI format.
The template configuration file is:

```ini
PORT='4001'
MODE='local' or 'gitlab'
LOCAL_PATH ='/Users/<Username>/DTaaS/files'
LOG_LEVEL='debug'
APOLLO_PATH='/lib' or ''
GRAPHQL_PLAYGROUND='false' or 'true'
```

The `LOCAL_PATH` variable is the absolute filepath to the
location of the local directory which will be served to users
by the Library microservice. This
[sample configuration file](./config/.env.default) can be used.

Replace the default values the appropriate values for your setup.

## :rocket: Use

Display help.

```bash
$libms -h
Usage: libms [options]

The lib microservice is a file server. It supports file transfer
over GraphQL and HTTP protocols.

Options:
  -c, --config <file>  provide the config file (default .env)
  -H, --http <file>    enable the HTTP server with the specified config
  -h, --help           display help for libms
```

Both the options are not mandatory.

### Configuration file

The config is saved `.env` file by convention. If `-c` is not specified
The **libms** looks for
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
for example as `config/.env.default`, you can run

```sh
libms -c "config/.env.default"
```

You can press `Ctl+C` to halt the application.

### Protocol Support

The **libms** supports GraphQL protocol by default.
It is possible to enable the HTTP protocol by setting
the `-H` option.

To run **libms** with a custom config for HTTP protocol, use

```bash
libms -H FILE-PATH
libms --http FILE-PATH
```

A sample configuration is [available](./config/http.json).

### Accessible URLs

The microservice is available at: 

**GraphQL protocol**: 'localhost:PORT/lib'
**HTTP protocol**: 'localhost:PORT/lib/files'

<!-- markdownlint-disable-next-line MD013 -->
The [API](https://into-cps-association.github.io/DTaaS/development/user/servers/lib/LIB-MS.html) page shows sample queries and responses.
