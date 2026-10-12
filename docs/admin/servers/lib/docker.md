# Host Library Microservice

The **lib microservice** is a simplified file manager that serves files
over GraphQL and HTTP APIs. It lists directory contents and transfers
files to and from users.

This page explains how to run the library microservice as a standalone
docker container.

## Setup the File System

### Outside the DTaaS Platform

The package can be used independently of the DTaaS. In this case no
particular file structure is needed. A directory named `files`, placed
in the directory from which `compose.lib.yml` will be run, is enough.

### Inside the DTaaS Platform

DTaaS users expect the following file system structure for their
reusable assets.

![File System Layout](file-system-layout.png)

A skeleton file structure is available in the
[DTaaS codebase](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/deploy/dtaas/docker/localhost/files).
Copy it to create a file system for users. Name the directory `files`
and place it in the directory from which `compose.lib.yml` will be run.

The container runs as uid 1000 and writes into this directory, so on
Linux hosts give the directory to that user:

```bash
sudo chown -R 1000:1000 files
```

## Use

Use the [docker compose](compose.lib.yml) file to start the service.

```bash
# To bring up the container
docker compose -f compose.lib.yml up -d
# To bring down the container
docker compose -f compose.lib.yml down
```

## Service Endpoints

The GraphQL URL: `localhost:4001/lib`

The HTTP URL: `localhost:4001/lib/files`

The service API documentation is available on
[user page](../../../user/servers/lib/LIB-MS.md).
