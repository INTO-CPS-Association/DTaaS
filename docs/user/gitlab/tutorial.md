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

## Next Steps

A [GitLab runner](../../admin/gitlab/runner-linux.md) must be linked
to the project repository. Some runners may already be installed
with the DTaaS platform; check the runners page of the GitLab project.
You can also install [custom runners](../../admin/gitlab/runner-linux.md)
and link them to the repository.

You can then use the [Digital Twins Page](../digital-twins/devops/ui.md)
to access the DevOps features of the DTaaS platform.
