# Install DTaaS on localhost

The installation instructions provided in this document are
suitable for running DTaaS on localhost.
This installation is intended for single users running
DTaaS on their own computers.

## Design

An illustration of the docker containers used and the authorization
setup is shown here.

![Traefik OAuth 2.0](./localhost.png)

🗒️ The text starting with `/` at the beginning indicates the URL route
at which a certain service is available. For example, the user workspace
is available at <http://localhost/user1>.

## Requirements

The installation requirements to run this docker version of the DTaaS are:

- docker desktop / docker CE v28.
- User account on [GitLab](https://gitlab.com)

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip
    The frontend website requires authorization.
    The default authorization configuration works for <https://gitlab.com>.
    If you desire to use locally hosted GitLab instance, please see
    the [client docs](client/auth.md).
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

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip file pathnames

    1. The filepaths shown here follow POSIX convention.
       The installation procedures also work with Windows
       paths.
    1. The description below refers to filenames. All file
       paths mentioned below are relative to the top-level
       **DTaaS** directory.
<!-- markdownlint-enable MD046 -->

## Configuration

### Docker Compose

The docker compose configuration is in `deploy/docker/.env.local`;
it is a sample file.
It contains environment variables
that are used by the docker compose files.
It can be updated to suit the local installation scenario.
It contains the following environment variables.

All fields should be edited according to the specific case.

| URL Path      | Example Value           | Explanation                                                                        |
| :------------ | :---------------------- | :--------------------------------------------------------------------------------- |
| DTAAS_DIR     | '/Users/username/DTaaS' | Full path to the DTaaS directory. This is an absolute path with no trailing slash. |
| username1     | 'user1'                 | The GitLab username                                                                |

:clipboard: Important points to note:

1. The path examples given here are for Linux OS.
   These paths can also be Windows OS compatible paths.
1. The client configuration file is located at
   `deploy/config/client/env.local.js`.
   Beyond this, modification of this file is not necessary.

### Create User Workspace

The existing filesystem for installation is configured for `user1`.
A new filesystem directory must be created for the selected user.

The following commands should be executed from the top-level directory
of the DTaaS project.

```bash
cp -R files/user1 files/username
```

where _username_ is the selected username registered on
[GitLab](https://gitlab.com).

## Run

The commands to start and stop the appliation are:

```bash
docker compose -f compose.local.yml --env-file .env.local up -d
docker compose -f compose.local.yml --env-file .env.local down
```

To restart only a specific container, for example `client`

```bash
docker compose -f compose.local.yml --env-file .env.local up \
  -d --force-recreate client
```

## Use

The application will be accessible at:
<http://localhost> from a web browser.
Sign in using a [GitLab](https://gitlab.com) account.

All the functionality of DTaaS should be available
through the single page client.

## Limitations

The [library microservice](servers/lib/docker.md) is not
included in the localhost installation scenario.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[ml-workspace](https://github.com/ml-tooling/ml-workspace),
[reactjs](https://krify.co/about-reactjs/),
[GitLab](https://gitlab.com)
