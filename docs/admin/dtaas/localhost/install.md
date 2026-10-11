<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

This guide installs DTaaS on localhost over **HTTP** with a single user
workspace.

Download **dtaas-localhost-xx.zip** from the
[release / pre-release](https://github.com/INTO-CPS-Association/DTaaS/releases)
page.

For the configuration reference, see [config.md](config.md).

## Design

The diagram shows the Docker containers in this package.

<img src="localhost.png" alt="DTaaS Localhost" width="600px" />

## Requirements

- Docker Engine with the Compose plugin
- A GitLab account for OAuth sign-in

## Quick Start

### 1. Create Configuration Files

```bash
cp config/.env.example config/.env
cp config/client.js.example config/client.js
```

### 2. Create User Workspace Directory

Set `DEFAULT_USER` in `config/.env`, then create a matching workspace:

```bash
cp -R files/template files/<DEFAULT_USER>
sudo chown -R 1000:100 files/*
```

### 3. Start Services

```bash
docker compose --env-file config/.env up -d
```

### 4. Open DTaaS

- <http://localhost>

Sign in with the OAuth provider configured in `config/client.js`
(the default authority is `https://gitlab.com/`).

## Run

Start and stop the application with:

```bash
docker compose --env-file config/.env up -d
docker compose --env-file config/.env down
```

## Notes

- This package does not include `libms` or backend forward-auth.
- For secure production deployments, see
  `deploy/dtaas/docker/secure-server_with_integrated-gitlab`.

## Documentation

See
<https://into-cps-association.github.io/DTaaS/development/index.html>
for the complete documentation.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[gitlab](https://gitlab.com)
