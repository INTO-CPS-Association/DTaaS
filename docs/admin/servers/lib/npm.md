# Host Library Microservice

The **lib microservice** is a simplified file manager that serves files
over GraphQL and HTTP API.

It has two features:

* Provide a listing of directory contents.
* Upload and download files

This document provides instructions for installing the npm package of the
library microservice and running the same as a standalone service.

## Setup the File System

### Outside the DTaaS Platform

The package can be used independently of the DTaaS. In this use case,
no specific file structure is required. Any valid file directory
is sufficient.

### Inside the DTaaS Platform

The users of the DTaaS expect the following file system structure for
their reusable assets.

![File System Layout](file-system-layout.png)

A skeleton file structure is available in the
[DTaaS codebase](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/files).
This can be copied to create a file system for users.

## :arrow_down: Install

The npm package is available in Github
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages)
and on
[npmjs](https://www.npmjs.com/package/@into-cps-association/libms).
**Prefer the package on npmjs over Github**.

Set the registry and install the package with the one of
the two following commands

### npmjs

``` bash
sudo npm install -g @into-cps-association/libms  # requires no login
```

### Github

``` bash
# requires login
sudo npm config set @into-cps-association:registry https://npm.pkg.github.com
```

The _github package registry_ asks for username and password. The username is
your Github username and the password is your Github
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
In order for the npm to download the package, your personal access token
needs to have _read:packages_ scope.

## :rocket: Use

Display help.

```bash
$libms -h
Usage: libms [options]

The lib microservice is a file server. It supports file transfer
over GraphQL and HTTP protocols.

Options:
  -c, --config <file>  provide the config file (default libms.yaml)
  -H, --http <file>    enable the HTTP server with the specified config
  -h, --help           display help for libms
```

Both the options are not mandatory.

Please see [configuration](config.md) for explanation of
configuration conventions.
The config is saved `libms.yaml` file by convention. If `-c` is not specified
The **libms** looks for
`libms.yaml` file in the working directory from which it is run.
If you want to run **libms** without explicitly specifying the configuration
file, run

```bash
$libms
```

To run **libms** with a custom config file,

```bash
$libms -c FILE-PATH
$libms --config FILE-PATH
```

If the environment file is named something other than `libms.yaml`,
for example as `libms-config.yaml`, you can run

```sh
$libms -c "config/libms-config.yaml"
```

You can press `Ctl+C` to halt the application.
If you wish to run the microservice in the background, use

```bash
$nohup libms [-c FILE-PATH] & disown
```

The lib microservice is now running and ready to serve files.

### Protocol Support

The **libms** supports GraphQL protocol by default.
This microservice can also serve files in a browser with files transferred
over HTTP protocol.

This option needs to be enabled with `-H http.json` flag.
A sample [http config](http.json) provided here can be used.

```bash
$nohup libms [-H http.json] & disown
```

The regular file upload and download options become available.

## Service Endpoints

The GraphQL URL: `localhost:PORT/lib`

The HTTP URL: `localhost:PORT/lib/files`

The service API documentation is available on
[user page](../../../user/servers/lib/LIB-MS.md).
