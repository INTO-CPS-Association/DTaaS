<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas-logo-full-192h.png#only-light)
![DTaaS logo](dtaas-logo-full-white-192h.png#only-dark)

This document explains how to change the username and password of the
localhost **DTaaS** installation.

## Update Configuration

Copy `config/dex-config.yaml.example` to `config/dex-config.yaml`.
Update these fields in `config/dex-config.yaml`:

- `email`
- `hash` (bcrypt hash of the chosen password)
- `username`, `name`, `preferredUsername`

The Dex configuration is described in [`dex.md`](dex.md).

Edit `config/.env`.

| Variable     | Example Value | Explanation                           |
| :----------- | :------------ | :------------------------------------ |
| DEFAULT_USER | 'user'        | Dex username set in `dex-config.yaml` |

The username must match in both files when Dex uses its local password
database:

- In `config/.env`, choose `DEFAULT_USER=<user>`.
- In `config/dex-config.yaml`, set the static user's `username`
  and `preferredUsername` to the same value.

This keeps the user-scoped DTaaS routes in line with the OIDC identity
claims.

## Run

Start the application:

```bash
docker compose --env-file config/.env up -d
```

Stop the application:

```bash
docker compose --env-file config/.env down
```

### Use

Open <http://localhost> in a web browser.
Sign in with the new user credentials from the Dex configuration file
(`config/dex-config.yaml`).

The Workbench page of the single page client opens the tools
running in your workspace.

## Documentation

See
<https://into-cps-association.github.io/DTaaS/development/index.html>
for the complete documentation.

## OAuth Scope Notes

Scopes in local password database mode:

- Supported: `openid profile email groups offline_access`
- Not supported by the Dex local password database:
  `read_user read_repository api`

## References

Image sources:

Traefik logo:
<https://www.laub-home.de/wiki/>

Dex IdP:
<https://dexidp.io/>
