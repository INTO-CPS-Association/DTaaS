# Local GitLab Instance

This guide provides instructions for installing a dedicated local
[GitLab](https://gitlab.com) instance. This GitLab installation can be used
as an OAuth 2.0 authorization provider and DevOps backend for the DTaaS platform.

## Design

Two possible methods exist for installing GitLab alongside the DTaaS:

* At a dedicated domain name (e.g., <http:>_gitlab.foo.com_</http:>)
* At a URL path on an existing WWW server (e.g., <http:>foo.com/gitlab</http>)

The first is a two-server installation setup where GitLab and DTaaS
are installed on separate servers. An illustration of this setup is shown below.

![GitLab independent install](gitlab-independent-install.png)

🗒️ The text starting with `/` at the beginning indicates the URL route
at which a certain service is available. For example, user workspace
is available at <https://localhost/user1>.

The above figure shows integration of the DTaaS with a GitLab instance
hosted at separate hostname, for example at <https://gitlab.foo.com>.

The second installation setup involves installation of both the GitLab
and the DTaaS on the same server.
An illustration of the integrated single-server installation setup is
shown below.

![GitLab integrated install](gitlab-integrated-install.png)

This figure shows integration of GitLab instance hosted along side
the DTaaS. The integrated GitLab is hosted behind the Traefik proxy.

This guide illustrates the installation of GitLab at:
<http:>foo.com/gitlab</http>. However, the instructions and `compose.gitlab.yml`
can be adapted to install GitLab at a dedicated domain name.

## Clone Codebase

If the DTaaS git repository has not been cloned, cloning is
the first step.
If the codebase already exists, the cloning step can be skipped.
To clone:

```bash
git clone https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS/deploy/services/gitlab
```

## Configure and Install

This directory contains files
needed to set up the docker container containing the local GitLab instance.

1. `./data`, `./config`, `./logs` are the directories that will contain data for
   the GitLab instance
1. `compose.gitlab.yml` and `.env` are the Docker compose and environment files
   to manage the containerized instance of GitLab

If the DTaaS platform and GitLab are to be hosted at <https://foo.com>, then
the client config file (`deploy/config/client/env.js`)
needs to use the <https://foo.com/gitlab> as `REACT_APP_AUTH_AUTHORITY`.
In addition, this hosting at <https://foo.com> also requires changes to
config file (`.env.server`).

If the DTaaS platform and GitLab are to be hosted at <https://localhost>, then
the client config file (`deploy/config/client/env.local.js`)
needs to use the <https://localhost/gitlab> as `REACT_APP_AUTH_AUTHORITY`.
If the application and the integrated GitLab are to be hosted at
`https://localhost/gitlab`, then `.env.server` need not be modified.

Edit the `.env` file available in this directory to contain the following variables:

| Variable    | Example Value                                | Explanation                                                                                                                  |
| :---------- | :------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| DTAAS_DIR   | '/Users/username/DTaaS'                      | Full path to the DTaaS directory. This is an absolute path with no trailing slash.                                           |
| SERVER_DNS  | either `foo.com` or `localhost`              | The server DNS, if you are deploying with a dedicated server. Remember not use _http(s)_ at the beginning of the DNS string. |

**NOTE**: The DTaaS client uses the `react-oidc-context` node package, which
incorrectly causes redirects to use the `HTTPS` URL scheme. This is a
[known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
and forces us to use `HTTPS` for the DTaaS server. If you are hosting the DTaaS
locally, your GitLab instance should be available at <https://localhost/gitlab>.
If you are hosting the DTaaS at <https://foo.com>, then you GitLab instance
should be available at <https://foo.com/gitlab>.

## Run

**NOTE**: The GitLab instance operates with the `dtaas-frontend` network, which
requires the DTaaS server to be running before you start it. You may refer to secure
[installation scenarios](../overview.md) for the same.

The commands to start and stop the instance are:

```bash
# (cd deploy/services/gitlab)
docker compose -f compose.gitlab.yml up -d
docker compose -f compose.gitlab.yml down
```

Each time you start the container, it may take a few minutes. You can monitor
the progress with `watch docker ps` and check if the GitLab container is
`healthy`.

### Post-install Configuration

The administrator username for GitLab is: `root`. The password for this user
account will be available in: `config/initial_root_password`. Be sure to
save this password somewhere, as **this file will be deleted after 24 hours**
from the first time you start the local instance.

## Use

After running the container, your local GitLab instance will be available at
either at <https://foo.com/gitlab> or at <https://localhost/gitlab>.

### Create Users

The newly installed GitLab only contains `root` user. More users need
to be created for use with DTaaS. Please see the
[GitLab docs](https://docs.gitlab.com/ee/user/profile/account/create_accounts.html)
for further help.

## Pending Tasks

This document helps with installation of GitLab along side DTaaS application.
But the OAuth 2.0 integration between GitLab and DTaaS will still be pending.
Follow the [integration guide](integration.md) and the
[runner setup guide](runner.md) to setup the GitLab integration.
