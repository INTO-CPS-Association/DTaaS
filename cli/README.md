# DTaaS Command Line Interface

Command-line tool for the
[INTO-CPS-Association](https://github.com/INTO-CPS-Association/DTaaS)
Digital Twin as a Service platform. Use it to generate deployment projects,
manage users, and operate a running DTaaS instance.  All from a single `dtaas`
entry point.

---

## ⚡ Quick Start

From a clean machine to a running DTaaS deployment in seven steps.

```bash
# 1. Create and activate a virtual environment (recommended)
python -m venv .venv && source .venv/bin/activate   # Linux / macOS
# python -m venv .venv && .venv\Scripts\activate    # Windows

# 2. Install the package
pip install dtaas

# 3. Generate a dtaas.toml configuration template
dtaas admin config generate

# 4. Open dtaas.toml and fill in your server DNS, paths, and credentials
#    (see Configuration Reference below for all fields)

# 5. Validate the configuration fix any reported errors before continuing
dtaas admin config validate

# 6. Generate deployment files for your chosen scenario
dtaas generate-deployment --type secure-server

# 7. Bring the deployment up
dtaas admin install

# Tear it down when done
dtaas admin uninstall
```

> **Deployment type cheat-sheet**
>
> | `--type` | When to use |
> |---|---|
> | `localhost` | Local dev / demo only |
> | `insecure-server` | Multi-user HTTP demo — **not internet-facing** |
> | `secure-server` | Multi-user HTTPS — production-ready |
> | `secure-server-gitlab` | HTTPS + bundled GitLab — production-ready |
> | `workspace-localhost` | Workspace + Dex on localhost |
> | `workspace-secure-server` | Workspace + Keycloak — production-ready |

---

## 📋 Table of Contents

1. [Installation](#-installation)
2. [Commands](#-commands)
   - [admin config generate / validate](#️-admin-config) ← start here
   - [generate-deployment](#generate-deployment)
   - [admin install](#-admin-install)
   - [admin uninstall](#-admin-uninstall)
   - [admin update --certs](#-admin-update---certs)
   - [admin update --config](#-admin-update---config)
   - [generate-project](#generate-project)
   - [admin user add](#-admin-user-add)
   - [admin user delete](#-admin-user-delete)
3. [Configuration Reference: dtaas.toml](#️-configuration-reference--dtaastoml)

---

## 📦 Installation

Installation inside a virtual environment is strongly recommended to avoid
conflicts with system-wide packages.

```bash
python -m venv .venv
source .venv/bin/activate     # Linux / macOS
# .venv\Scripts\activate      # Windows

pip install dtaas
```

Verify the install:

```bash
dtaas --help
```

---

## 🛠 Commands

### 🗒️ `admin config`

Manage `dtaas.toml` independently of the rest of the project. This is the
first step in the setup workflow generate a template, fill it in, then
validate before running any other command.

**Generate a fresh template**

```bash
dtaas admin config generate
```

**Validate an existing file**

```bash
dtaas admin config validate
```

`validate` reads `dtaas.toml` (from `--output-dir` first, then the current
directory) and reports all problems at once:

| Field | Rule |
|---|---|
| `git-repo` | Must be an `http(s)` URL |
| `[common].server-dns` | Must be `localhost`, an IP, or a fully qualified hostname |
| `[common].path` | Must be an absolute path to an existing directory |
| `[common.security].certs-src` | When present, must be an absolute path to an existing directory |
| `[common.resources].cpus` | Positive number (e.g. `4` or `0.5`) |
| `[common.resources].pids_limit` | Integer |
| `[common.resources].mem_limit`, `shm_size` | Byte size with required unit (e.g. `4G`, `512m`) |
| `[users].add`, `[users].delete` | When present, must be lists of strings |
| `[users.<name>].email` | Valid RFC 5321/5322 address (no DNS lookup) |
| Deployment-section URLs | When present, must be `http(s)` URLs |
| Deployment-section `default-user` | When present, must be a valid username |

Deployment-section URLs include `react-app-oauth-url`, `oauth-url`,
`auth-authority`, and `keycloak-issuer-url` across `[frontend]`,
`[localhost]`, `[insecure-server]`, `[secure-server]`, `[workspace-localhost]`,
and `[workspace-secure-server]`; each is checked only when its section is
present.

`path` and `certs-src` are checked against the local filesystem, run
`validate` on the deployment host.

**Options**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | For `generate`: target directory (created if missing). For `validate`: search location |
| `--force` | off | (`generate` only) Overwrite an existing `dtaas.toml` |

---

### `generate-deployment`

Copies the full project structure for a specific deployment scenario
`docker-compose.yml`, config examples, and supporting files, into a target
directory ready to be customised.

```bash
dtaas generate-deployment --type <name>
```

**Options**

| Option | Default | Description |
|---|---|---|
| `--type NAME` | *(required)* | Deployment scenario (see table below) |
| `--output-dir PATH` | `.` | Target directory (must already exist) |
| `--force` | off | Overwrite files that already exist |

**Available types**

| `--type` | Deployment scenario | Support level |
|---|---|---|
| `localhost` | Single-machine Docker deployment | dev/demo only |
| `insecure-server` | Multi-user HTTP server | insecure/demo only |
| `secure-server` | Multi-user HTTPS/TLS server | **production-supported** |
| `secure-server-gitlab` | HTTPS/TLS + integrated GitLab | **production-supported** |
| `workspace-localhost` | Workspace service with Dex on localhost | dev/demo only |
| `workspace-secure-server` | Workspace service with Keycloak | **production-supported** |

> ⚠️ **Warning** Types marked *dev/demo only* or *insecure/demo only* run
> over plain HTTP with default or static credentials. **Do not expose them to
> the internet or shared networks.** Production-supported types still require
> manual hardening steps documented in the `README.md` and `CONFIGURATION.md`
> shipped with each generated project.

**Examples**

```bash
# Localhost demo in the current directory
dtaas generate-deployment --type localhost

# Production HTTPS server in a subdirectory
dtaas generate-deployment --type secure-server --output-dir ./my-server

# Regenerate, overwriting existing files
dtaas generate-deployment --type insecure-server --output-dir ./demo --force
```

#### Configuration substitution

When `dtaas.toml` is present, `generate-deployment` reads
deployment-specific values from it and substitutes them into the generated
files automatically.

The CLI searches `--output-dir` first, then falls back to the current working
directory. Each `--type` reads from its matching top-level section in
`dtaas.toml`. Values are written into dotenv files (`config/.env`,
`config/conf.server`) and the React client config (`config/client.js`).

The `[frontend]` section supplies `REACT_APP_CLIENT_ID` and
`REACT_APP_AUTH_AUTHORITY` for the DTaaS web client, these are a separate
OAuth application from the traefik-forward-auth credentials configured in
`[insecure-server]` / `[secure-server]`. The `[common]` and `[users]`
sections are substituted across all types.

If `dtaas.toml` is not found, a note is printed and generated files keep
their default placeholder values.

#### TLS certificate placement

For the TLS types (`secure-server`, `secure-server-gitlab`,
`workspace-secure-server`), `generate-deployment` also populates the
`certs/` directory in the output. It reads `[common.security].certs-src` from
`dtaas.toml` and copies the latest `fullchain.pem` and `privkey.pem` there.

---

### 🚀 `admin install`

Brings a generated deployment up with a single command.

```bash
dtaas admin install
```

Internally runs `docker compose up -d` against the `docker-compose.yml` in
the installation directory. Before starting, it ensures per-user workspace
directories listed in `[users].add` exist, recreating each from
`files/template/` if missing and sets ownership to `1000:100`.

**Options**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Installation directory containing the generated deployment |

The CLI looks for `dtaas.toml` in `--output-dir` first, then the current
working directory, so a single top-level `dtaas.toml` can serve a deployment
generated into a subdirectory:

```bash
dtaas admin install --output-dir ./insecure
```

The command fails with a clear error if `docker-compose.yml` is missing,
`dtaas.toml` cannot be found, or the Docker daemon is unreachable.

---

### 🧹 `admin uninstall`

Tears the deployment down, stopping and removing containers and networks.

```bash
dtaas admin uninstall
```

User containers added with `admin user add` run as a separate Compose project;
they are torn down first so they do not hold the shared network open.
**Per-user workspace files are preserved by default.**

To also delete the generated per-user workspace directories:

```bash
dtaas admin uninstall --remove-user-files
```

This is destructive, so the command prompts for confirmation. Skip the prompt
in non-interactive scripts with `--yes`:

```bash
dtaas admin uninstall --remove-user-files --yes
```

**Options**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Installation directory |
| `--remove-user-files` | off | Also delete per-user workspace directories |
| `--yes` / `-y` | off | Skip the confirmation prompt for `--remove-user-files` |

> `--remove-user-files` removes only the per-user directories inside
> `<output-dir>/files/`, preserving `files/common/` and `files/template/` so
> a later `admin install` can recreate user directories. It refuses to follow
> a symlinked `files/`. Double-check `--output-dir` before using this flag.

---

### 🔁 `admin update --certs`

Rotates TLS certificates of a running deployment in place — no project
regeneration or manual file copying required.

```bash
dtaas admin update --certs
```

The command reads `[common.security].certs-src` from `dtaas.toml`, then:

1. **Validates** the new certificate pair (parseable, private key matches cert,
   no expired intermediates).
2. **Stops** the `traefik` service to release open file handles.
3. **Swaps** the validated files into `<output-dir>/certs/`, backing up the
   live pair and restoring it on any failure.
4. **Restricts** the private key to `0600` (POSIX; prints a warning on Windows).
5. **Restarts** `traefik` and waits for it to come back up.

If validation fails, live certificates are left untouched. The command is safe
to run repeatedly.

**Options**

| Option | Default | Description |
|---|---|---|
| `--certs` | *(required)* | Refresh the deployment's TLS certificates |
| `--output-dir PATH` | `.` | Installation directory |

---

### 🧩 `admin update --config`

Re-applies the values in `dtaas.toml` to an already-installed deployment's
service config files without regenerating the project.

```bash
dtaas admin update --config
```

Treats `dtaas.toml` as the single source of truth, re-runs the same
substitution as `generate-deployment`, and if anything changed, recreates all
deployment services with `docker compose up -d --force-recreate`. The
deployment type is auto-detected from `docker-compose.yml`.

```bash
# Preview changes without writing or restarting
dtaas admin update --config --dry-run

# Apply changes and restart
dtaas admin update --config

# Update a deployment in a subdirectory
dtaas admin update --config --output-dir ./my-server
```

`--config` validates `dtaas.toml` before making any changes and refuses to
apply if problems are found. It is **idempotent** a second run with no
`dtaas.toml` changes reports `No configuration changes` and restarts nothing.

**Options**

| Option | Default | Description |
|---|---|---|
| `--config` | *(required)* | Re-apply `dtaas.toml` to installed service config files |
| `--dry-run` | off | Report what would change without writing or restarting |
| `--output-dir PATH` | `.` | Installation directory |

> `--certs` and `--config` may be combined in a single invocation.

---

### `generate-project`

Scaffolds `dtaas.toml`, Docker Compose user-workspace templates, and the
`files/template/` directory into your working directory.

```bash
dtaas generate-project
```

**Options**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Target directory (must already exist) |
| `--force` | off | Overwrite files that already exist |

**Generated files**

| Item | Purpose |
|---|---|
| `dtaas.toml` | Main CLI configuration |
| `users.server.yml` | Docker Compose template for HTTP deployments |
| `users.server.secure.yml` | Docker Compose template for HTTPS/TLS deployments |
| `files/template/` | Skeleton copied into each new user workspace |

> **Tip: verify the Docker image tag**
> `users.server.yml` and `users.server.secure.yml` contain a pinned workspace
> image tag (e.g. `intocps/workspace:main-967bc10`). Check
> [Docker Hub](https://hub.docker.com/r/intocps/workspace/tags) and update the
> tag to a current, stable version before deploying.

---

### ➕ `admin user add`

Adds one or more users to a running DTaaS instance.

Edit `dtaas.toml` to list the GitLab usernames to add:

```toml
[users]
add = ["username1", "username2", "username3"]
```

Then run from the directory containing `dtaas.toml`:

```bash
dtaas admin user add
```

For each username the CLI checks whether `files/<username>/` already exists.
If not, a new directory with the correct structure is created from
`files/template/`. The directory, if it already exists, must be owned by the
user running the `dtaas` command; otherwise the command fails.

When an `email` is provided for a user in `dtaas.toml`, the CLI automatically
adds a traefik-forward-auth routing rule to `config/conf.server`. Restart
the container for the change to take effect:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

> **Notes**
> - `user add` starts a container for a new user or restarts a stopped one; it
>   reports *Running* for containers already up without restarting them.
> - Returns an error if the `add` list is empty.
> - Usernames containing `.` cannot currently be added via the CLI (known
>   issue; to be resolved in a future release).
> - This command does not enable AuthMS authentication.

---

### ➖ `admin user delete`

Removes users from a running DTaaS instance.

Edit `dtaas.toml` to list the GitLab usernames to remove:

```toml
[users]
delete = ["username1", "username2", "username3"]
```

Then run from the directory containing `dtaas.toml`:

```bash
dtaas admin user delete
```

The CLI automatically removes the traefik-forward-auth routing rules for
deleted users from `config/conf.server`. Restart the container for the change
to take effect:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

> Returns an error if the `delete` list is empty.

---

## ⚙️ Configuration Reference `dtaas.toml`

`dtaas.toml` is the single source of truth for all CLI commands. Generate a
blank template with `dtaas admin config generate`, fill it in, then confirm
it is valid with `dtaas admin config validate` before running any other command.

### Which sections does my deployment need?

Required ✅

Optional ○

Not-Used —

**Server deployments**

| Section | `localhost` | `insecure-server` | `secure-server` | `secure-server-gitlab` |
|---|:---:|:---:|:---:|:---:|
| `[common]` | ✅ | ✅ | ✅ | ✅ |
| `[common.security]` | — | — | ✅ | ✅ |
| `[common.resources]` | ○ | ○ | ○ | ○ |
| `[users]` | ✅ | ✅ | ✅ | ✅ |
| `[frontend]` | — | ✅ | ✅ | ✅ |
| `[localhost]` | ✅ | — | — | — |
| `[insecure-server]` | — | ✅ | — | — |
| `[secure-server]` | — | — | ✅ | — |
| `[secure-server-gitlab]` | — | — | — | ✅ |

**Workspace deployments**

| Section | `workspace-localhost` | `workspace-secure-server` |
|---|:---:|:---:|
| `[common]` | ✅ | ✅ |
| `[common.security]` | — | ✅ |
| `[common.resources]` | ○ | ○ |
| `[users]` | ✅ | ✅ |
| `[workspace-localhost]` | ✅ | — |
| `[workspace-secure-server]` | — | ✅ |

### Annotated `dtaas.toml`

The full file below shows every possible key with inline comments. Copy it
as a starting point and delete sections that do not apply to your deployment
type (see matrix above).

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
cpus       = 4        # CPU cores; may be fractional, e.g. 0.5
mem_limit  = "4G"     # memory limit — unit required: G, m, k …
pids_limit = 4960     # maximum number of processes per container (integer)
shm_size   = "512m"   # shared memory — unit required

# ── User list (all deployment types) ──────────────────────────────────────────
# Usernames must match GitLab accounts on the configured instance.
# Note: usernames containing "." are not yet supported.
[users]
add    = ["alice", "bob"]   # provisioned on: dtaas admin user add
delete = []                 # removed on:      dtaas admin user delete

# Per-user email: enables traefik-forward-auth routing rules automatically.
[users.alice]
email = "alice@example.com"

[users.bob]
email = "bob@example.com"

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
