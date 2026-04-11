# Install DTaaS on localhost (GUI)

The installation instructions provided in this document are
ideal for running the DTaaS on localhost via a Graphical User
Interface (GUI).
This installation is ideal for single users intending to use
DTaaS on their own computers.

## Design

An illustration of the docker containers used and the authorization
setup is shown here.

![Traefik OAuth 2.0](localhost.png)

## Requirements

The installation requirements to run this docker version of the DTaaS are:

- docker desktop / docker CLI with compose plugin
- no external GitLab account is required for default localhost auth

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    The frontend website requires authorization.
    The default authorization configuration works for _gitlab.com_.
    If you desire to use locally hosted gitlab instance, please see
    the [client docs](../client/auth.md).
<!-- markdownlint-enable MD046 -->

## Clone Codebase

If the DTaaS git repository has not been cloned, cloning is
the first step.
If the codebase already exists, the cloning step can be skipped.
To clone:

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS
```

In this guide we will assume the contents of the zip file have been extracted
to the directory: `/Users/username/DTaaS`.

!!! tip
    The path given here is for Linux OS.
       It can be Windows compatible as well, for example: `C:\\DTaaS`. Make
       sure to use this path and format in place of `/Users/username/DTaaS` in this
       guide.

## Starting Portainer

The GUI used to run the application and docker containers will be provided by
[Portainer Community Edition](https://portainer.io). It is itself a Docker
container that will create a website at `https://localhost:9443`, which will
present a graphical interface for starting and stopping the application.

You may follow
[the official documentation for setting up a Portainer CE Server](https://docs.portainer.io/start/install-ce/server/docker)
. Alternatively, open a terminal on your system (Terminal on Linux / MacOS,
Powershell on Windows, etc) and copy the following commands into it:

```bash
docker volume create portainer_data
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce:2.21.4
```

This will start the Portainer server on your system, which will host its
dashboard at `https://localhost:9443`. Follow the
[Initial Setup Guide](https://docs.portainer.io/start/install-ce/server/setup)
to set up an administrator account for Portainer on your system.

Portainer should now be set up on your system, and you can access the dashboard:

![Portainer Admin Dashboard](./portainer_dashboard.png)

!!! tip
    The next time you wish to start the Portainer server, run
       `docker start portainer`.

## Configuration

### Create User Workspace

The existing filesystem for installation is setup for `user1`.
A new filesystem directory needs to be created for the selected user.

You may use your file explorer or an equivalent application to duplicate the
`files/user1` directory and rename it as `files/username` where _username_ is
the selected username registered on <https://gitlab.com>.

ALternatively, you may execute the following commands from the top-level
directory of the DTaaS.

```bash
cp -R files/user1 files/username
```

### Creating the Portainer Stack

![Portainer Stacks](./portainer_stacks.png)

Portainer Stacks are equivalent to using `docker compose` commands to manage
containers.

1. Navigate to the _Stacks_ tab on the side panel, and click on the
    _Add Stack_ button.
1. Name the Stack anything descriptive, for example: `dtaas-localhost`.
1. Select the _Upload_ build method.
1. Upload the compose file located at
    `deploy/workspace/dex/localhost/docker-compose.yml`.
1. Select the option to load variables from a .env file, and upload the file
    `deploy/workspace/dex/localhost/.env`.

!!! tip
    Sometimes the `.env` file does not show up in the file explorer. You
    may fix this by selecting the option to show _All Files_ rather than those
    with the extension _.env_.

![Portainer ENV Editor](./portainer_env.PNG)

The `.env` file contains environment variables that are used by the
compose file. Portainer allows you to modify them as shown in the screenshot
above, here is a summary:

<!-- markdownlint-disable MD060 -->
| Variable             | Example | Explanation                                   |
| :------------------- | :------ | :-------------------------------------------- |
| COMPOSE_PROJECT_NAME | dtaas   | Docker project name used by compose.          |
| DEFAULT_USER         | user    | Default user login profile for local Dex auth. |
<!-- markdownlint-enable MD060 -->

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    Important points to note:

    1. The path examples given here are for Linux OS.
       These paths can be Windows OS compatible paths as well.
    1. You can customize local login users in
       `deploy/workspace/dex/localhost/config/dex-config.yaml`.
<!-- markdownlint-enable MD046 -->

Once you have configured the environment variables, click on the button
_Deploy the stack_.

## Use

The application will be accessible at:
<http://localhost> from web browser.
Sign in using the local Dex credentials configured in
`deploy/workspace/dex/localhost/config/dex-config.yaml`.

All the functionality of DTaaS should be available to you
through the single page client now.

## Limitations

The [library microservice](../servers/lib/docker.md) is not
included in the localhost installation scenario.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[reactjs](https://krify.co/about-reactjs/),
[gitlab](https://gitlab.com)
