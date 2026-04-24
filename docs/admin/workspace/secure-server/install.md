<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

🎉 Thank you for downloading **Digital Twin as a Service**.

This guide explains how to deploy the application for
secure multi-user deployments.

## ❓ Prerequisites

✅ Docker Engine v27 or later

✅ Sufficient system resources (at least 2GB RAM per workspace instance)

✅ Port 80 and 443 are available on the host

✅ Valid TLS certificates

✅ Domain name pointing to the server

## 🗒️ Design

An illustration of the installation setup is shown here.

<img src="secure-server.png"
  alt="Workspace production installation using Keycloak" width="800px" />

## 📁 User Directories

All the deployment options require user directories for
storing workspace files. These need to
be created for `USERNAME1` and `USERNAME2` set in `.env` file.

```bash
# create required files
cp -R files/template files/<USERNAME1>
cp -R files/template files/<USERNAME2>
# set file permissions for use inside the container
sudo chown -R 1000:100 files
```

## ⚙️ Configuration

Follow the pre-installation steps in
[`configuration.md`](configuration.md) for creating valid configuration.

▶️ Start the application:

```bash
docker compose up -d
```

### 🌵 Temporary Issues

The following issues in application startup are expected behaviour.
This problem will be resolved during post-installation.

👉 `traefik-forward-auth` service will be restarting at this stage.
👉 Visiting `https://intocps.org` shows `HTTP ERROR 500`.

Now complete the post-installation steps in
[`configuration.md`](configuration.md). Restart `traefik-forward-auth`

```bash
docker compose up -d --force-recreate traefik-forward-auth
```

The application will be accessible at <https://intocps.org> from web browser.
Login using the user credentials set in **Keycloak**.

Stop the demo:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```

## 🔧 Customization

### Adding More Users

Create user account for USERNAME3 in **Keycloak**.

Create the user's workspace directory:

```bash
cp -r files/template files/<USERNAME3>
sudo chown -R 1000:100 files/<USERNAME3>
```

Add a new service in `docker-compose.yml`:

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

## 🐛 Troubleshooting

### Certificate Issues

**Problem**: "NET::ERR_CERT_INVALID" in browser

**Solutions**:

- Verify certificate files exist in `./certs/` directory
- Check certificate file permissions
- For self-signed certs, add security exception in browser

### OAuth2 Issues

**Problem**: Redirect loop after OAuth2 login

**Solutions**:

- Verify OAuth2 callback URL matches `https://intocps.org/_oauth`
- Check `SERVER_DNS` environment variable is set correctly
- Ensure `COOKIE_DOMAIN` matches the domain
- Verify OAuth2 application is approved and active

### Service Access Issues

**Problem**: Cannot access workspace after authentication

**Solutions**:

- Check service health:
  `docker compose ps`
- View logs: `docker logs`
- Verify Traefik routes:
  `docker compose logs traefik`
- Test OAuth2 service:
  `docker compose logs traefik-forward-auth`

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
