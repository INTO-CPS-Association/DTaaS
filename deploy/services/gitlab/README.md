# Local GitLab Instance

The DTaaS server uses a local GitLab instance as an OAuth2 authorization
provider, hosted at `https://foo.com/gitlab`. This directory contains files
needed to set up the docker container containing the local GitLab instance.

1. `./data`, `./config`, `./logs` are the directories that will contain data for
   the GitLab instance
1. `docker-compose.yml` and `.env` are the Docker compose and environment files
   to manage the containerized instance

## Configure and Install

Ensure that the client config file (_env.js_ or _env.local.js_) and the server
config file (_compose.server.secure.yml_ or _compose.local.yml_) both use the
path prefixed gitlab instance (`https://foo.com/gitlab` or
`https://localhost/gitlab`).

Edit the `.env` file to contain the following variables:

| Variable    | Example Value                                | Explanation                                                                                                                  |
| :---------- | :------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| GITLAB_HOME | '/home/Desktop/DTaaS/deploy/services/gitlab' | Full path to the DTaaS gitlab directory. This is an absolute path with no trailing slash.                                    |
| SERVER_DNS  | 'foo.com'                                    | The server DNS, if you are deploying with a dedicated server. Remember not use _http(s)_ at the beginning of the DNS string. |

**NOTE**: The DTaaS client uses the `react-oidc-context` node package, which
incorrectly causes redirects to use the `HTTPS` URL scheme. This is a
[known issue with the package](https://github.com/authts/react-oidc-context/issues/1288),
and forces us to use `HTTPS` for the DTaaS server. If you are hosting the site
locally, your GitLab instance should be available at `https://localhost/gitlab`.

## Run

The commands to start and stop the instance are:

```bash
docker compose up -d
docker compose down
```

Each time you start the container, it may take a few minutes. You can monitor
the progress with `watch docker ps` and check if the gitlab container is
`healthy`.

**NOTE**: The GitLab instance operates with the `dtaas-frontend` network, which
requires the DTaaS server to be running before you start it. You may refer to
_deploy/docker/README.md_ file for the same.

## Post-Install Configuration

Gitlab also requires post-installation configuration. Run this command to run
bash within the container from your terminal:

```bash
docker exec -it gitlab bash
```

The configuration file to change is _/etc/gitlab/gitlab.rb_. The variables to
change are:

```rb
external_url 'http(s)://foo.com/gitlab'
nginx['listen_port'] = 80
nginx['enable'] = true

nginx['listen_https'] = false
nginx['redirect_http_to_https'] = false
letsencrypt['enable'] = false
```

Save the changes and reconfigure gitlab by running:

```bash
gitlab-ctl reconfigure
```

The administrator username for GitLab is: `root`. The password for this user
account will be available in: _/etc/gitlab/initial_root_password_. Be sure to
save this password somewhere, as **this file will be deleted after 24 hours**
from the first time you start the local instance.

## Use

After running the container, your local GitLab instance will be available at
`https://foo.com/gitlab`.
