# Host Library Microservice

The **lib microservice** is a simplified file manager that serves files
over GraphQL and HTTP APIs. It lists directory contents, and it
uploads and downloads files.

This page explains how to install the npm package of the library
microservice and run it as a standalone service.

## Setup the File System

### Outside the DTaaS Platform

The package can be used independently of the DTaaS. In this case no
particular file structure is needed; any directory will do.

### Inside the DTaaS Platform

DTaaS users expect the following file system structure for their
reusable assets.

![File System Layout](file-system-layout.png#only-light)
![File System Layout](file-system-layout-dark.png#only-dark)

A skeleton file structure is available in the
[DTaaS codebase](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/deploy/dtaas/docker/localhost/files).
Copy it to create a file system for users.

## Install

The npm package is available in GitHub
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages)
and on
[npmjs](https://www.npmjs.com/package/@into-cps-association/libms).
**Prefer the package on npmjs over GitHub**.

Install the package with one of the two following commands.

### npmjs

``` bash
sudo npm install -g @into-cps-association/libms  # requires no login
```

### GitHub

``` bash
# requires login
sudo npm config set @into-cps-association:registry https://npm.pkg.github.com
sudo npm install -g @into-cps-association/libms
```

The _github package registry_ asks for a username and password. The
username is the GitHub username and the password is a GitHub
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
with the _read:packages_ scope.

## Use

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

Neither option is mandatory.

See [configuration](config.md) for the configuration conventions.
By convention the configuration is saved in a `libms.yaml` file. If
`-c` is not given, **libms** looks for `libms.yaml` in the working
directory from which it is run. To run **libms** with that default
file, run

```bash
$libms
```

To run **libms** with a custom config file,

```bash
$libms -c FILE-PATH
$libms --config FILE-PATH
```

If the configuration file has another name, for example
`libms-config.yaml`, run

```sh
$libms -c "config/libms-config.yaml"
```

Press `Ctrl+C` to halt the application.
To run the microservice in the background, use

```bash
$nohup libms [-c FILE-PATH] & disown
```

The lib microservice is now running and ready to serve files.

### Protocol Support

**libms** supports the GraphQL protocol by default. It can also serve
files to a browser over HTTP. Enable this with the `-H http.json` flag;
the sample [http config](http.json) can be used.

```bash
$nohup libms [-H http.json] & disown
```

The usual file upload and download options then become available.

## Service Endpoints

The GraphQL URL: `localhost:PORT/lib`

The HTTP URL: `localhost:PORT/lib/files`

The service API documentation is available on
[user page](../../../user/servers/lib/LIB-MS.md).
