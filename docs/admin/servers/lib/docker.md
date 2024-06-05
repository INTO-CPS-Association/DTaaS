# Host Library Microservice

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! failure
    update the page
<!-- markdownlint-enable MD046 -->

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! warning
    The default setting in docker compose file exposes
    all user files at <http://foo.com/lib/files>.
    The `compose.server.yml` file needs to updated to
    expose another directory like common assets directory.
<!-- markdownlint-enable MD046 -->

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

## :rocket: Use

## Service Endpoint

The URL endpoint for this microservice is located at: `localhost:PORT/lib`

The service API documentation is available on
[user page](../../../user/servers/lib/LIB-MS.md).
