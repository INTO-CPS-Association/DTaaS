# Install DTaaS on localhost

The installation instructions provided in this README are
ideal for running the DTaaS on both localhost.
This installation is ideal for single users intending to use
DTaaS on their own computers.

## Design

An illustration of the docker containers used and the authorization
setup is shown here.

![Traefik OAuth](./localhost.png)

## Requirements

The installation requirements to run this docker version of the DTaaS are:

- docker desktop / docker CLI with compose plugin
- User account on _gitlab.com_

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    The frontend website requires authorization.
    The default authorization configuration works for _gitlab.com_.
    If you desire to use locally hosted gitlab instance, please see
    the [client docs](client/auth.md).
<!-- markdownlint-enable MD046 -->

## Clone Codebase

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS
```

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip file pathnames

    1. The filepaths shown here follow POSIX convention.
       The installation procedures also work with Windows
       paths.
    1. The description below refers to filenames. All the file
       paths mentioned below are relatively to the top-level
       **DTaaS** directory.
<!-- markdownlint-enable MD046 -->

## Configuration

### Docker Compose

The docker compose configuration is in `deploy/docker/.env.local`;
it is a sample file.
It contains environment variables
that are used by the docker compose files.
It can be updated to suit your local installation scenario.
It contains the following environment variables.

Edit all the fields according to your specific case.

  | URL Path | Example Value | Explanation |
  |:------------|:---------------|:---------------|
  | DTAAS_DIR | '/home/Desktop/DTaaS' | Full path to the DTaaS directory. This is an absolute path with no trailing slash. |
  | username1 | 'user1' | Your gitlab username |

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    Important points to note:

    1. The path examples given here are for Linux OS.
       These paths can be Windows OS compatible paths as well.
    1. The client configuration file is located at `deploy/config/client/env.local.js`.
       If you are following the guide to use HTTPS on localhost, edit the URLs in this file by replacing `http` with `https`.
       Beyond this, it is not necessary to modify this file.
<!-- markdownlint-enable MD046 -->

### Create User Workspace

The existing filesystem for installation is setup for `user1`.
A new filesystem directory needs to be created for the selected user.

Please execute the following commands from the top-level directory
of the DTaaS project.

```bash
cp -R files/user1 files/username
```

where _username_ is the selected username registered on <https://gitlab.com>.

## Run

The commands to start and stop the appliation are:

```bash
docker compose -f compose.local.yml --env-file .env.local up -d
docker compose -f compose.local.yml --env-file .env.local down
```

To restart only a specific container, for example `client``

```bash
docker compose -f compose.local.yml --env-file .env.local up -d --force-recreate client
```

## Use

The application will be accessible at:
<http://localhost> from web browser.
Sign in using your <https://gitlab.com> account.

All the functionality of DTaaS should be available to you
through the single page client now.

## Limitations

The [library microservice](servers/lib/docker.md) is not
included in the localhost installation scenario.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[ml-workspace](https://github.com/ml-tooling/ml-workspace),
[reactjs](https://krify.co/about-reactjs/),
[gitlab](https://gitlab.com)
