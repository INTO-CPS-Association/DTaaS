# Localhot Installation

To try out the software, you can install it on Ubuntu 22.04
Desktop Operating System. The setup requires a
machine which can spare 4GB RAM, 2 vCPUs and 15GB Hard Disk
space to a the DTaaS application.
A successful installation will create a setup
similar to the one shown in the figure.

![localhost install](./localhost.png)

A one-step installation script is provided on this page. This script sets up
the DTaaS software for a single user.
You can use it to check a test installation of the DTaaS software.

## Pre-requisites

### 1. Gitlab OAuth application

The DTaaS react website requires Gitlab OAuth provider.
If you need more help with this step, please see
the [Authorization page](client/auth.md).

!!! Information
    <!-- markdownlint-disable-file MD013 -->
    It is sufficient to have [user-owned oauth](https://docs.gitlab.com/ee/integration/oauth_provider.html#create-a-user-owned-application)
    application. You can create this application
    in your gitlab account.

You need the following information from the Gitlab OAuth application
registered on Gitlab:

| Gitlab Variable Name | Variable name in Client env.js | Default Value                                    |
| :------------------- | :----------------------------- | :----------------------------------------------- |
| OAuth Provider       | REACT_APP_AUTH_AUTHORITY       | <https://gitlab.com> or <https://gitlab.foo.com>      |
| Application ID       | REACT_APP_CLIENT_ID            |
| Callback URL         | REACT_APP_REDIRECT_URI         | <http://localhost/Library>                        |
| Scopes               | REACT_APP_GITLAB_SCOPES        | openid, profile, read_user, read_repository, api |

You can also see
[Gitlab help page](https://docs.gitlab.com/ee/integration/oauth_provider.html)
for getting the Gitlab OAuth application details.

## Install

<!-- prettier-ignore -->
!!! note
    While installing you might encounter multiple dialogs asking,
    which services should be restarted. Just click **OK** to all of those.

Run the following commands.

```bash
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/single-script-install.sh
bash single-script-install.sh --env local --username <username>
```

The `--env local` argument is added to the script specifies `localhost`
as the installation scenario. The `--username username` uses your
Gitlab username to configure the DTaaS application.

## Post install

After the single-install-script is successfully run. Please change
[Gitlab OAuth](#1-gitlab-oauth-application) details in

```txt
~/DTaaS/client/build/env.js
```

## Post-install Check

Now when you visit <http://localhost>, you should be able to login through
Gitlab OAuth Provider and access the DTaas web UI.

If you can following along to see all the screenshots from
[user website](../user/website/index.md).
Everything is correctly setup.

## References

Image sources: [Ubuntu logo](https://logodix.com/linux-ubuntu),
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[ml-workspace](https://github.com/ml-tooling/ml-workspace),
[nodejs](https://www.metachris.com/2017/01/how-to-install-nodejs-7-on-ubuntu-and-centos/),
[reactjs](https://krify.co/about-reactjs/),
[nestjs](https://camunda.com/blog/2019/10/nestjs-tx-email/)
