# 🧩 Dex configuration guide

ℹ️ The `dex-config.yaml.example` file contains Dex configuration
template. Duplicate `config/dex-config.yaml.example` to
`config/dex-config.yaml`.

## 📁 Files

- `dex-config.yaml.example`: template for local/passwordDB mode

## ⚙️ Common options used

### 🌐 `issuer`

Set to `http://localhost:5556/dex`.

This must match the URL used by the web client (`REACT_APP_AUTH_AUTHORITY`)
and the Dex companion/proxy endpoint.

### `storage.type: memory`

In-memory state for local/dev usage. Tokens, keys, and sessions reset when
the Dex container is recreated.

### 🌍 `web.http: 0.0.0.0:5556`

Dex listens on container port `5556`.

### 🔓 `web.allowedOrigins: ['*']`

Permissive CORS setting for localhost development.

### 🪪 `staticClients`

A single client is configured:

- `id: mock`
- `redirectURIs: ['http://localhost/Library']`
- `public: true` (no client secret required; suitable for browser SPA)

## 🔐 Local/passwordDB file (`dex-config.yaml`)

### ⏳ `expiry.idTokens: "2h"`

Matches the expected local-dev behaviour with 2-hour ID tokens.

### ✅ `oauth2.skipApprovalScreen: true`

Removes consent page during login for simpler local workflows.

### 👤 `enablePasswordDB: true` + `staticPasswords`

Enables Dex local user authentication with static users.

Configured user fields:

- `email`: login identifier used on Dex login screen
- `hash`: bcrypt hash of the password
- `username`/`name`/`preferredUsername`: identity claims returned by Dex
- `groups`: included when `groups` scope is requested
- `userID`: stable Dex subject identifier

ℹ️ In `dex-config.yaml.example`, the sample user password is `user`
(bcrypt-hashed).

### 🔑 Generate a bcrypt password hash

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

✅ Copy the printed hash into `config/dex-config.yaml`
as the value of `hash`.

## 👤 Username alignment with `.env`

DTaaS routes and workspace paths use `.env` value `DEFAULT_USER`.

For local/passwordDB mode, keep these aligned:

- `.env`: `DEFAULT_USER=<desired-user>`
- `config/dex-config.yaml`: set static user `username`
  and `preferredUsername` to the same `<desired-user>`

✅ This prevents path mismatches in user-scoped URLs.
