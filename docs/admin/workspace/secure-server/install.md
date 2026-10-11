<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

This guide explains how to deploy the workspace application for
**secure multi-user deployments with Keycloak** for authentication.

## Prerequisites

- Docker Engine v27 or later
- Sufficient system resources (at least 2GB RAM per workspace instance)
- Ports 80 and 443 available on the host
- Valid TLS certificates
- A domain name pointing to the server

Download **workspace-keycloak-production-xx.zip** from the latest
[release / pre-release](https://github.com/INTO-CPS-Association/DTaaS/releases)
page.

## Design

The installation setup is shown here.

<img src="secure-server.png"
  alt="Workspace production installation using Keycloak" width="800px" />

## User Directories

Every deployment option needs user directories for the workspace files.
Create them for the `USERNAME1` and `USERNAME2` values set in `config/.env`.

```bash
# create required files
cp -R files/template files/<USERNAME1>
cp -R files/template files/<USERNAME2>
# set file permissions for use inside the container
sudo chown -R 1000:100 files
```

## Configuration

Follow the pre-installation steps in
[`configuration.md`](configuration.md) to create a valid configuration.

Start the application:

```bash
docker compose --env-file config/.env up -d
```

### Temporary Issues

The following startup issues are expected at this stage and go away after
the post-installation steps:

- The `traefik-forward-auth` service keeps restarting.
- Visiting `https://intocps.org` shows `HTTP ERROR 500`.

Now complete the post-installation steps in
[`configuration.md`](configuration.md), then restart `traefik-forward-auth`:

```bash
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

The application is now available at <https://intocps.org>.
Log in with the user credentials set in **Keycloak**.

Stop the application:

```bash
docker compose --env-file config/.env down
```

To stop and remove volumes:

```bash
docker compose --env-file config/.env down -v
```

## Customisation

### Adding More Users

Create a user account for USERNAME3 in **Keycloak**.

Create the user's workspace directory:

```bash
cp -r files/template files/<USERNAME3>
sudo chown -R 1000:100 files/<USERNAME3>
```

Add a new service in `docker-compose.yml`:

```yaml
  user3:
    image: intocps/workspace:main-56c6f68
    restart: unless-stopped
    environment:
      - MAIN_USER=${USERNAME3:-user3}
    volumes:
      - "./files/common:/workspace/common"
      - "./files/${USERNAME3:-user3}:/workspace"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.u3.entryPoints=web-secure"
      - "traefik.http.routers.u3.rule=Host(`${SERVER_DNS:-localhost}`) && PathPrefix(`/${USERNAME3:-user3}`)"
      - "traefik.http.routers.u3.tls=true"
      - "traefik.http.routers.u3.middlewares=traefik-forward-auth"
    networks:
      - users
```

Add the `USERNAME3` variable to `config/.env`:

```bash
# Username Configuration
# These usernames will be used as path prefixes for user workspaces
# Example: https://intocps.org/user1, https://intocps.org/user2
USERNAME1=user1
USERNAME2=user2
USERNAME3=user3 # <--- replace "user3" with your desired username
```

Add a Forward Auth rule for user3 to `config/forward-auth-conf`:

```txt

rule.user3_access.action=auth
rule.user3_access.rule=PathPrefix(`/user3`)
rule.user3_access.whitelist = user3@localhost
```

## Troubleshooting

### Certificate Issues

**Problem**: "NET::ERR_CERT_INVALID" in the browser

**Solutions**:

- Verify that the certificate files exist in the `./certs/` directory
- Check the certificate file permissions
- For self-signed certificates, add a security exception in the browser

### OAuth2 Issues

**Problem**: Redirect loop after OAuth2 login

**Solutions**:

- Verify that the OAuth2 callback URL matches `https://intocps.org/_oauth`
- Check that the `SERVER_DNS` environment variable is set correctly
- Ensure that `COOKIE_DOMAIN` matches the domain
- Verify that the OAuth2 application is approved and active

### Service Access Issues

**Problem**: Cannot access the workspace after authentication

**Solutions**:

- Check service health:
  `docker compose --env-file config/.env ps`
- View logs: `docker logs`
- Verify Traefik routes:
  `docker compose --env-file config/.env logs traefik`
- Test the OAuth2 service:
  `docker compose --env-file config/.env logs traefik-forward-auth`

### Port Conflicts

**Problem**: Ports 80 or 443 already in use

**Solutions**:

- Check for other services: `sudo netstat -tlnp | grep -E ':(80|443)'`
- Stop conflicting services
- Or change the port mappings in the compose file (not recommended for
  production)

## Additional Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Traefik Forward Auth](https://github.com/thomseddon/traefik-forward-auth)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
