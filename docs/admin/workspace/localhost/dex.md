# Dex configuration guide

The `dex-config.yaml.example` file is the Dex configuration
template. Copy `config/dex-config.yaml.example` to
`config/dex-config.yaml`.

## Files

- `dex-config.yaml.example`: template for local password database mode

## Common options

### `issuer`

Set to `http://localhost:5556/dex`.

This must match the URL used by the web client (`REACT_APP_AUTH_AUTHORITY`).

### `storage.type: memory`

Keeps state in memory for local development. Tokens, keys and sessions reset
when the Dex container is recreated.

### `web.http: 0.0.0.0:5556`

Dex listens on container port `5556`.

### `web.allowedOrigins: ['*']`

Permissive CORS setting for localhost development.

### `staticClients`

One client is configured:

- `id: mock`
- `redirectURIs: ['http://localhost/Library']`
- `public: true` (no client secret, which suits a browser SPA)

## Local password database file (`dex-config.yaml`)

### `expiry.idTokens: "2h"`

ID tokens are valid for two hours.

### `oauth2.skipApprovalScreen: true`

Skips the consent page during login.

### `enablePasswordDB: true` and `staticPasswords`

Enables Dex local user authentication with static users.

Configured user fields:

- `email`: login identifier used on the Dex login screen
- `hash`: bcrypt hash of the password
- `username`/`name`/`preferredUsername`: identity claims returned by Dex
- `groups`: included when the `groups` scope is requested
- `userID`: stable Dex subject identifier

In `dex-config.yaml.example`, the sample user's password is `user`
(bcrypt-hashed).

### Generate a bcrypt password hash

Use the generated value for the `hash` field in `staticPasswords`.

Install the Python dependency if needed:

```bash
python3 -m pip install bcrypt
```

Generate a bcrypt hash interactively:

```bash
python3 - <<'PY'
import bcrypt
import getpass

password = getpass.getpass('Password: ').encode('utf-8')
print(bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8'))
PY
```

Copy the printed hash into `config/dex-config.yaml`
as the value of `hash`.

## Username alignment with `config/.env`

DTaaS user-scoped routes use the `DEFAULT_USER` value from
`config/.env`.
`DEFAULT_USER` sets only the workspace URL route (`/<DEFAULT_USER>`)
and the `MAIN_USER` of the workspace container. The workspace files
always come from `files/user`: `docker-compose.yml` mounts
`./files/user` at `/workspace` whatever the value of `DEFAULT_USER`.

In local password database mode, keep these aligned:

- `config/.env`: `DEFAULT_USER=<user>`
- `config/dex-config.yaml`: set the static user's `username`
  and `preferredUsername` to the same `<user>`

This prevents path mismatches in user-scoped URLs.
