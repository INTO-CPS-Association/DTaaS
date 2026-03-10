# Workspace with Traefik, OAuth2, and TLS

This guide explains how to deploy the workspace container with
Traefik reverse proxy, OAuth2 authentication, and TLS/HTTPS
support for secure multi-user deployments.

## ❓ Prerequisites

✅ Docker Engine v27 or later
✅ Docker Compose v2.x
✅ Sufficient system resources
(at least 1GB RAM per workspace instance)
✅ Valid TLS certificates (production) or self-signed certs (testing)
✅ OAuth2 provider (GitLab, GitHub, Google, etc.)
✅ Domain name pointing to your server (production) or localhost (testing)

## 🗒️ Design

```text
User Request → Traefik → Forward Auth → Keycloak (OIDC)
               ↓
         User Workspace
```

The `docker-compose.yml` file provides a production-ready setup with:

- **Traefik** reverse proxy with TLS termination (ports 80, 443)
- **Automatic HTTP to HTTPS redirect**
- **OAuth2 authentication** via traefik-forward-auth
- **Multiple workspace instances** (user1, user2) behind authentication
- **Secure communication** with TLS certificates
- **user1** workspace using the workspace image
- **user2** workspace using the mltooling/ml-workspace-minimal image
- **Two Docker networks**: `dtaas-frontend` and `dtaas-users`

## ⚙️ Initial Configuration

Please follow the steps in [`CONFIGURATION.md`](CONFIGURATION.md)
for creating suitable configuration.

## Create Workspace Files

All the deployment options require user directories for
storing workspace files. These need to
be created for `USERNAME1` and `USERNAME2` set in
`workspaces/test/dtaas/config/.env` file.

```bash
# create required files
cp -R files/user1 files/<USERNAME1>
cp -R files/user1 files/<USERNAME2>
# set file permissions for use inside the container
sudo chown -R 1000:100 files
```

## :rocket: Start Services

To start all services with TLS:

```bash
docker compose up -d
```

This will:

1. Start Traefik reverse proxy with TLS on ports 80 (HTTP → HTTPS redirect)
   and 443 (HTTPS)
2. Start traefik-forward-auth service for OAuth2 authentication
3. Start workspace instances for user1 and user2, protected by
   authentication

## :technologist: Accessing Workspaces

Once all services are running,
access the workspaces through Traefik with HTTPS:

### User Workspace (workspace)

- **VNC Desktop**:
  `https://foo.com/user1/tools/vnc?path=user1%2Ftools%2Fvnc%2Fwebsockify`
- **VS Code**: `https://foo.com/user1/tools/vscode`
- **Jupyter Notebook**: `https://foo.com/user1`
- **Jupyter Lab**: `https://foo.com/user1/lab`

#### Service Discovery

The workspace provides a `/services` endpoint that returns a JSON list of
available services. This enables dynamic service discovery for frontend
applications.

**Example**: Get service list for user1

```bash
curl https://foo.com/user1/services
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

The endpoint values are dynamically populated with the user's
username from the `MAIN_USER` environment variable.
This variable corresponds to `USERNAME1` in `.env`.

## 🔒 Authentication Flow

1. User attempts to access a workspace URL
2. Traefik forwards the request to traefik-forward-auth
3. If not authenticated, user is redirected to OAuth2 provider
4. User logs in with OAuth2 provider
5. Provider redirects back with authorization code
6. traefik-forward-auth exchanges code for token and creates session
7. User is redirected to original URL and gains access

## 🛑 Stopping Services

To stop all services:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```

## 🔧 Customization

### Adding More Users

To add additional workspace instances,
add a new service in `docker-compose.yml`:

```yaml
  user3:
    image: workspace:latest
    restart: unless-stopped
    build:
      context: ../..
      dockerfile: Dockerfile.ubuntu.noble.gnome
    environment:
      - MAIN_USER=${USERNAME3:-user3}
    volumes:
      - "./files/common:/workspace/common"
      - "./files/user3:/workspace"
    labels:
      - "traefik.enable=true"
      - >-
        traefik.http.routers.u3.rule=Host(`${SERVER_DNS:-localhost}`)
        && PathPrefix(`/${USERNAME3:-user3}`)
      - "traefik.http.routers.u3.tls=true"
      - "traefik.http.routers.u3.middlewares=traefik-forward-auth"
    networks:
      - users
```

Add the desired `USERNAME3` variable in [`.env`](config/.env):

```bash
# Username Configuration
# These usernames will be used as path prefixes for user workspaces
# Example: https://foo.com/user1, https://foo.com/user2
USERNAME1=user1
USERNAME2=user2
USERNAME3=user3 # <--- replace "user3" with your desired username
```

Add Forward Auth config for user3 in [`conf`](config/conf):

```txt

rule.user3_access.action=auth
rule.user3_access.rule=PathPrefix(`/user3`)
rule.user3_access.whitelist = user3@localhost
```

Ensure that the username and email correspond to the
workspace's GitLab user.

Don't forget to create the user's directory:

```bash
cp -r files/user1 files/user3
sudo chown -R 1000:100 files
```

## 🐛 Troubleshooting

### Certificate Issues

**Problem**: "NET::ERR_CERT_INVALID" in browser

**Solutions**:

- Verify certificate files exist in `./certs/` directory
- Check certificate file permissions
- Ensure `dynamic/tls.yml` correctly references certificate paths
- For self-signed certs, add security exception in browser

### OAuth2 Issues

**Problem**: Redirect loop after OAuth2 login

**Solutions**:

- Verify OAuth2 callback URL matches `https://foo.com/_oauth`
- Check `SERVER_DNS` environment variable is set correctly
- Ensure `COOKIE_DOMAIN` matches your domain
- Verify OAuth2 application is approved and active

### Service Access Issues

**Problem**: Cannot access workspace after authentication

**Solutions**:

- Check service health: `docker compose ps`
- View logs: `docker compose logs`
- Verify Traefik routes: `docker compose logs traefik`
- Test OAuth2 service: `docker compose logs traefik-forward-auth`

### Port Conflicts

**Problem**: Ports 80 or 443 already in use

**Solutions**:

- Check for other services: `sudo netstat -tlnp | grep -E ':(80|443)'`
- Stop conflicting services
- Or modify port mappings in compose file (not recommended for production)

## 📚 Additional Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Traefik Forward Auth](
  https://github.com/thomseddon/traefik-forward-auth
  )
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
