<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

Thank you for downloading **Digital Twin as a Service**.

This README provides a quick-start installation guide for DTaaS on
localhost over **HTTP** with a single user workspace.

For HTTP localhost deployment, use
`deploy/dtaas/docker/localhost`.

For detailed configuration reference, see [CONFIG.md](CONFIG.md).

## Design

An illustration of the docker containers used in this package is shown here.

<img src="localhost.png" alt="DTaaS Localhost" width="600px" />

## Requirements

The installation requirements to run this package are:

- Docker Engine with Compose plugin
- GitLab account for OAuth sign-in

## Quick Start

### 1. Create Configuration Files

```bash
cp config/.env.example config/.env
cp config/client.js.example config/client.js
```

### 2. Create User Workspace Directory

Edit `config/.env` and set `DEFAULT_USER`, then create a matching workspace:

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

Sign in using the configured OAuth provider in `config/client.js`
(default authority is `https://gitlab.com/`).

## Run

The commands to start and stop the application are:

```bash
docker compose --env-file config/.env up -d
docker compose --env-file config/.env down
```

## Notes

- This package does not include `libms` or backend forward-auth.
- For secure production deployments, see
  `deploy/dtaas/docker/secure-server`.

## Documentation

Please see
<https://into-cps-association.github.io/DTaaS/development/index.html>
for complete documentation.

## References

Image sources:
[Traefik logo](https://www.laub-home.de/wiki/Traefik_SSL_Reverse_Proxy_f%C3%BCr_Docker_Container),
[gitlab](https://gitlab.com)
