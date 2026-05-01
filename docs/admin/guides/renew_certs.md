# Renewing LetsEncrypt Certificates

LetsEncrypt certificates expire every three months and must be renewed.
This guide covers renewal for current DTaaS package layouts.

## Prerequisites

- Administrative access to the host
- `certbot` installed
- Access to Docker commands

## Step 1: Renew certificates

```bash
sudo certbot renew --dry-run
sudo certbot renew
```

## Step 2: Deploy to DTaaS server package

For the secure server package (`deploy/dtaas/docker/secure-server`):

```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  /path/to/DTaaS/deploy/dtaas/docker/secure-server/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
  /path/to/DTaaS/deploy/dtaas/docker/secure-server/certs/privkey.pem
```

For the integrated package (`deploy/dtaas/docker/secure-server_with_integrated-gitlab`):

```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  /path/to/DTaaS/deploy/dtaas/docker/secure-server_with_integrated-gitlab/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
  /path/to/DTaaS/deploy/dtaas/docker/secure-server_with_integrated-gitlab/certs/privkey.pem
```

## Step 3: Restart Traefik in DTaaS package

Server package:

```bash
cd /path/to/DTaaS/deploy/dtaas/docker/secure-server
docker compose --env-file config/.env up -d --force-recreate traefik
```

Integrated GitLab package:

```bash
cd /path/to/DTaaS/deploy/dtaas/docker/secure-server_with_integrated-gitlab
docker compose --env-file config/.env up -d --force-recreate traefik
```

## Step 4: Deploy to services project (if used)

If platform services are run from a generated `dtaas-services` project,
copy the renewed certificates to that project's `certs/` directory.

```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  /path/to/services-project/certs/your-domain.com/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
  /path/to/services-project/certs/your-domain.com/privkey.pem
```

## Step 5: Restart affected services project containers

```bash
cd /path/to/services-project
docker compose -f compose.services.yml --env-file config/services.env up -d --force-recreate
```

If ThingsBoard or GitLab compose stacks are used in the same project:

```bash
docker compose -f compose.thingsboard.yml --env-file config/services.env up -d --force-recreate
docker compose -f compose.gitlab.yml --env-file config/services.env up -d --force-recreate
```

`deploy/dtaas/docker/secure-server` remains available as a compatibility alias
for the same external GitLab server layout.

## Verification

```bash
curl -I https://your-domain.com
```

Check logs if needed:

```bash
docker logs traefik
```
