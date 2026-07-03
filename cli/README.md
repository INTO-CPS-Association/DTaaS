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

# 3. Generate dtaas.toml + a sample users.csv to fill in
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
3. [User files: dtaas.toml, registry, state](#-user-files)
4. [Configuration Reference: dtaas.toml](#️-configuration-reference--dtaastoml)

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

This writes `dtaas.toml` and a sample `users.csv` (bulk input for
`dtaas admin user add --file`) into the target directory.

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
| `[common.resources].set_limits` | When present, `true` or `false` (default `true`) |
| `[common.resources].cpus` | Positive number (e.g. `4` or `0.5`) |
| `[common.resources].pids_limit` | Integer |
| `[common.resources].mem_limit`, `shm_size` | Byte size with required unit (e.g. `4G`, `512m`) |
| `[users].starting` | When present, must be a list of strings |
| `[users.<name>].email` | Valid RFC 5321/5322 address (no DNS lookup) |
| `[users.<name>].groups` | When present, must be a list of strings |
| `[users.<name>].load_balance` | When present, must be `true` or `false` |
| Deployment-section URLs | When present, must be `http(s)` URLs |
| Deployment-section `default-user` | When present, must be a valid username |

Deployment-section URLs include `react-app-oauth-url`, `oauth-url`,
`auth-authority`, and `keycloak-issuer-url` across `[frontend]`,
`[localhost]`, `[insecure-server]`, `[secure-server]`, `[workspace-localhost]`,
and `[workspace-secure-server]`; each is checked only when its section is
present.

`path` and `certs-src` are checked against the local filesystem, run
`validate` on the deployment host.

The `[common.resources]` limit fields (`cpus`, `pids_limit`, `mem_limit`,
`shm_size`) are required only when `set_limits` is `true` (the default). With
`set_limits = false` they are optional and ignored; any value still present is
validated.

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
directories for the `[users].starting` list exist, recreating each from
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
| `users.resources.yml` | Per-user resource-limit overlay, merged in when `set_limits` is true |
| `files/template/` | Skeleton copied into each new user workspace |

> **Tip: verify the Docker image tag**
> `users.server.yml` and `users.server.secure.yml` contain a pinned workspace
> image tag (e.g. `intocps/workspace:main-967bc10`). Check
> [Docker Hub](https://hub.docker.com/r/intocps/workspace/tags) and update the
> tag to a current, stable version before deploying.

---

### ➕ `admin user add`

Provisions users on a running DTaaS instance. Additional users are recorded in
the CLI-owned `dtaas.users.registry.json`
(see [User files](#-user-files)), not in `dtaas.toml`.

**Options**

| Option | Default | Description |
|---|---|---|
| `USERNAME` | — | Add one user (requires `--email`) |
| `--file PATH` | — | Bulk-add users from a CSV |
| `--email TEXT` | — | Email for `USERNAME` (enables forward-auth routing) |
| `--group TEXT` | `additional` | Group tag for `USERNAME`; repeat the flag for multiple groups, e.g. `--group dtaas --group testers` |
| `--load-balance / --no-load-balance` | on | Mark `USERNAME` for load balancing |

Add a single user:

```bash
dtaas admin user add --email alice@intocps.org --group dtaas --load-balance alice
```

> Click accepts `--email`, `--group`, and `--load-balance` in any position
> relative to `USERNAME` the form above is the recommended convention,
> matching `useradd [options] LOGIN`.

`--group` is repeatable, not comma-separated pass it once per group to add a
user to multiple groups:

```bash
dtaas admin user add --email alice@intocps.org --group dtaas --group testers alice
```

Or bulk-add from a CSV:

```bash
dtaas admin user add --file users.csv
```

`dtaas admin config generate` writes a sample `users.csv` next to `dtaas.toml`:

```csv
username,email,groups,load_balance
alice,alice@intocps.org,additional,true
bob,bob@intocps.org,additional;beta-testers,false
```

`groups` is a `;`-separated list and `load_balance` is `true`/`false`. Both
forms merge into the registry (never hand-edited), then every registry user is
provisioned. A username already in `dtaas.toml`'s `starting` list or the
registry is **skipped with a warning** it is never added twice or overwritten.

A `USERNAME` or `--file` is required a bare `dtaas admin user add` with
neither is rejected rather than silently reprovisioning the whole registry.
To resync everyone already in the registry (e.g. after `compose.users.yml`
was lost), use `dtaas admin config reconcile --fix` instead.

**Options**

| Option | Default | Description |
|---|---|---|
| `USERNAME` | — | Add one user (requires `--email`) |
| `--file PATH` | — | Bulk-add users from a CSV |
| `--email TEXT` | — | Email for `USERNAME` (enables forward-auth routing) |
| `--group TEXT` | `additional` | Group tag for `USERNAME`; repeat the flag for multiple groups, e.g. `--group dtaas --group testers` |
| `--load-balance / --no-load-balance` | on | Mark `USERNAME` for load balancing |

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

**Resource limits (optional)**

By default each user container is created with the CPU, memory, process, and
shared-memory caps from `[common.resources]`, merged in from the
`users.resources.yml` overlay. To onboard users without any caps, set
`set_limits = false` in that section:

```toml
# Constrained users (default): limits enforced
[common.resources]
set_limits = true
cpus       = 4
mem_limit  = "4G"
pids_limit = 4960
shm_size   = "512m"
```

```toml
# Unconstrained users: no caps written, limit fields optional
[common.resources]
set_limits = false
```

The flag is read on every `user add`, so a deployment can host both constrained
and unconstrained users by toggling `set_limits` between runs.

> **Notes**
> - `user add` starts a container for a new user or restarts a stopped one; it
>   reports *Running* for containers already up without restarting them.
> - Provisioning is idempotent: re-running `user add` reprovisions every
>   registry user without duplicating work. An empty registry is a no-op.
> - Usernames may include '.', '_' and '-' (must start with a letter or digit).
>   (Whitespace, path separators, and shell metacharacters are rejected.)
> - This command does not enable AuthMS authentication.

---

### ➖ `admin user delete`

Removes one or more users from a running DTaaS instance, like `userdel`.

**Options**

| Option | Default | Description |
|---|---|---|
| `USERNAMES` | — | One or more usernames to remove |
| `--file PATH` | — | Bulk-delete users listed in a CSV (only the `username` column is used) |
| `--dry-run` | off | Preview the removal without making any changes |

Pass the usernames as arguments:

```bash
dtaas admin user delete username1 username2
```

Or bulk-delete from a CSV (the same `users.csv` format used by
`admin user add --file` other columns are ignored):

```bash
dtaas admin user delete --file users.csv
```

`USERNAMES` and `--file` are mutually exclusive, and one of them is required.

Each user is deprovisioned (its container stopped, its compose service and
forward-auth rule removed) and dropped from `dtaas.users.registry.json`. Users
that are not currently provisioned are reported and skipped, but are still
removed from the registry.

Preview a removal without making any changes with `--dry-run`:

```bash
dtaas admin user delete username1 username2 --dry-run
```

It lists which users would be deprovisioned and removed from the registry, then
exits without stopping containers or editing any file.

The CLI automatically removes the traefik-forward-auth routing rules for
deleted users from `config/conf.server`. Restart the container for the change
to take effect:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

---

### 🔍 `admin config reconcile`

Reports drift between `dtaas.users.registry.json` (who **should** be
provisioned) and the live `compose.users.yml` services (who **is**
provisioned).

```bash
dtaas admin config reconcile
```

It lists:

- **missing** registered but not currently provisioned;
- **unexpected** provisioned but not in the registry (investigate — may be a
  manual edit or a partial delete);
- **drifted** provisioned, but the live config no longer matches what
  `.dtaas.state.json` recorded when it was last provisioned.

When everything matches it prints `In sync: no drift detected.`

Without `--fix` this is read-only. Pass `--fix` to reprovision **missing** and
**drifted** users afterward (equivalent to running `dtaas admin user add`, so
it acts on the current directory, not `--output-dir`):

```bash
dtaas admin config reconcile --fix
```

**unexpected** services are never touched by `--fix` removing something
that's actually running is a deliberate action use
`dtaas admin user delete` for those.

**Options**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Installation directory to inspect |
| `--fix` | off | Reprovision missing/drifted registry users after reporting |

---

## 👥 User files

User management spans three files, each with a single owner, modelled on the
config/state split Terraform uses for `.tf` vs `terraform.tfstate`:

| File | Owner | Contents | Git |
|---|---|---|---|
| `dtaas.toml` `[users]` | Human, at install time | **Starting** users: the `starting` list plus per-user `email`, `groups`, `load_balance` | Tracked hand-edited |
| `dtaas.users.registry.json` | CLI (`user add` / `user delete`) | **Additional** users, same fields | Tracked CLI-written, never hand-edited |
| `.dtaas.state.json` | CLI, at provisioning time | Observed runtime facts: container id, status, provisioned-at, config hash | Ignored runtime cache |

- **`dtaas.toml`** is written once by a human and never rewritten by the CLI,
  so a comment-bearing, reviewed config is never silently mutated.
- **`dtaas.users.registry.json`** is a database the CLI owns and mutates
  atomically (the way `useradd` owns `/etc/passwd`). Edit its users through
  `dtaas admin user add --file users.csv` / `dtaas admin user delete`, not by
  hand. `users.csv` copied by `dtaas admin config generate` is the
  human-editable bulk input that feeds it.
- **`.dtaas.state.json`** is a disposable cache of what is actually running,
  refreshed on every add/delete. It is git-ignored and safe to delete.

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
# Enforce the limits below. Set to false to add users without any caps.
# The 4 fields are then optional and ignored. Defaults to true when omitted.
set_limits = true
cpus       = 4        # CPU cores; may be fractional, e.g. 0.5
mem_limit  = "4G"     # memory limit unit required: G, m, k …
pids_limit = 4960     # maximum number of processes per container (integer)
shm_size   = "512m"   # shared memory unit required

# ── Starting users (all deployment types) ─────────────────────────────────────
# The users installed with this instance, hand-edited once at install time.
# Additional users added later with `dtaas admin user add` live in the
# CLI-owned dtaas.users.registry.json instead — never here.
# Usernames must match GitLab accounts.
[users]
starting = ["alice", "bob"]

# Per-user email enables traefik-forward-auth routing rules automatically;
# groups/load_balance carry per-user tags.
[users.alice]
email        = "alice@example.com"
groups       = ["default", "dtaas"]
load_balance = true

[users.bob]
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
