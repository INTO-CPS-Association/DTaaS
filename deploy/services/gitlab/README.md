# Local GitLab Instance

The DTaaS server can have a local GitLab instance as an OAuth2 authorization
provider.

This directory contains files
needed to set up the docker container containing the local GitLab instance.

1. `./data`, `./config`, `./logs` are the directories that will contain data for
   the GitLab instance
1. `compose.gitlab.yml` and `.env` are the Docker compose and environment files
   to manage the containerized instance of gitlab

## Configure and Install

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
| DTAAS_DIR | '/Users/username/DTaaS' | Full path to the DTaaS directory. This is an absolute path with no trailing slash.                                    |
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
requires the DTaaS server to be running before you start it. You may refer to
[deployment README](../../docker/README.md) file for the same.

The commands to start and stop the instance are:

```bash
# (cd deploy/services/gitlab)
docker compose -f compose.gitlab.yml up -d
docker compose -f compose.gitlab.yml down
```

Each time you start the container, it may take a few minutes. You can monitor
the progress with `watch docker ps` and check if the gitlab container is
`healthy`.

## Post-Install Configuration

Gitlab also requires post-installation configuration. Run this command to run
bash within the container from your terminal:

```bash
docker exec -it gitlab bash
```

The configuration file to change is _/etc/gitlab/gitlab.rb_. The variables to
change are:

```rb
external_url 'https://foo.com/gitlab'
nginx['enable'] = true
nginx['redirect_http_to_https'] = false

nginx['listen_port'] = 80
nginx['listen_https'] = false
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

## Use

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
Follow the [integration guide](./INTEGRATION.md) and
[runner setup guide](../runner/GITLAB-RUNNER.md) to setup the Gitlab
integration.
