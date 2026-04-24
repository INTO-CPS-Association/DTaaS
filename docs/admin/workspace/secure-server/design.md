# Workspace with Traefik, OAuth2, and TLS

This guide explains how to deploy the workspace container with Traefik reverse
proxy, OAuth2 authentication, and TLS/HTTPS support for secure multi-user
deployments.

## ❓ Prerequisites

✅ Docker Engine v27 or later  

✅ Docker Compose v2.x  

✅ Sufficient system resources (at least 1GB RAM per workspace instance)  

✅ Valid TLS certificates (production) or self-signed certs (testing)

✅ Domain name pointing to the server (production) or localhost (testing)

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
- **Workspace containers** (for each user) using the
  [workspace image](https://hub.docker.com/r/intocps/workspace)
- **Docker networks** defined in `docker-compose.yml` to isolate frontend,
  auth, and user workspaces
- **Two Docker networks**: `dtaas-frontend` and `dtaas-users`

## ⚙️ Initial Configuration

Follow the steps in [`configuration.md`](configuration.md)
for creating suitable configuration.

## Create Workspace Files

All the deployment options require user directories for
storing workspace files. These need to
be created for `USERNAME1` and `USERNAME2` set in
`.env` file.

```bash
# create required files
cp -R files/template files/<USERNAME1>
cp -R files/template files/<USERNAME2>
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

Once all services are running, access the workspaces through Traefik with HTTPS:

### User Workspace (workspace)

- **VNC Desktop**: `https://intocps.org/user1/tools/vnc?path=user1%2Ftools%2Fvnc%2Fwebsockify`
- **VS Code**: `https://intocps.org/user1/tools/vscode`
- **Jupyter Notebook**: `https://intocps.org/user1`
- **Jupyter Lab**: `https://intocps.org/user1/lab`

#### Service Discovery

The workspace provides a `/services` endpoint that returns a JSON list of
available services. This enables dynamic service discovery for frontend
applications.

**Example**: Get service list for user1

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

The endpoint values are dynamically populated with the user's username from the
`MAIN_USER` environment variable. This variable corresponds to `USERNAME1` of
`.env` file.

## 🔒 Authentication Flow

1. User attempts to access a workspace URL
2. Traefik forwards the request to traefik-forward-auth
3. If not authenticated, user is redirected to OAuth2 provider
4. User logs in with OAuth2 provider
5. Provider redirects back with authorisation code
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

To add additional workspace instances, add a new service in `docker-compose.yml`:

```yaml
  user3:
    image: intocps/workspace:main-967bc10
    restart: unless-stopped
    environment:
      - MAIN_USER=${USERNAME3:-user3}
    volumes:
      - "./files/common:/workspace/common"
      - "./files/${USERNAME3:-user3}:/workspace"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.u3.rule=Host(`${SERVER_DNS:-localhost}`) && PathPrefix(`/${USERNAME3:-user3}`)"
      - "traefik.http.routers.u3.tls=true"
      - "traefik.http.routers.u3.middlewares=traefik-forward-auth"
    networks:
      - users
```

Add the desired `USERNAME3` variable in `.env`:

```bash
# Username Configuration
# These usernames will be used as path prefixes for user workspaces
# Example: http://localhost/user1, http://localhost/user2
USERNAME1=user1
USERNAME2=user2
USERNAME3=user3 # <--- replace "user3" with your desired username
```

Add Forward Auth config for user3 in `forward-auth-conf`:

```txt

rule.user3_access.action=auth
rule.user3_access.rule=PathPrefix(`/user3`)
rule.user3_access.whitelist = user3@localhost 
```

Ensure that the username and email correspond to the workspaces user.

Do not forget to create the user's directory:

```bash
cp -r files/template files/<USERNAME3>
sudo chown -R 1000:100 files/<USERNAME3>
```

Bring up the user workspace.

```bash
docker compose up -d --force-recreate user3
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

- Verify OAuth2 callback URL matches `https://intocps.org/_oauth`
- Check `SERVER_DNS` environment variable is set correctly
- Ensure `COOKIE_DOMAIN` matches the domain
- Verify OAuth2 application is approved and active

### Port Conflicts

**Problem**: Ports 80 or 443 already in use

**Solutions**:

- Check for other services: `sudo netstat -tlnp | grep -E ':(80|443)'`
- Stop conflicting services
- Or modify port mappings in compose file (not recommended for production)

## 📚 Additional Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Traefik Forward Auth](https://github.com/thomseddon/traefik-forward-auth)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
