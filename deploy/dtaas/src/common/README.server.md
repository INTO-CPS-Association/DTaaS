# DTaaS server package

This package runs DTaaS for multiple users over HTTP with OAuth
authorization enforced by Traefik forward-auth.

![Deployment diagram](./server.png)

## Included files

- `docker-compose.yml`
- `.env.example`
- `config/` (includes client, traefik, forward-auth, and libms samples)
- `files/`
- `LICENSE.md`

## Configuration

1. Copy `.env.example` to `.env`.
2. Update values in `.env`.

| Variable | Example value | Description |
| :--- | :--- | :--- |
| `SERVER_DNS` | `foo.com` | Public DNS or IP used by Traefik routes. |
| `OAUTH_URL` | `https://gitlab.foo.com` | OAuth provider base URL. |
| `OAUTH_CLIENT_ID` | `xx` | Client ID for Traefik forward-auth OAuth app. |
| `OAUTH_CLIENT_SECRET` | `xx` | Client secret for Traefik forward-auth OAuth app. |
| `OAUTH_SECRET` | `random-secret-string` | Private random session signing string. |
| `USERNAME1` | `user1` | First DTaaS user workspace name and URL prefix. |
| `USERNAME2` | `user2` | Second DTaaS user workspace name and URL prefix. |

3. Update `config/client/env.server.js` with your deployment URL.
4. Update `config/forward-auth/conf.server` with allowed user e-mails.

## Run

```bash
docker compose up -d
```

## Stop

```bash
docker compose down
```
