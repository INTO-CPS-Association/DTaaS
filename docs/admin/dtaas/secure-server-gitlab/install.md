<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

This guide installs a **secure, multi-user DTaaS deployment** that uses
an **integrated GitLab instance** for OAuth 2.0 authorisation.

Download **dtaas-secure-server-integrated-gitlab-xx.zip** from the latest
[release / pre-release](https://github.com/INTO-CPS-Association/DTaaS/releases)
page.

For the configuration reference, see [config.md](config.md).

!!! important
    This guide uses the hostname `intocps.org` as an example. Replace it
    with the hostname of your server.

## Overview

This package installs DTaaS as a multi-user web application with an
integrated GitLab CE instance. GitLab is both the OAuth 2.0
authorisation provider and the DevOps backend for digital twin projects.

<img src="server.png" alt="DTaaS on Server" width="600px" />

The `docker-compose.yml` starts the following services:

| Service                  | Purpose                                   |
| :----------------------- | :---------------------------------------- |
| **traefik**              | Reverse proxy with TLS termination        |
| **client**               | DTaaS React frontend                      |
| **logger-ms**            | Logger microservice                       |
| **user1 / user2**        | JupyterLab user workspaces                |
| **libms**                | Library management microservice           |
| **traefik-forward-auth** | OAuth 2.0 authorisation middleware        |
| **gitlab**               | Integrated GitLab CE (OAuth 2.0 provider) |

## Prerequisites

| Requirement         | Details                                                                                                                    |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| **Docker Engine**   | v28 or later with Compose plugin                                                                                           |
| **Domain name**     | A domain name (e.g. `intocps.org`) or IP address                                                                           |
| **TLS certificate** | `fullchain.pem` and `privkey.pem` for the domain. Obtain via [certbot](https://certbot.eff.org/) or a certificate provider |

## Quick Start

### 1. Create Configuration Files

```bash
cp config/.env.example       config/.env
cp config/conf.server.example config/conf.server
cp config/client.js.example     config/client.js
```

Edit `config/.env` and set `SERVER_DNS`, `USERNAME1` and `USERNAME2`.
Leave the `OAUTH_*` variables as placeholders for now; you fill them in
once the GitLab instance is running (see step 5).

See [config.md](config.md) for a reference of every variable.

### 2. Create User Workspace Directories

```bash
cp -R files/template files/<USERNAME1>
cp -R files/template files/<USERNAME2>
sudo chown -R 1000:100 files/*
```

The logger microservice writes its events to `logs/logger`. Create the
directory and give it to uid 1000, the user that runs the logger:

```bash
mkdir -p logs/logger
sudo chown -R 1000:1000 logs/logger
```

`logs/` itself holds the GitLab logs, so change the owner of
`logs/logger` only.

### 3. Add TLS Certificates

```bash
cp /path/to/fullchain.pem certs/fullchain.pem
cp /path/to/privkey.pem   certs/privkey.pem
```

Traefik falls back to self-signed certificates if these files are
absent or invalid.

### 4. Start Services

```bash
docker compose --env-file config/.env up -d
```

GitLab takes a few minutes to become healthy. Watch its status with:

```bash
watch docker ps
```

### 5. Configure GitLab

Once the GitLab container shows as `healthy`:

1. Log in to `https://intocps.org/gitlab` as `root`.
   The initial password is in `config/gitlab/initial_root_password`.

    !!! warning
        GitLab **deletes this file 24 hours** after the first start.
        Save the password immediately.

1. Create user accounts (see
   [GitLab docs](https://docs.gitlab.com/ee/user/profile/account/create_accounts.html)).
   The usernames **must** match `USERNAME1`/`USERNAME2` in `config/.env`.

1. Register two OAuth 2.0 applications in GitLab
   (Admin Area → Applications):

   - **DTaaS Client Authorization** for the React SPA frontend.
     See the [client auth docs](../../client/auth.md).
   - **DTaaS Server Authorization** for the Traefik forward-auth backend.
     See the [server auth docs](../../servers/auth.md).

1. Put the generated OAuth 2.0 credentials into the configuration files:
   - Set `REACT_APP_CLIENT_ID` and `REACT_APP_AUTH_AUTHORITY` in
     `config/client.js`.
   - Set `OAUTH_URL`, `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in
     `config/.env`.

1. Update the user permissions in `config/conf.server`.

1. Reload the services:

   ```bash
   docker compose --env-file config/.env up -d --force-recreate client traefik-forward-auth
   ```

### 6. Verify

| URL                          | Expected result                                   |
| :--------------------------- | :------------------------------------------------ |
| `https://intocps.org`        | DTaaS web interface (redirects to GitLab sign-in) |
| `https://intocps.org/gitlab` | Integrated GitLab instance                        |
| `https://intocps.org/user1`  | User 1 workspace (after sign-in)                  |
| `https://intocps.org/user2`  | User 2 workspace (after sign-in)                  |

## Stop

```bash
docker compose --env-file config/.env down
```

## Directory Layout

```text
.
├── certs/                 # TLS certificates (fullchain.pem, privkey.pem)
├── config/
│   ├── .env               # Docker compose environment variables
│   ├── conf.server        # Traefik forward-auth authorisation rules
│   ├── client.js          # DTaaS React client configuration
│   ├── gitlab/            # GitLab config (mounted as /etc/gitlab)
│   └── tls.yml            # Traefik TLS provider configuration
├── data/                  # GitLab persistent data (/var/opt/gitlab)
├── files/
│   ├── common/            # Shared files across all workspaces
│   └── template/          # sample user workspace files
├── logs/                  # GitLab logs (/var/log/gitlab)
│   └── logger/            # Logger microservice events
├── docker-compose.yml     # Service definitions
├── CONFIG.md              # Detailed configuration reference
└── README.md              # This file — quick-start guide
```

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[GitLab](https://gitlab.com)
