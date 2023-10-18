# Trial Installation

To try out the software, you can install it on either an Ubuntu Server 22.04
Operating System or within a Vagrant virtual machine.
Provided is a one-step installation script. This script sets up
the DTaaS software with default credentials and users.
You can use it to check a test installation of DTaaS software.

## Pre-requisites

### 1. Domain name

You need a domain name to run the application. The install script
assumes **foo.com** to be your domain name. You will change this after running the script.

### 2. Gitlab OAuth application

The DTaaS react website requires Gitlab OAuth provider.
If you need more help with this step, please see
the [Authentication page](client/auth.md).

You need the following information from the OAuth application registered on Gitlab:

| Gitlab Variable Name | Variable name in Client env.js | Default Value                                    |
| :------------------- | :----------------------------- | :----------------------------------------------- |
| OAuth Provider       | REACT_APP_AUTH_AUTHORITY       | https://gitlab.foo.com/                          |
| Application ID       | REACT_APP_CLIENT_ID            |
| Callback URL         | REACT_APP_REDIRECT_URI         | https://foo.com/Library                          |
| Scopes               | REACT_APP_GITLAB_SCOPES        | openid, profile, read_user, read_repository, api |

You can also see
[Gitlab help page](https://docs.gitlab.com/ee/integration/oauth_provider.html)
for getting the Gitlab OAuth application details.

## Install

```bash
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/deploy/single-script-install.sh
bash single-script-install.sh
```

!!! warning
    This test installation has default credentials and is thus highly insecure.


## Post install

After the install-script. Please change **foo.com** and Gitlab OAuth details to your local settings in the following files.

```txt
~/DTaaS/client/build/env.js
~/DTaaS/servers/config/gateway/dynamic/fileConfig.yml 
```

## Sanity check

Now when you visit your domain, you should be able to login through your OAuth Provider and be able to access the DTaas web UI.
