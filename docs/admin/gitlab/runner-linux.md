# GitLab Runner Integration

For Windows hosts, see [runner-windows.md](runner-windows.md).

This page creates a `gitlab-runner` that executes digital twins.
You can install several such runners and link them to the integrated
GitLab.

The diagram shows the intended installation.

![GitLab Runner Integration](gitlab-integrated-runner.png#only-light)
![GitLab Runner Integration](gitlab-integrated-runner-dark.png#only-dark)

A path such as `/user1` is the URL route of that service, for example
`https://intocps.org/user1`.
The thick arrow is the forward-auth check: Traefik asks
traefik-forward-auth to authorise each request before it routes it.

There are two installation scenarios:

1. __Localhost Installation__: the integrated runner runs locally with
   a GitLab instance hosted at `https://localhost/gitlab`.
1. __Server Installation__: the integrated runner works with a GitLab
   instance on a production server. That server may be a remote machine
   rather than the host, and may use TLS with a self-signed certificate.

In a server installation, GitLab can run on a second server, and the
runners on further remote servers, as the diagram shows.

![GitLab and runners on separate servers](gitlab-runner-two-servers.png#only-light)
![GitLab and runners on separate servers](gitlab-runner-two-servers-dark.png#only-dark)

The steps below set up an integrated runner that can execute digital
twins from the Digital Twins Preview Page.

## Prerequisites

A GitLab Runner picks up CI/CD jobs by communicating with a GitLab instance.
To set up a GitLab instance that integrates with a DTaaS platform, see
[the GitLab instance document](index.md)
and [the GitLab integration guide](integration.md).

The rest of this page assumes a running DTaaS platform with a GitLab
instance.

## Runner Scopes

A GitLab Runner can have one of three scopes:

| Runner Scope      | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| Instance Runner   | Available to all groups and projects in a GitLab instance. |
| Group Runner      | Available to all projects and subgroups in a group.        |
| Project Runner    | Associated with one specific project.                      |

__Instance runners__ are the simplest to set up and are recommended, but
any type works. The
[official GitLab documentation](https://docs.gitlab.com/ee/ci/runners/runners_scope.html)
describes the three types.

## Obtaining A Registration Token

First, obtain the token that registers the runner with the GitLab
instance. Open the GitLab instance (remote or local) and follow the
steps for the chosen runner scope:

| Runner Scope      | Steps                                                                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instance Runner   | 1. On the __Admin__ dashboard, navigate to __CI/CD > Runners__.<br>2. Select __New instance runner__.                                                                                                                                                           |
| Group Runner      | 1. On the __DTaaS__ group page, navigate to __Settings > CI/CD > Runners__.<br>2. Ensure the __Enable shared runners for this group__ option is enabled.<br>3. On the __DTaaS__ group page, navigate to __Build > Runners__.<br>4. Select __New group runner__. |
| Project Runner    | 1. On the __DTaaS__ group page, select the project named after the GitLab username.<br>2. Navigate to __Settings > CI/CD > Runners__.<br>3. Select __New project runner__.                                                                                      |

Each scope then shows a page for creating the runner:

1. Under __Platform__, select the Linux operating system.
1. Under __Tags__, add a `linux` tag.
1. Select __Create runner__.

The following screen appears:

![Runner Registration Screen](./runner-registration.png)

Save the generated runner authentication token.

## Configuring the Runner

The runner compose files are in `deploy/services/runner`:

| Scenario  | Compose file                | Variables it reads        |
| :-------- | :-------------------------- | :------------------------ |
| Localhost | `compose.runner.local.yml`  | `DTAAS_DIR`               |
| Server    | `compose.runner.server.yml` | `DTAAS_DIR`, `SERVER_DNS` |

Both files mount the TLS certificate of the GitLab host from
`${DTAAS_DIR}/deploy/docker/certs/...`. That directory no longer exists
in the repository, so edit the certificate volume in the compose file to
point to the certificate in use, for example
`deploy/dtaas/docker/secure-server_with_integrated-gitlab/certs/fullchain.pem`
for the integrated package. In the server scenario, remove the
certificate volume if GitLab does not use a self-signed certificate.

The runner must be registered with the GitLab instance before the two
can communicate. `deploy/services/runner/runner-config.toml` contains
this template:

```toml
concurrent = 20

[[runners]]
  name = "dtaas-runner-1"
  description = "dtaas-runner-1"
  url = "https://intocps.org/gitlab/" # Edit this
  token = "xxx" # Edit this
  executor = "docker"
  request_concurrency = 10
  [runners.docker]
    tls_verify = false
    image = "ruby:2.7"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    volumes = ["/cache"]
    network_mode = "host" # Disable this in secure contexts
```

1. Set `url` to the URL of the GitLab instance.
1. Set `token` to the runner authentication token obtained earlier.
1. In the server installation scenario, remove the line
   `network_mode = "host"`.

The
[GitLab documentation](https://docs.gitlab.com/runner/configuration/advanced-configuration.html)
lists the advanced configuration options.

## Start the GitLab Runner

Run these commands from the DTaaS repository directory. Each pair starts
and then stops the `gitlab-runner` container.

1. Localhost Installation

    ```bash
    export DTAAS_DIR=$(pwd)
    docker compose -f deploy/services/runner/compose.runner.local.yml up -d
    docker compose -f deploy/services/runner/compose.runner.local.yml down
    ```

1. Server Installation

    ```bash
    export DTAAS_DIR=$(pwd)
    export SERVER_DNS=intocps.org
    docker compose -f deploy/services/runner/compose.runner.server.yml up -d
    docker compose -f deploy/services/runner/compose.runner.server.yml down
    ```

The runner inside the container starts automatically. To check that it
works, open the page where the runner was created. An Instance Runner,
for example, looks like this:

![Status indicator under Admin Area > Runners](./runner-activation.png)

The GitLab runner is now ready to accept jobs from the GitLab instance.

## Pipeline Trigger Token

The Digital Twins Preview Page uses the GitLab API, which requires a
[Pipeline Trigger Token](https://docs.gitlab.com/ee/api/pipeline_triggers.html).
Open the project in the __DTaaS__ group and navigate to
__Settings > CI/CD > Pipeline trigger tokens__. Add a new token with any
description.

![Creating a Pipeline Trigger Token](./pipeline-token.PNG)

The Digital Twins Preview Page can now manage and execute digital twins.
