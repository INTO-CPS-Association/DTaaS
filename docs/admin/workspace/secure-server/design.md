# Workspace with Traefik, OAuth2, and TLS

This guide explains how to deploy the workspace container with the Traefik
reverse proxy, OAuth2 authentication and TLS/HTTPS support for secure
multi-user deployments.

## Prerequisites

- Docker Engine v27 or later
- Docker Compose v2.x
- Sufficient system resources (at least 1GB RAM per workspace instance)
- Valid TLS certificates (production) or self-signed certificates (testing)
- A domain name pointing to the server (production) or localhost (testing)

## Design

```text
User Request → Traefik → Forward Auth → Keycloak (OIDC)
               ↓
         User Workspace
```

The `docker-compose.yml` file sets up:

- **Traefik** reverse proxy with TLS termination (ports 80, 443)
  and an automatic HTTP to HTTPS redirect
- **Keycloak** identity provider, served under `/auth`
- **OAuth2 authentication** through traefik-forward-auth
- the **DTaaS web client**
- **Workspace containers** for each user (user1, user2) behind
  authentication, using the
  [workspace image](https://hub.docker.com/r/intocps/workspace)
- **Two Docker networks**, `dtaas-frontend` and `dtaas-users`, which
  separate the frontend services from the user workspaces

## Initial Configuration

Follow the steps in [`configuration.md`](configuration.md)
to create a suitable configuration.

## Create Workspace Files

Every deployment option needs user directories for the workspace files.
Create them for the `USERNAME1` and `USERNAME2` values set in
`config/.env`.

```bash
# create required files
cp -R files/template files/<USERNAME1>
cp -R files/template files/<USERNAME2>
# set file permissions for use inside the container
sudo chown -R 1000:100 files
```

## Start Services

To start all services with TLS:

```bash
docker compose --env-file config/.env up -d
```

This:

1. starts the Traefik reverse proxy with TLS on ports 80 (HTTP → HTTPS
   redirect) and 443 (HTTPS)
2. starts Keycloak and the DTaaS web client
3. starts the traefik-forward-auth service for OAuth2 authentication
4. starts the workspace instances for user1 and user2, protected by
   authentication

## Accessing Workspaces

Once all services are running, open the workspaces through Traefik over
HTTPS:

### User Workspace (workspace)

- **VNC Desktop**: `https://intocps.org/user1/tools/vnc?path=user1%2Ftools%2Fvnc%2Fwebsockify`
- **VS Code**: `https://intocps.org/user1/tools/vscode`
- **Jupyter Notebook**: `https://intocps.org/user1`
- **Jupyter Lab**: `https://intocps.org/user1/lab`

#### Service Discovery

The workspace has a `/services` endpoint that returns a JSON list of
the available services, so frontend applications can discover them.

**Example**: Get the service list for user1

```bash
curl https://intocps.org/user1/services
```

**Response**:

```json
{
  "desktop": {
    "name": "Desktop",
    "description": "Virtual Desktop Environment",
    "endpoint": "tools/vnc?path=user1%2Ftools%2Fvnc%2Fwebsockify"
  },
  "vscode": {
    "name": "VS Code",
    "description": "VS Code IDE",
    "endpoint": "tools/vscode"
  },
  "notebook": {
    "name": "Jupyter Notebook",
    "description": "Jupyter Notebook",
    "endpoint": ""
  },
  "lab": {
    "name": "Jupyter Lab",
    "description": "Jupyter Lab IDE",
    "endpoint": "lab"
  }
}
```

The endpoint values are filled in with the username from the
`MAIN_USER` environment variable. For `user1`, this variable is set from
`USERNAME1` in `config/.env`.

## Authentication Flow

1. The user opens a workspace URL.
2. Traefik forwards the request to traefik-forward-auth.
3. If the user is not authenticated, they are redirected to the OAuth2
   provider.
4. The user logs in with the OAuth2 provider.
5. The provider redirects back with an authorisation code.
6. traefik-forward-auth exchanges the code for a token and creates a
   session.
7. The user is redirected to the original URL and gains access.

## Stopping Services

To stop all services:

```bash
docker compose --env-file config/.env down
```

To stop and remove volumes:

```bash
docker compose --env-file config/.env down -v
```

## Customisation

### Adding More Users

To add more workspace instances, add a new service in
`docker-compose.yml`:

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

The username and email must match the workspace user.

Create the user's directory:

```bash
cp -r files/template files/<USERNAME3>
sudo chown -R 1000:100 files/<USERNAME3>
```

Bring up the user workspace:

```bash
docker compose --env-file config/.env up -d --force-recreate user3
```

## Troubleshooting

### Certificate Issues

**Problem**: "NET::ERR_CERT_INVALID" in the browser

**Solutions**:

- Verify that the certificate files exist in the `./certs/` directory
- Check the certificate file permissions
- Ensure that `config/tls.yml` references the correct certificate paths
- For self-signed certificates, add a security exception in the browser

### OAuth2 Issues

**Problem**: Redirect loop after OAuth2 login

**Solutions**:

- Verify that the OAuth2 callback URL matches `https://intocps.org/_oauth`
- Check that the `SERVER_DNS` environment variable is set correctly
- Ensure that `COOKIE_DOMAIN` matches the domain
- Verify that the OAuth2 application is approved and active

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
