# Working with GitLab

The DTaaS platform uses GitLab for two purposes:

1. OAuth 2.0 authorization service
1. DevOps service

The [admin](../../admin/overview.md) documentation covers
the OAuth 2.0 authorization configuration.
This guide covers the git commands and project structure
for the GitLab DevOps service within the DTaaS.

## Preparation

First, create a GitLab project named after your *username*
in the GitLab group named *dtaas*.

![GitLab project create](create-repo.png)

The user must have ownership permissions over the project.

![Project ownership](repo-ownership.png)

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! warning
    By default, the DTaaS website expects a branch named
    `master` to exist and performs all git operations on it.
    A different branch can be set in the **Branch Name** field of the
    [settings page](../website/settings.md).
<!-- markdownlint-enable MD046 -->

## Git commands

Use the standard git commands and workflows. A GitLab project can be
used as a remote git server in two ways:

1. Over SSH using a personal SSH key
1. Over HTTPS using
   [personal access tokens (PAT)](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)

This tutorial uses a PAT to work with the GitLab server.

First, create a PAT.

![Create PAT](create-PAT.png)

Copy the token and use it to clone the git repository.

## Library Assets

GitLab stores the reusable **Library** assets of all users.
Library assets, including digital twins, must follow a
[mandatory structure](../servers/lib/assets.md). A properly initialized
GitLab project has the following structure.

![Project structure](./user-repo.png)

Pay special attention to `.gitlab-ci.yml`. It must be a valid
GitLab DevOps configuration. The
[example repo](https://gitlab.com/dtaas/user1) has a sample structure.

For example, with `PAT1` as the PAT for the
`dtaas/user1` repository, the command to clone the repository is:

```sh
$git clone \
  https://user1:PAT1@dtaas-digitaltwin.com/gitlab/dtaas/user1.git
$cd user1
```

After adding the required Library assets:

```sh
$git push origin
```

## Container Registry

The integrated GitLab includes a private container registry. Each
GitLab project can store container images, for example ready-to-use
environments for digital twins. The registry listens on its own port,
`5050` unless the administrator has chosen another one.

Log in with your GitLab username and a PAT that has the `api` or
`write_registry` scope, then push and pull images under your project:

```sh
$docker login dtaas-digitaltwin.com:5050
$docker tag my-dt-env:1.0 \
  dtaas-digitaltwin.com:5050/dtaas/user1/my-dt-env:1.0
$docker push dtaas-digitaltwin.com:5050/dtaas/user1/my-dt-env:1.0
$docker pull dtaas-digitaltwin.com:5050/dtaas/user1/my-dt-env:1.0
```

The **Deploy > Container registry** page of the project lists the
stored images.

Images belong to the project they are pushed to. Only users with access
to that project can pull them, and only project members with at least
the Developer role can push. To share an image, give other users access
to the project.

A pipeline in the same project can run its jobs in a stored image.
GitLab gives the job a token that can pull from the project's registry:

```yaml
simulate:
  image: $CI_REGISTRY_IMAGE/my-dt-env:1.0
  script:
    - ./simulate.sh
```

GitLab sets `CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER` and
`CI_REGISTRY_PASSWORD` in every job, so a pipeline can also log in and
publish images to the project's registry.

## Next Steps

A [GitLab runner](../../admin/gitlab/runner-linux.md) must be linked
to the project repository. Some runners may already be installed
with the DTaaS platform; check the runners page of the GitLab project.
You can also install [custom runners](../../admin/gitlab/runner-linux.md)
and link them to the repository.

You can then use the [Digital Twins Page](../digital-twins/devops/ui.md)
to access the DevOps features of the DTaaS platform.
