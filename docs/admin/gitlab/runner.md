# Gitlab Runner Integration

To properly use the __Digital Twins__ page preview, you need to
configure at least one project runner in your GitLab profile.
The first step is to configure the CI/CD pipeline in gitlab project.
The second step is to install the runner and integrate it
with the selected gitlab project.

## Configure Gitlab Project

Follow the steps below:

1. Navigate to the _DTaaS_ group and select the project named after your
   GitLab username.
1. In the project menu, go to Settings and select CI/CD.
1. Expand the __Runners__ section and click on _New project runner_. Follow the
   configuration instructions carefully:
   - Add __linux__ as a tag during configuration.
   - Click on _Create runner_. A runner authentication token is generated.
     This token will be used later for registering a runner.

## Runner

### Install Runner

A detailed guide on installation of
[gitlab runners](https://docs.gitlab.com/runner/install/)
on Linux OS is available on
[gitlab website](https://docs.gitlab.com/runner/install/linux-repository.html).
Remember to use `linux` as tag for the runner.

### Register Runner

Please see this [gitlab guide](https://docs.gitlab.com/runner/register/)
on registering a runner.

Remember to choose _docker_ as executor and _ruby:2.7_ as
the default docker image.

```bash
$sudo gitlab-runner register  --url https://gitlab.foo.com \
  --token xxxxx
```

Or, you can also register the runner in non-interactive mode by running

```bash
$sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.foo.com/" \
  --token "xxxx" \
  --executor "docker" \
  --docker-image ruby:2.7 \
  --description "docker-runner"
```

### Start Runner

You can manually verify that the runner is available to pick up jobs by running
the following command:

```bash
$sudo gitlab-runner run
```

It can also be used to reactivate offline runners during subsequent sessions.

## Pipeline Trigger Token

You also need to create a
[pipeline trigger token](https://archives.docs.gitlab.com/16.4/ee/ci/triggers/index.html).
This token is required to trigger pipelines by using the API.
You can create this token in your GitLab project's CI/CD settings under
the *Pipeline trigger tokens* section.