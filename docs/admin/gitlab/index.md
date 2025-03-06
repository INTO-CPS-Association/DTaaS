# Install Gitlab

This guide helps with installation of a dedicated
[Gitlab](https://gitlab.com) service. This Gitlab installation can be used
as OAuth2 authorization provider to the DTaaS software.
In addition, it is also possible to use the integrated Gitlab for
enabling the digital twin DevOps experimental features of the DTaaS.

There are two possible ways you can install Gitlab:

* At dedicated domain name (ex: <http:>_gitlab.foo.com_</http:>)
* At a URL path on existing WWW server (ex: <http:>foo.com/gitlab</http>)

This guide illustrates the installation of Gitlab at:
<http:>foo.com/gitlab</http>. But the instructions can be
adapted to install Gitlab at a dedicated domain name.

## Configure and Install

If you have not cloned the DTaaS git repository, cloning would be
the first step.
In case you already have the codebase, you can skip the cloning step.
To clone, do:

```bash
git clone https://github.com/into-cps-association/DTaaS.git
cd DTaaS/deploy/services/gitlab
```

This directory contains files
needed to set up the docker container containing the local GitLab instance.

1. `./data`, `./config`, `./logs` are the directories that will contain data for
   the GitLab instance
1. `compose.gitlab.yml` and `.env` are the Docker compose and environment files
   to manage the containerized instance of gitlab

If the DTaaS application and gitlab are to be hosted at <https://foo.com>, then
the client config file (`deploy/config/client/env.js`)
needs to use the <https://foo.com/gitlab> as `REACT_APP_AUTH_AUTHORITY`.
In addition, this hosting at <https://foo.com> also requires changes to
config file (`.env.server`).

If the DTaaS application and gitlab are to be hosted at <https://localhost>, then
the client config file (`deploy/config/client/env.local.js`)
needs to use the <https://localhost/gitlab> as `REACT_APP_AUTH_AUTHORITY`.
If the application and the integrated gitlab are to be hosted at
`https://localhost/gitlab`, then `.env.server` need not be modified.

Edit the `.env` file available in this directory to contain the following variables:

| Variable    | Example Value                                | Explanation                                                                                                                  |
| :---------- | :------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| GITLAB_HOME | '/home/Desktop/DTaaS/deploy/services/gitlab' | Full path to the DTaaS gitlab directory. This is an absolute path with no trailing slash.                                    |
| SERVER_DNS  | either `foo.com` or `localhost`                               | The server DNS, if you are deploying with a dedicated server. Remember not use _http(s)_ at the beginning of the DNS string. |

**NOTE**: The DTaaS client uses the `react-oidc-context` node package, which
incorrectly causes redirects to use the `HTTPS` URL scheme. This is a
[known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
and forces us to use `HTTPS` for the DTaaS server. If you are hosting the DTaaS
locally, your GitLab instance should be available at <https://localhost/gitlab>.
If you are hosting the DTaaS at <https://foo.com>, then you Gitlab instance
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
the progress with `watch docker ps` and check if the gitlab container is
`healthy`.

### Post-install Configuration

Gitlab also requires post-installation configuration.

!!! Information
    <!-- markdownlint-disable-file MD013 -->
    This configuration needs to be done from within the running container.

```bash
docker exec -it gitlab bash
```

The configuration file to change is _/etc/gitlab/gitlab.rb_.
The variables to change are:

```ini
external_url 'http(s)://foo.com/gitlab'
nginx['listen_port'] = 80
nginx['enable'] = true

nginx['listen_https'] = false
nginx['redirect_http_to_https'] = false
letsencrypt['enable'] = false
```

The `external_url` mentioned about indicates hosting of gitlab at
<https://foo.com/gitlab>.
If the gitlab needs to be available at <https://localhost/gitlab>, then
the `external_url` should be <https://localhost/gitlab>.

Save the changes and reconfigure gitlab by running:

```bash
# inside the gitlab docker container
gitlab-ctl reconfigure
exit
```

The administrator username for GitLab is: `root`. The password for this user
account will be available in: _/etc/gitlab/initial_root_password_. Be sure to
save this password somewhere, as **this file will be deleted after 24 hours**
from the first time you start the local instance.

After running the container, your local GitLab instance will be available at
`external_url` specified in _gitlab.rb_, i.e., either at
<https://foo.com/gitlab> or at <https://localhost/gitlab>.

### Create Users

The newly installed gitlab only contains `root` user. More users need
to be created for use with DTaaS. Please see the
[Gitlab docs](https://docs.gitlab.com/ee/user/profile/account/create_accounts.html)
for further help.

## Pending Tasks

This README helps with installation of Gitlab along side DTaaS application.
But the OAuth2 integration between Gitlab and DTaaS will still be pending.
Follow the [integration guide](integration.md) and the
[runner setup guide](runner.md) to setup the Gitlab integration.
