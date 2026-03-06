# Dex configuration guide

This directory contains Dex configuration files used by DTaaS.

## Files

- `dex-config.yaml`: local/passwordDB mode (self-contained, no upstream GitLab connector)
- `dex-config.yaml.example`: template for local/passwordDB mode
- `dex-config-gitlab.yaml`: GitLab connector mode
- `dex-config-gitlab.yaml.example`: template for GitLab connector mode

## Common options used

### `issuer`

Set to `http://localhost:5556/dex`.

This must match the URL used by the web client (`REACT_APP_AUTH_AUTHORITY`) and the Dex companion/proxy endpoint.

### `storage.type: memory`

In-memory state for local/dev usage. Tokens, keys, and sessions reset when Dex container is recreated.

### `web.http: 0.0.0.0:5556`

Dex listens on container port `5556`.

### `web.allowedOrigins: ['*']`

Permissive CORS setting for localhost development.

### `staticClients`

A single client is configured:

- `id: mock`
- `redirectURIs: ['http://localhost/Library']`
- `public: true` (no client secret required; suitable for browser SPA)

## Local/passwordDB file (`dex-config.yaml`)

### `expiry.idTokens: "2h"`

Matches the expected local-dev behavior with 2-hour ID tokens.

### `oauth2.skipApprovalScreen: true`

Removes consent page during login for simpler local workflows.

### `enablePasswordDB: true` + `staticPasswords`

Enables Dex local user authentication with static users.

Configured user fields:

- `email`: login identifier used on Dex login screen
- `hash`: bcrypt hash of the password
- `username`/`name`/`preferredUsername`: identity claims returned by Dex
- `groups`: included when `groups` scope is requested
- `userID`: stable Dex subject identifier

In `dex-config.yaml.example`, the sample user password is `user` (bcrypt-hashed).

## GitLab connector file (`dex-config-gitlab.yaml`)

This mode delegates authentication to GitLab via Dex `connectors.gitlab`.

Important fields:

- `baseURL`: your GitLab base URL
- `clientID`/`clientSecret`: GitLab OAuth app credentials
- `redirectURI`: Dex callback URL (`http://localhost:5556/dex/callback`)
- `scopes`: requested upstream scopes

## Username alignment with `.env`

DTaaS routes and workspace paths use `.env` value `username`.

For local/passwordDB mode, keep these aligned:

- `.env`: `username=<your-user>`
- `config/dex-config.yaml`: set static user `username` and `preferredUsername` to the same `<your-user>`

This prevents path mismatches in user-scoped URLs.
