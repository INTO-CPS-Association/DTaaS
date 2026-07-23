# CLI Configuration Reference

This page is the complete reference for `dtaas.toml`, the single
source of truth for all DTaaS CLI commands. Generate a blank template
with `dtaas admin config generate`, fill it in, then confirm it is
valid with `dtaas admin config validate` before running any other
command. The installation workflow itself is covered in
[Install with DTaaS CLI](cli.md).

## 🧭 Which Sections Does My Deployment Need?

Required ✅ &nbsp; Optional ○ &nbsp; Not-Used —

### 🖥️ Server Deployments

| Section | `localhost` | `insecure-server` | `secure-server` | `secure-server-gitlab` |
| --- | :---: | :---: | :---: | :---: |
| `[common]` | ✅ | ✅ | ✅ | ✅ |
| `[common.security]` | — | — | ✅ | ✅ |
| `[common.resources]` | ○ | ○ | ○ | ○ |
| `[[users]]` | ✅ | ✅ | ✅ | ✅ |
| `[frontend]` | — | ✅ | ✅ | ✅ |
| `[localhost]` | ✅ | — | — | — |
| `[insecure-server]` | — | ✅ | — | — |
| `[secure-server]` | — | — | ✅ | — |
| `[secure-server-gitlab]` | — | — | — | ✅ |

### 🧑‍💻 Workspace Deployments

| Section | `workspace-localhost` | `workspace-secure-server` |
| --- | :---: | :---: |
| `[common]` | ✅ | ✅ |
| `[common.security]` | — | ✅ |
| `[common.resources]` | ○ | ○ |
| `[[users]]` | ✅ | ✅ |
| `[workspace-localhost]` | ✅ | — |
| `[workspace-secure-server]` | — | ✅ |

## 📄 Annotated `dtaas.toml`

The full file below shows every possible key with inline comments.
Copy it as a starting point and delete sections that do not apply to
your deployment type (see matrix above).

```toml
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
# Used by generate-deployment (seeds certs/) and admin update --certs.
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
# lists. Additional users added later with `dtaas admin user add` live in the
# CLI-owned dtaas.users.registry.json instead.
# Usernames must match GitLab accounts and be unique across the array.
#
# email enables traefik-forward-auth routing rules automatically;
# groups/load_balance carry per-user tags. password is optional (used by
# future GitLab-provisioning onboarding); avoid committing a real secret
# here; prefer supplying it at runtime instead.
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

# ── React web client OAuth app (insecure-server, secure-server,
#                                secure-server-gitlab) ────────────────────────
# This is a SEPARATE OAuth application from the traefik-forward-auth app
# configured in [insecure-server] / [secure-server] below.
# Redirect URI: https://<server-dns>/signin-oidc
[frontend]
react-app-client-id = "dtaas-client"
react-app-oauth-url = "https://gitlab.example.com"

# ── localhost deployment (dev / demo only) ────────────────────────────────────
[localhost]
default-user   = "alice"
client-id      = "dtaas-local"
auth-authority = "https://dex.example.com"

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
# oauth-url is omitted; it is derived from the bundled GitLab service.
[secure-server-gitlab]
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

## ✅ Validation Rules

`dtaas admin config validate` reads `dtaas.toml` (from `--output-dir`
first, then the current directory) and reports all problems at once:

| Field | Rule |
| --- | --- |
| `git-repo` | Must be an `http(s)` URL |
| `[common].server-dns` | Must be `localhost`, an IP, or a fully qualified hostname |
| `[common].path` | Must be an absolute path to an existing directory |
| `[common.security].certs-src` | When present, must be an absolute path to an existing directory |
| `[common.resources].set_limits` | When present, `true` or `false` (default `true`) |
| `[common.resources].cpus` | Positive number (e.g. `4` or `0.5`) |
| `[common.resources].pids_limit` | Integer |
| `[common.resources].mem_limit`, `shm_size` | Byte size with required unit (e.g. `4G`, `512m`) |
| `[[users]]` | When present, must be an array of tables; usernames must be unique |
| `[[users]].username` | Required, valid username |
| `[[users]].email` | Required, valid RFC 5321/5322 address (no DNS lookup) |
| `[[users]].groups` | When present, must be a list of strings |
| `[[users]].load_balance` | When present, must be `true` or `false` |
| `[[users]].password` | When present, must be a string |
| Deployment-section URLs | When present, must be `http(s)` URLs |
| Deployment-section `default-user` | When present, must be a valid username |

Deployment-section URLs include `react-app-oauth-url`, `oauth-url`,
`auth-authority`, and `keycloak-issuer-url` across `[frontend]`,
`[localhost]`, `[insecure-server]`, `[secure-server]`,
`[workspace-localhost]`, and `[workspace-secure-server]`; each is
checked only when its section is present.

`path` and `certs-src` are checked against the local filesystem, so
run `validate` on the deployment host.

The `[common.resources]` limit fields (`cpus`, `pids_limit`,
`mem_limit`, `shm_size`) are required only when `set_limits` is
`true` (the default). With `set_limits = false` they are optional and
ignored; any value still present is validated.

## 🔀 Configuration Substitution

When `dtaas.toml` is present, `generate-deployment` reads
deployment-specific values from it and substitutes them into the
generated files automatically. Each `--type` reads from its matching
top-level section in `dtaas.toml`. Values are written into dotenv
files (`config/.env`, `config/conf.server`) and the React client
config (`config/client.js`).

The `[frontend]` section supplies `REACT_APP_CLIENT_ID` and
`REACT_APP_AUTH_AUTHORITY` for the DTaaS web client; these are a
separate OAuth application from the traefik-forward-auth credentials
configured in `[insecure-server]` / `[secure-server]`. The `[common]`
and `[[users]]` sections are substituted across all types.

If `dtaas.toml` is not found, a note is printed and generated files
keep their default placeholder values.

### 🔐 TLS Certificate Placement

For the TLS types (`secure-server`, `secure-server-gitlab`,
`workspace-secure-server`), `generate-deployment` also populates the
`certs/` directory in the output. It reads
`[common.security].certs-src` from `dtaas.toml` and copies the latest
`fullchain.pem` and `privkey.pem` there.

## 👥 User Files

User management spans three files, each with a single owner, modelled
on the config/state split Terraform uses for `.tf` vs
`terraform.tfstate`:

| File | Owner | Contents | Git |
| --- | --- | --- | --- |
| `dtaas.toml` `[[users]]` | Human, at install time | **Starting** users: one self-contained record per user (`username`, `email`, `groups`, `load_balance`) | Tracked, hand-edited |
| `dtaas.users.registry.json` | CLI (`user add` / `delete` / `pause` / `stop` / `resume`) | **Additional** users: the same fields, plus `desired_status` (`running`/`paused`/`stopped`) | Tracked, CLI-written, never hand-edited |
| `.dtaas.state.json` | CLI, at provisioning time | Observed runtime facts: container id, status, provisioned-at, config hash | Ignored, runtime cache |

- **`dtaas.toml`** is written once by a human and never rewritten by
  the CLI, so a comment-bearing, reviewed config is never silently
  mutated.
- **`dtaas.users.registry.json`** is a database the CLI owns and
  mutates atomically (the way `useradd` owns `/etc/passwd`). Edit its
  users through `dtaas admin user add --file users.csv` / `delete` /
  `pause` / `stop` / `resume`, not by hand. `users.csv` copied by
  `dtaas admin config generate` is the human-editable bulk input that
  feeds `add`/`delete`. `desired_status` defaults to `running` for a
  user who has never been paused or stopped, and `user add` /
  `config reconcile --fix` skip starting any user whose
  `desired_status` is not `running`.
- **`.dtaas.state.json`** is a disposable cache of what is actually
  running, refreshed on every add/delete. It is git-ignored and safe
  to delete.

### 🔍 Checking for Drift

`dtaas admin config reconcile` reports drift between
`dtaas.users.registry.json` (which **should** be provisioned) and the
live `compose.users.yml` services (which **are** provisioned). It lists:

- **missing** — registered but not currently provisioned;
- **unexpected** — provisioned but not in the registry (investigate:
  may be a manual edit or a partial delete);
- **drifted** — provisioned, but the live config no longer matches
  what `.dtaas.state.json` recorded when it was last provisioned;
- **desired-status drift** — provisioned, but the live container
  state does not match the user's registry `desired_status` (e.g.
  `desired 'paused' but container is 'running'`).

When everything matches, it prints `In sync: no drift detected.`
Without `--fix`, this is read-only. Pass `--fix` to reprovision
**missing** and **drifted** users, and to pause/stop/start every
provisioned user to match its `desired_status`; **unexpected**
services are never touched by `--fix` — use `dtaas admin user delete`
for those.

Suspending a user with `dtaas admin user pause`/`stop` is intentional
and durable: it is reflected as that user's `desired_status`, so a
later `reconcile` treats the suspension as the desired state instead
of reporting it as drift.
