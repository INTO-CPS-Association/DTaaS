# Working with Gitlab

The DTaaS relies on Gitlab for two purposes.

1. OAuth2 authorisation service
1. DevOps service

The [admin](../../admin/overview.md) documentation covers
the OAuth2 authorisation configuration.
This guide covers the use of git commands and project structure
for Gitlab DevOps service inside the DTaaS.

## Preparation

The first step is to create a gitlab project with *username*
in gitlab user group named *dtaas*.

![Gitlab project create](./create-repo.png)

This user needs to have ownership permissions over the project.

![Project ownership](./repo-ownership.png)

## Git commands

The usual git commands and workflows should be used. There are two ways to
use Gitlab project as a remote git server.

1. Over SSH using personal SSH key
1. Over HTTPS using
   [personal access tokens (PAT)](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)

This tutorial shows use of PAT for working with Gitlab server.

First step is to create PAT.

![Create PAT](create-PAT.png)

Copy this token and use it to clone the git repository.

## Library Assets

The Gitlab is used to store the reusable **Library**
assets of all users.
There is a [mandatory structure](../servers/lib/assets.md) for storing and
using Library assets including digital twins. A properly initialised
gitlab project should have the following structure.

![Project structure](./user-repo.png)

Please pay special attention to `.gitlab-ci.yml`. It must be a valid
Gitlab DevOps configuration. You can also check
[example repo](https://gitlab.com/dtaas/user1) for a sample structure.

For example, with `PAT1` as PAT of
`dtaas/user1` repository, the command to clone the repository is

```sh
$git clone https://user1:PAT1@shared.dtaas-digitaltwin.com/gitlab/dtaas/user1.git
$cd user1
```

Add the required Library assets and then

```sh
$git push origin
```

## Next Steps

Remember to have a [gitlab runner](../../admin/gitlab/runner.md) integrated
with your project repository. There might already be some runners installed
with your DTaaS application. You can check them on the runners page.
In addition, you can install your
[own runners](../../admin/gitlab/runner.md) integrated into your repository.

Now, the [Digital Twins Preview](../digital-twins/devops/ui.md) can be used
to access the DevOps features of the DTaaS platform.
