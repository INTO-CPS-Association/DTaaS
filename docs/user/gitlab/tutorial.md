# Working with GitLab

The DTaaS platform relies on GitLab for two purposes:

1. OAuth 2.0 authorization service
1. DevOps service

The [admin](../../admin/overview.md) documentation covers
the OAuth 2.0 authorization configuration.
This guide addresses the use of git commands and project structure
for the GitLab DevOps service within the DTaaS.

## Preparation

The first step is to create a GitLab project with the *username*
in the GitLab user group named *dtaas*.

![GitLab project create](create-repo.png)

The user must have ownership permissions over the project.

![Project ownership](repo-ownership.png)

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! warning
    The DTaaS website expects a default branch named
    `main` to exist. The website client performs all git
    operations on this branch.
    The preferred default branch name can be changed in the
    [settings page](../website/settings.md).
<!-- markdownlint-enable MD046 -->

## Git commands

Standard git commands and workflows should be utilized. There are two methods for
using a GitLab project as a remote git server:

1. Over SSH using a personal SSH key
1. Over HTTPS using
   [personal access tokens (PAT)](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)

This tutorial demonstrates the use of PAT for working with the GitLab server.

The first step is to create a PAT.

![Create PAT](create-PAT.png)

This token should be copied and used to clone the git repository.

## Library Assets

GitLab is used to store the reusable **Library**
assets of all users.
A [mandatory structure](../servers/lib/assets.md) exists for storing and
using Library assets including digital twins. A properly initialized
GitLab project should have the following structure.

![Project structure](./user-repo.png)

Please pay special attention to `.gitlab-ci.yml`. It must be a valid
GitLab DevOps configuration. The
[example repo](https://gitlab.com/dtaas/user1) provides a sample structure.

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

A [GitLab runner](../../admin/gitlab/runner.md) should be integrated
with the project repository. Runners may already be installed
with the DTaaS platform. These can be verified on the runners page.
Additionally, [custom runners](../../admin/gitlab/runner.md) can be installed
and integrated with the repository.

The [Digital Twins Preview](../digital-twins/devops/ui.md) can then be used
to access the DevOps features of the DTaaS platform.
