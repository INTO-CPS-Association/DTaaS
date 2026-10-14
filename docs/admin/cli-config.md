# CLI Configuration Reference

This page is the reference for `dtaas.toml`, the configuration file
that every DTaaS CLI command reads. Generate a template with
`dtaas config generate`, fill it in, and check it with
`dtaas config validate` before running any other command. The
installation workflow is covered in
[Install with DTaaS CLI](cli.md).

## Which sections does my deployment need?

### Server deployments

| Section | `localhost` | `insecure-server` | `secure-server` | `secure-server-gitlab` |
| --- | :---: | :---: | :---: | :---: |
| `[common]` | Required | Required | Required | Required |
| `[common.security]` | Not used | Not used | Required | Required |
| `[common.resources]` | Optional | Optional | Optional | Optional |
| `[gitlab]` | Optional | Optional | Optional | Optional |
| `[[users]]` | Optional | Required | Required | Required |
| `[frontend]` | Not used | Required | Required | Required |
| `[localhost]` | Required | Not used | Not used | Not used |
| `[insecure-server]` | Not used | Required | Not used | Not used |
| `[secure-server]` | Not used | Not used | Required | Not used |
| `[secure-server-gitlab]` | Not used | Not used | Not used | Required |

### Workspace deployments

| Section | `workspace-localhost` | `workspace-secure-server` |
| --- | :---: | :---: |
| `[common]` | Required | Required |
| `[common.security]` | Not used | Required |
| `[common.resources]` | Optional | Optional |
| `[gitlab]` | Optional | Optional |
| `[[users]]` | Optional | Required |
| `[workspace-localhost]` | Required | Not used |
| `[workspace-secure-server]` | Not used | Required |

## Annotated `dtaas.toml`

The file below shows every key with inline comments. Copy it as a
starting point and delete the sections that your deployment type does
not use (see the tables above).

```toml
# ── Metadata (top level) ──────────────────────────────────────────────────────
# Describes the instance. git-repo, the URL of the DTaaS repository, is
# required for all deployment types; validate checks no other key here.
name     = "Digital Twin as a Service (DTaaS)"
version  = "2.2.0"
owner    = "The INTO-CPS-Association"
git-repo = "https://github.com/into-cps-association/DTaaS.git"

# ── Common settings (all deployment types) ────────────────────────────────────
[common]
# Public hostname of the server. Use "localhost" for local deployments,
# a fully-qualified domain name (e.g. "dtaas.example.com") for servers,
# or a bare IP address.
server-dns = "dtaas.example.com"

# Absolute path to the DTaaS installation directory on the deployment host.
# Must exist before running validate.
path = "/opt/dtaas"

# ── TLS settings (required for: secure-server, secure-server-gitlab,
#                               workspace-secure-server) ──────────────────────
[common.security]
tls = true

# Absolute path to the directory containing fullchain.pem and privkey.pem.
# Used by deployment generate (seeds certs/) and platform update --certs.
certs-src = "/etc/letsencrypt/live/dtaas.example.com"

# ── Per-user container resource limits (optional, all types) ──────────────────
[common.resources]
# Enforce the limits below. Set to false to add users without any caps.
# The 4 fields are then optional and ignored. Defaults to true when omitted.
set_limits = true
cpus       = 4        # CPU cores; may be fractional, e.g. 0.5
mem_limit  = "4G"     # memory limit unit required: G, m, k …
pids_limit = 4960     # maximum number of processes per container (integer)
shm_size   = "512m"   # shared memory unit required

# ── Starting users (all deployment types) ─────────────────────────────────────
# One self-contained [[users]] block per user, hand-edited once at install
# time. Presence in this file is the desired state there are no add/delete
# lists. Additional users added later with `dtaas user add` live in the
# CLI-owned dtaas.users.registry.json instead.
# Usernames must match GitLab accounts and be unique across the array.
#
# email enables traefik-forward-auth routing rules automatically;
# groups/load_balance carry per-user tags. password is optional: it is the
# initial GitLab password when `dtaas user add <username>` provisions this
# starting user's account. Avoid committing a real secret here; prefer
# supplying it at runtime instead.
[[users]]
username     = "alice"
email        = "alice@example.com"
groups       = ["default", "dtaas"]
load_balance = true

[[users]]
username     = "bob"
email        = "bob@example.com"
groups       = ["default", "dtaas"]
load_balance = false
# password   = "Kq7v-Rm3x-Zt9w"   # initial GitLab password, see above

# ── React web client OAuth app (insecure-server, secure-server,
#                                secure-server-gitlab) ────────────────────────
# This is a SEPARATE OAuth application from the traefik-forward-auth app
# configured in [insecure-server] / [secure-server] below.
# Redirect URI: https://<server-dns>/Library
# Scopes: api read_user read_repository openid profile   Type: not Confidential
[frontend]
react-app-client-id = "dtaas-client"
react-app-oauth-url = "https://gitlab.example.com"

# ── GitLab user provisioning (optional, all types) ───────────────────────────
# Off by default. When provision = true, `dtaas user add` also creates
# each new user's GitLab account and a Personal Access Token (see
# "Add Users" in cli.md). The provisioning token must belong to an
# administrator and carry the api scope (plus admin_mode on an instance with
# Admin Mode enabled); supply it via the DTAAS_GITLAB_PAT environment variable
# rather than committing it here. A [gitlab].pat key is the fallback when the
# variable is unset or empty. ssl_verify may be a CA-bundle path for a GitLab
# behind an internal CA; false disables verification (a warning is printed)
# and true (default) uses the system trust store.
[gitlab]
provision  = false
api_url    = "https://gitlab.example.com"
# pat      = "glpat-xxxxxxxxxxxxxxxxxxxx"   # prefer DTAAS_GITLAB_PAT
# ssl_verify = "/etc/ssl/certs/corp-ca.pem" # or true (default) / false

# ── localhost deployment (dev / demo only) ────────────────────────────────────
# GitLab OAuth app for the web client; auth-authority is the GitLab URL.
[localhost]
default-user   = "alice"
client-id      = "dtaas-local"
auth-authority = "https://gitlab.example.com"

# ── insecure-server deployment (HTTP, demo only not internet-facing) ─────────
# GitLab OAuth app for traefik-forward-auth.
# Redirect URI: http://<server-dns>/_oauth
# Scopes: openid profile read_user   Type: Confidential
[insecure-server]
oauth-url           = "https://gitlab.example.com"
oauth-client-id     = "abc123"
oauth-client-secret = "s3cr3t"
oauth-secret        = "random-signing-string"   # random; used to sign session cookies

# ── secure-server deployment (HTTPS/TLS production-ready) ───────────────────
# Same GitLab OAuth app as insecure-server, with Redirect URI using https.
[secure-server]
oauth-url           = "https://gitlab.example.com"
oauth-client-id     = "abc123"
oauth-client-secret = "s3cr3t"
oauth-secret        = "random-signing-string"

# ── secure-server-gitlab deployment (bundled GitLab production-ready) ───────
# oauth-url points at the bundled GitLab, served under /gitlab.
[secure-server-gitlab]
oauth-url           = "https://dtaas.example.com/gitlab"
oauth-client-id     = "abc123"
oauth-client-secret = "s3cr3t"
oauth-secret        = "random-signing-string"

# ── workspace-localhost deployment (Dex on localhost dev / demo only) ───────
[workspace-localhost]
default-user   = "alice"
client-id      = "workspace-local"
auth-authority = "http://localhost:5556/dex"

# ── workspace-secure-server deployment (Keycloak production-ready) ──────────
[workspace-secure-server]
keycloak-admin          = "admin"
keycloak-admin-password = "change-me"
keycloak-realm          = "dtaas"
keycloak-issuer-url     = "https://keycloak.example.com/realms/dtaas"
keycloak-client-id      = "workspace"
keycloak-client-secret  = "s3cr3t"
oauth-secret            = "random-signing-string"
client-id               = "dtaas-frontend"
auth-authority          = "https://keycloak.example.com/realms/dtaas"
```

## Validation rules

`dtaas config validate` reads `dtaas.toml` (from `--output-dir`
first, then the current directory) and reports all problems at once:

| Field | Rule |
| --- | --- |
| `git-repo` | Must be an `http(s)` URL |
| `[common].server-dns` | Must be `localhost`, an IP, or a fully qualified hostname |
| `[common].path` | Must be an absolute path to an existing directory |
| `[common.security].certs-src` | When present, must be an absolute path to an existing directory |
| `[common.resources].set_limits` | `false` turns the limits off; any other value, or no key, keeps them on |
| `[common.resources].cpus` | Positive number (e.g. `4` or `0.5`) |
| `[common.resources].pids_limit` | Integer |
| `[common.resources].mem_limit`, `shm_size` | Byte size with required unit (e.g. `4G`, `512m`) |
| `[[users]]` | When present, must be an array of tables; usernames must be unique |
| `[[users]].username` | Required, valid username |
| `[[users]].email` | Required, valid RFC 5321/5322 address (no DNS lookup) |
| `[[users]].groups` | When present, must be a list of strings |
| `[[users]].load_balance` | When present, must be `true` or `false` |
| `[[users]].password` | When present, must be a string (the starting user's initial GitLab password, used when `user add` names them) |
| `[gitlab].provision` | When present, `true` or `false` (default `false`) |
| `[gitlab].api_url` | Must be an `http(s)` URL; **required** when `provision` is `true`, optional otherwise |
| `[gitlab].pat` | When present, must be non-empty (remove the key to use `DTAAS_GITLAB_PAT`) |
| `[gitlab].ssl_verify` | When present, `true`, `false`, or a CA-bundle path string |
| Deployment-section URLs | When present, must be `http(s)` URLs |
| Deployment-section `default-user` | When present, must be a valid username |

Deployment-section URLs are `react-app-oauth-url`, `oauth-url`,
`auth-authority` and `keycloak-issuer-url` in `[frontend]`,
`[localhost]`, `[insecure-server]`, `[secure-server]`,
`[secure-server-gitlab]`, `[workspace-localhost]` and
`[workspace-secure-server]`. Each is checked only when its section is
present. `config validate` checks every section in the file, while
`platform update --config` checks only the section of the installed
deployment type, plus `[frontend]`.

`path` and `certs-src` are checked against the local filesystem, so
run `validate` on the deployment host. If a check fails with a
permission error (for example, `certs-src` under the root-owned
`/etc/letsencrypt`), the CLI prints the command to re-run with
`sudo`.

The `[common.resources]` limit fields (`cpus`, `pids_limit`,
`mem_limit`, `shm_size`) are required only when `set_limits` is
`true`, the default. With `set_limits = false` they are optional and
ignored, but any value that is present is still validated.

## Configuration substitution

When `dtaas.toml` is present, `deployment generate` substitutes its
values into the generated files. `platform update --config` repeats
the same substitution on an installed deployment. Each `--type` reads
from its matching top-level section in `dtaas.toml`. Depending on the
type, values go into the dotenv files (`config/.env`,
`config/conf.server`), the React client config (`config/client.js`,
or `config/env.local.js` for `workspace-localhost`) and the Dex
config (`config/dex-config.yaml` for `workspace-localhost`).

For the server types, the `[frontend]` section supplies
`REACT_APP_CLIENT_ID` and `REACT_APP_AUTH_AUTHORITY` for the DTaaS web
client. That is a separate OAuth application from the
traefik-forward-auth credentials in `[insecure-server]`,
`[secure-server]` and `[secure-server-gitlab]`. The redirect URIs in
`config/client.js` are built from `[common].server-dns`, and the
first two `[[users]]` records fill `USERNAME1` and `USERNAME2`.

If `dtaas.toml` is not found, the command prints a note and the
generated files keep their placeholder values.

### TLS certificate placement

For the TLS types (`secure-server`, `secure-server-gitlab`,
`workspace-secure-server`), `deployment generate` also fills the
`certs/` directory in the output. It reads
`[common.security].certs-src` from `dtaas.toml` and copies the latest
`fullchain.pem` and `privkey.pem` from there.

## User files

User management spans three files, each with a single owner. The
split follows the one Terraform makes between `.tf` and
`terraform.tfstate` files:

| File | Owner | Contents | Git |
| --- | --- | --- | --- |
| `dtaas.toml` `[[users]]` | Human, at install time | **Starting** users: one self-contained record per user (`username`, `email`, `groups`, `load_balance`, optional `password`) | Hand-edited; keep out of Git, as it can hold credentials |
| `dtaas.users.registry.json` | CLI (`user add` / `delete` / `pause` / `stop` / `resume`) | **Additional** users under `users`: the same fields, plus `desired_status` (`running`/`paused`/`stopped`) and any GitLab markers. Its `starting_users` section holds the GitLab markers alone, for starting users that `user add` has provisioned on GitLab | Tracked, CLI-written, never hand-edited |
| `.dtaas.state.json` | CLI, at provisioning time | Observed runtime facts: container id, status, provisioned-at, config hash | Ignored, runtime cache |

- **`dtaas.toml`** is written by a person and never rewritten by the
  CLI, so its comments and reviewed values stay as they are.
- **`dtaas.users.registry.json`** is a database that the CLI owns and
  updates atomically, the way `useradd` owns `/etc/passwd`. Change its
  users with `dtaas user add --file users.csv`, `delete`, `pause`,
  `stop` and `resume`, not by hand. The `users.csv` written by
  `dtaas config generate` is the bulk input for `add` and `delete`.
  `desired_status` is `running` for a user who has never been paused
  or stopped, and `user add` and `config reconcile --fix` do not start
  any user whose `desired_status` is something else.
- **`.dtaas.state.json`** is a disposable cache of what is running,
  refreshed on every add and delete. It is git-ignored and safe to
  delete.

### Checking for drift

`dtaas config reconcile` compares `dtaas.users.registry.json` (the
users who **should** be provisioned) with the live
`compose.users.yml` services (the users who **are** provisioned). It
reports **missing**, **unexpected**, **drifted**, **absent** and
**desired-status** drift; see
[`config reconcile`](cli.md#config-reconcile) for what each means.
When everything matches, it prints `In sync: no drift detected.`

Without `--fix`, the command is read-only. `--fix` reprovisions
missing and drifted users, restarts absent users' containers, and
pauses, stops or starts every provisioned user to match its
`desired_status`. It never touches **unexpected** services; remove
those with `dtaas user delete`.

Pausing or stopping a user with `dtaas user pause` or `stop` is
recorded as that user's `desired_status`. A later `reconcile` treats
the suspension as the desired state instead of reporting it as drift.

## GitLab provisioning settings

The `[gitlab]` section turns on GitLab account provisioning for
`dtaas user add`. For what the command does and prints in each case,
see [GitLab provisioning](cli.md#gitlab-provisioning-optional).

```toml
[gitlab]
provision  = true
api_url    = "https://gitlab.example.com"
# pat      = "glpat-xxxxxxxxxxxxxxxxxxxx"   # prefer DTAAS_GITLAB_PAT
# ssl_verify = "/etc/ssl/certs/corp-ca.pem" # or true (default) / false
```

| Key | Default | Meaning |
| --- | --- | --- |
| `provision` | `false` | `true` makes `user add` create each user's GitLab account and token |
| `api_url` | none | The GitLab instance; required when `provision` is `true` |
| `pat` | none | The admin token, used only when `DTAAS_GITLAB_PAT` is unset or empty |
| `ssl_verify` | `true` | `true` uses the system trust store, a path uses that CA bundle, `false` turns verification off |

### Admin token

The CLI uses `DTAAS_GITLAB_PAT` whenever it is exported and not empty,
and `[gitlab].pat` otherwise, so a rotated token needs no edit to a
`dtaas.toml` the whole installation shares. When both are set to
different tokens, a `Note:` line says the exported one is used. The
token must belong to a
GitLab administrator and carry the `api` scope, plus `admin_mode` on an
instance with Admin Mode enabled.

For a self-hosted GitLab behind an internal CA, point `ssl_verify` at
the CA bundle rather than turning it off. With `ssl_verify = false`,
the admin token and every user's initial password cross the network
without certificate checks, and the CLI prints a warning on each run.

### Initial passwords

Each new account needs an initial password. The CLI takes the first
one it finds:

1. `--password` on the command line, or the `password` column of the
   `users.csv` given with `--file`.
2. `[[users]].password` in `dtaas.toml`, for a starting user.
3. A hidden prompt, asked twice, when a single user is added.

A password is used once, to create the account. The CLI never writes it to
`dtaas.users.registry.json`, `.dtaas.state.json` or a log. A run in
which a named user has no password and no account from an earlier run
is refused before anything changes. `--password` is visible in shell
history and in the process list, so prefer the prompt, or the CSV
column with `chmod 600 users.csv` (the CLI sets that mode only on the
sample `users.csv` that `config generate` writes).

`[[users]].password` and the CSV column hold passwords in plaintext.
When a run takes a password from `dtaas.toml` or `users.csv` and that
file is readable by other users, the CLI prints a warning with the
`chmod 600` command (on Linux and macOS; Windows file modes do not say
who can read a file). Once a starting user's account exists, the CLI
also reminds you to remove their `[[users]].password`: it stays a valid
GitLab login until the user changes it.

### Files written {#gitlab-files-written}

`gitlab_user_tokens.json` holds the token issued to each user, keyed by
username. It is written to the current directory, next to `dtaas.toml`
(not to `--output-dir`), with mode `0600`, and each user's token is
added the moment it is issued:

```json
{
  "alice": "glpat-xxxxxxxxxxxxxxxxxxxx",
  "bob": "glpat-yyyyyyyyyyyyyyyyyyyy"
}
```

A run adds to the file and never rewrites the other entries. Should a
user's entry ever be replaced, the old token is kept under a
`"<username> (superseded <timestamp>)"` key and a warning says to revoke
it in GitLab if it is still active. `user delete` revokes the deleted
users' tokens on GitLab and then drops their entries; a token that could
not be revoked keeps its entry. Their GitLab accounts stay.

Before creating any account, `user add` checks that this file can be
read and written, and removes a leftover `gitlab_user_tokens.json.tmp`
from an interrupted run. A token that still cannot be saved is revoked
on GitLab at once, and the run issues no further tokens.

`dtaas.users.registry.json` records, per user, the GitLab account id
(`gitlab_user_id`) and whether a token was issued
(`gitlab_pat_issued`). That is how a re-run knows what is already done:
a user with an account id but no token gets a new token for that
account, after any token an earlier run issued but never saved is
revoked,
and a user with a token gets nothing more. Starting users carry the
same two markers in the separate `starting_users` section, since they
have no entry under `users`:

```json
{
  "users": {
    "alice": {
      "email": "alice@intocps.org",
      "groups": [
        "additional"
      ],
      "load_balance": true,
      "desired_status": "running",
      "gitlab_user_id": 42,
      "gitlab_pat_issued": true
    }
  },
  "starting_users": {
    "username1": {
      "gitlab_user_id": 7,
      "gitlab_pat_issued": true
    }
  }
}
```

`dtaas.toml`, `users.csv` and `gitlab_user_tokens.json` are gitignored
and written with mode `0600`, since they can hold the admin token, user
passwords and user tokens respectively.

The registry and `gitlab_user_tokens.json` are read and rewritten
without a lock, so run one `dtaas` command at a time per installation:
two `user add` runs at once can lose each other's changes.
