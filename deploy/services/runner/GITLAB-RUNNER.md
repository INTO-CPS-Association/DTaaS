# GitLab Runner Integration

This document outlines the steps needed to create a Docker container named
`gitlab-runner` which will contain a single runner that will be responsible for
the execution of Digital Twins. There are two installation scenarios:

1. __Localhost Installation__ - The integrated runner is used locally with
   a GitLab instance hosted at `https://localhost/gitlab`.
1. __Server Installation__ - The integrated runner is used with a GitLab
   instance hosted on a production server. This server may be a remote server
   and not necessarily the local machine, and may have TLS enabled with a self-signed
   certificate.

Following the steps below sets up the integrated runner which can be used to
execute digital twins from the Digital Twins Preview Page.

## Prerequisites

A GitLab Runner picks up CI/CD jobs by communicating with a GitLab instance.
For an explanation of how to set up a GitLab instance that integrates with a
DTaaS application, refer to the [GitLab instance document](../gitlab/README.md)
and the [GitLab integration guide](../gitlab/INTEGRATION.md).

The rest of this document assumes a running DTaaS application with a
GitLab instance is in place.

## Runner Scopes

A GitLab Runner can be configured for three different scopes:

| Runner Scope    | Description |
| ----------------- | ------------- |
| Instance Runner | Available to all groups and projects in a GitLab instance. |
| Group Runner    | Available to all projects and subgroups in a group. |
| Project Runner  | Associated with one specific project. |

It is recommended to create __instance runners__ as they are the most
straightforward, but any type will work. More about these three types can be
found on
[the official GitLab documentation page](https://docs.gitlab.com/ee/ci/runners/runners_scope.html).

## Obtaining A Registration Token

First, obtain the token necessary to register the runner for the GitLab
instance. Open the GitLab instance (remote or local) and depending on the
choice of runner scope, follow the steps given below:

| Runner Scope    | Steps |
| ----------------- | ------- |
| Instance Runner |1. On the __Admin__ dashboard, navigate to __CI/CD > Runners__.<br>2. Select __New instance runner__.|
| Group Runner    |1. On the __DTaaS__ group page, navigate to __Settings > CI/CD > Runners__.<br>2. Ensure the __Enable shared runners for this group__ option is enabled.<br>3. On the __DTaaS__ group page, navigate to __Build > Runners__.<br>4. Select __New group runner__.|
| Project Runner  |1. On the __DTaaS__ group page, select the project named after the GitLab username.<br>2. Navigate to __Settings > CI/CD > Runners__.<br>3. Select __New project runner__.|

For any scope chosen, the following page to create a
runner is displayed:

1. Under __Platform__, select the Linux operating system.
1. Under __Tags__, add a `linux` tag.
1. Select __Create runner__.

The following screen should then appear:

![Runner Registration Screen](./runner-registration.png)

Be sure to save the generated runner authentication token.

## Configuring the Runner

Depending on the installation scenario, the runner setup reads certain
configuration settings:

1. __Localhost Installation__ - uses `deploy/docker/.env.local`
1. __Server Installation__ - uses `deploy/docker/.env.server`

These files are integral to running the DTaaS application, so it is
assumed that they have already been configured.

The runner must be registered with the GitLab instance so that they may
communicate with each other. `deploy/services/runner/runner-config.toml`
has the following template:

```toml
[[runners]]
  name = "dtaas-runner-1"
  url = "https://foo.com/gitlab/" # Edit this
  token = "xxx" # Edit this
  executor = "docker"
  [runners.docker]
    tls_verify = false
    image = "ruby:2.7"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    volumes = ["/cache"]
    network_mode = "host" # Disable this in secure contexts
```

1. Set the `url` variable to the URL of the GitLab instance.
1. Set the `token` variable to the runner registration token obtained earlier.
1. If following the server installation scenario, remove the line
   `network_mode = "host"`.

A list of advanced configuration options is provided on the
[GitLab documentation page](https://docs.gitlab.com/runner/configuration/advanced-configuration.html).

## Start the GitLab Runner

The following commands may be used to start and stop the `gitlab-runner`
container respectively, depending on the installation scenario:

1. Localhost Installation

    ```bash
    docker compose -f deploy/services/runner/compose.runner.local.yml --env-file deploy/docker/.env.local up -d
    docker compose -f deploy/services/runner/compose.runner.local.yml --env-file deploy/docker/.env.local down
    ```

1. Server Installation

    ```bash
    docker compose -f deploy/services/runner/compose.runner.server.yml --env-file deploy/docker/.env.server up -d
    docker compose -f deploy/services/runner/compose.runner.server.yml --env-file deploy/docker/.env.server down
    ```

Once the container starts, the runner within it will run automatically. Whether
the runner is up and running can be verified by navigating to the page where
the runner was created. For example, an Instance Runner would look like this:

![Status indicator under Admin Area > Runners](./runner-activation.png)

A GitLab runner is now ready to accept jobs for the GitLab instance.

## Advanced: Runner Executor

The term `runner` could refer to one of two things:

1. The `gitlab-runner` Container
   This is the Docker container that is created when the commands
   given above are executed. It is based on the `gitlab/gitlab-runner:alpine`
   image, and is used to spawn one or more _executors_ that actually execute
   the CI/CD jobs.

   These executors are spawned using a packaged version of Docker within the
   `gitlab-runner` image.
1. The Runner Executor
   These are agents spawned by the `gitlab-runner` container, not as children
   but as __siblings__ of the container. These runner executors will not show up
   on running commands such as `docker ps`, but their status can be checked by
   running `gitlab-runner status` inside the `gitlab-runner` container.

Keeping this distinction in mind is important, as the GitLab documentation
sometimes uses them interchangeably.
