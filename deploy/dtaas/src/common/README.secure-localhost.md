# DTaaS secure localhost package

This package runs DTaaS for a single user on localhost over HTTPS.
It intentionally does **not** include Traefik forward-auth.

![Deployment diagram](./localhost-https.png)

## Included files

- `docker-compose.yml`
- `.env.example`
- `config/` (includes sample client and traefik config)
- `files/`
- `LICENSE.md`

## Configuration

1. Copy `.env.example` to `.env`.
2. Update values in `.env`.
3. Place certificates at `certs/fullchain.pem` and `certs/privkey.pem`.
4. If paths differ, update `config/traefik/tls.yml`.

Environment variables:

| Variable | Example value | Description |
| :--- | :--- | :--- |
| `USERNAME1` | `user1` | Username for the single workspace and URL prefix (`/user1`). |

If you change `USERNAME1`, create the matching workspace folder:

```bash
cp -R files/user1 files/<your-username>
```

## Run

```bash
docker compose up -d
```

## Stop

```bash
docker compose down
```
