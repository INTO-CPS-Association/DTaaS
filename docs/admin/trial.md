# Trial Installation

The software can be installed either on
Ubuntu Server 22.04 Operating System or
on vagrant virtual machine(s).

A single step install script is helpful in performing a
trial run of the software. This script installs DTaaS software
with default credentials and users on a Ubuntu server 22.04
Operating System.
You can use it to check a test installation of DTaaS software.

## Pre-requisites

### Domain name

You need a domain name to run the application. The install script
assumes **foo.com** to be your domain name. Please change it
to a relevant one.

### Gitlab OAuth application

The DTaaS software requires Gitlab OAuth provider. Please see
[Gitlab help page](https://docs.gitlab.com/ee/integration/oauth_provider.html)
for getting the Gitlab OAuth application details.

You need the following information from the OAuth application registered on Gitlab:

| Gitlab Variable Name | Variable name in DTaaS React Client | Default Value |
|:---|:---|:---|
| OAuth Provider | REACT_APP_AUTH_AUTHORITY | https://gitlab.foo.com/ |
| Application ID | REACT_APP_CLIENT_ID |
| Callback URL | REACT_APP_REDIRECT_URI | https://foo.com/Library |
| Scopes | REACT_APP_GITLAB_SCOPES | openid, profile, read_user, read_repository, api |

### Install

```bash
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/single-script-install.sh
bash single-script-install.sh
```

!!! warning
    This test installation has default credentials and is thus highly insecure.
