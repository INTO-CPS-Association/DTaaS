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
> | `insecure-server` | Multi-user HTTP demo: **not internet-facing** |
> | `secure-server` | Multi-user HTTPS: production-ready |
> | `secure-server-gitlab` | HTTPS + bundled GitLab: production-ready |
> | `workspace-localhost` | Workspace + Dex on localhost |
> | `workspace-secure-server` | Workspace + Keycloak: production-ready |

---

## 📋 Table of Contents

- [DTaaS Command Line Interface](#dtaas-command-line-interface)
  - [⚡ Quick Start](#-quick-start)
  - [📋 Table of Contents](#-table-of-contents)
  - [📦 Installation](#-installation)
  - [🛠 Commands](#-commands)
    - [🗒️ `admin config`](#️-admin-config)
    - [`generate-deployment`](#generate-deployment)
      - [Configuration substitution](#configuration-substitution)
      - [TLS certificate placement](#tls-certificate-placement)
    - [🚀 `admin install`](#-admin-install)
    - [🧹 `admin uninstall`](#-admin-uninstall)
    - [Lifecycle operations: `status` / `stop` / `start` / `pause` / `resume`](#lifecycle-operations)
    - [🔁 `admin update --certs`](#-admin-update---certs)
    - [🧩 `admin update --config`](#-admin-update---config)
    - [`generate-project`](#generate-project)
    - [➕ `admin user add`](#-admin-user-add)
    - [➖ `admin user delete`](#-admin-user-delete)
    - [⏯️ `admin user pause` / `stop` / `resume`](#️-admin-user-pause--stop--resume)
    - [🔍 `admin config reconcile`](#-admin-config-reconcile)
  - [👥 User files](#-user-files)
  - [⚙️ Configuration Reference `dtaas.toml`](#️-configuration-reference-dtaastoml)
    - [Which sections does my deployment need?](#which-sections-does-my-deployment-need)
    - [Annotated `dtaas.toml`](#annotated-dtaastoml)

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
`[localhost]`, `[insecure-server]`, `[secure-server]`, `[workspace-localhost]`,
and `[workspace-secure-server]`; each is checked only when its section is
present.

`path` and `certs-src` are checked against the local filesystem, run
`validate` on the deployment host.

The `[common.resources]` limit fields (`cpus`, `pids_limit`, `mem_limit`,
`shm_size`) are required only when `set_limits` is `true` (the default). With
`set_limits = false` they are optional and ignored; any value still present is
validated.

**Options:**

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

**Options:**

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

**Examples:**

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
`[insecure-server]` / `[secure-server]`. The `[common]` and `[[users]]`
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
directories for every `[[users]]` record exist, recreating each from
`files/template/` if missing and sets ownership to `1000:100`.

**Options:**

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

To also delete the generated per-user workspace directories **and** the
CLI-owned `dtaas.users.registry.json` / `.dtaas.state.json`:

```bash
dtaas admin uninstall --remove-user-files
```

This is destructive, so the command prompts for confirmation. Skip the prompt
in non-interactive scripts with `--yes`:

```bash
dtaas admin uninstall --remove-user-files --yes
```

**Options:**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Installation directory |
| `--remove-user-files` | off | Also delete per-user workspace dirs + registry/state files |
| `--yes` / `-y` | off | Skip the confirmation prompt for `--remove-user-files` |

> `--remove-user-files` removes only the per-user directories inside
> `<output-dir>/files/`, preserving `files/common/` and `files/template/` so
> a later `admin install` can recreate user directories. It refuses to follow
> a symlinked `files/`. Double-check `--output-dir` before using this flag.

---

### Lifecycle operations

Operational controls for an **already-installed** deployment: observe it with
`status`, and suspend or resume it with `stop`/`start` and `pause`/`resume`.
None of these remove containers or networks, that is `uninstall`'s job. Each
command targets both the main deployment and any user-added workloads
(`compose.users.yml`), and exits `0` on success (including the idempotent
"nothing installed" case) and non-zero on failure, so they are safe to call
from CI/ops scripts.

`stop`/`start`/`pause`/`resume` act on the main deployment first, then
user-added workloads. If the second project fails after the first already
succeeded, there is no rollback, re-run the same command: each project's
compose command is idempotent, so retrying repeats a harmless no-op against
whichever project already changed and retries the one that failed.

**Lifecycle command matrix:**

| Command | `docker compose` verb | Effect | Containers kept? | Reverse with |
|---|---|---|:---:|---|
| `admin install` | `up -d` | Create and start every service | n/a | `admin stop` / `admin uninstall` |
| `admin status` | `ps` (read-only) | Report per-service state; no change | n/a | n/a |
| `admin stop` | `stop` | Terminate the processes, keep the containers | yes | `admin start` |
| `admin start` | `start` | Start previously stopped containers | yes | `admin stop` |
| `admin pause` | `pause` | Freeze the processes (memory preserved) | yes | `admin resume` |
| `admin resume` | `unpause` | Thaw previously paused processes | yes | n/a |
| `admin uninstall` | `down` | Stop **and remove** containers and networks | no | `admin install` |

> **`stop` vs `pause`.** `stop` sends `SIGTERM`/`SIGKILL`: processes end, and a
> restart re-runs them from scratch (reverse with `admin start`). `pause` uses
> the kernel cgroup freezer: processes are suspended in place with their memory
> intact and resume instantly (reverse with `admin resume`), but a paused
> container still holds its resources. Use `stop` to free CPU; use `pause` for
> a brief, instantly reversible suspension. `pause` expects running containers
> and will error if the deployment is already stopped.

#### 📊 `admin status`

Reports the state of every service, for both the deployment and user
workloads.

```bash
dtaas admin status
```

```text
PROJECT     SERVICE            STATE        HEALTH
deployment  traefik            running      healthy
deployment  client             running      -
deployment  gitlab             not created  -
users       user-alice         paused       -
```

State values are `running`, `paused`, `stopped` (a terminated container, what
Docker calls `exited`), `restarting`, or `not created` (a service defined in
`docker-compose.yml` that has no container yet). `HEALTH` shows the container
healthcheck status, or `-` when the service has none.

For automation, `--json` emits the same records as machine-readable JSON:

```bash
dtaas admin status --json
```

```json
[
  {"project": "deployment", "service": "traefik", "state": "running", "health": "healthy"}
]
```

**Options:**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Installation directory |
| `--json` | off | Emit machine-readable JSON instead of the table |

#### ⏹️ `admin stop` / ▶️ `admin start`

`stop` stops all services with `docker compose stop`; `start` brings the
stopped containers back with `docker compose start`. Containers and networks
are **kept**, so `stop` is not an uninstall.

```bash
dtaas admin stop
dtaas admin start
```

Both report `no existing DTaaS / Workspace installation` and exit `0` when
nothing is installed (no containers in any state), so they are safe to call
repeatedly.

**Options:**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Installation directory |

#### ⏸️ `admin pause` / ▶️ `admin resume`

`pause` freezes every running container in place with `docker compose pause`;
`resume` thaws them with `docker compose unpause`. Memory is preserved and
resume is near-instant.

```bash
dtaas admin pause
dtaas admin resume
```

Both report the absent-installation case and exit `0` when nothing is
installed (no containers in any state).

**Options:**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Installation directory |

---

### 🔁 `admin update --certs`

Rotates TLS certificates of a running deployment in place: no project
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

**Options:**

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

**Options:**

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

**Options:**

| Option | Default | Description |
|---|---|---|
| `--output-dir PATH` | `.` | Target directory (must already exist) |
| `--force` | off | Overwrite files that already exist |

**Generated files:**

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

**Options:**

| Option | Default | Description |
|---|---|---|
| `USERNAME` | — | Add one user (requires `--email`) |
| `--file PATH` / `-f` | — | Bulk-add users from a CSV |
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
forms merge into the registry (never hand-edited) with `desired_status` set to
`running`, then **only the newly-added users are started** — already-running
users are left untouched, so adding one user never recreates the rest. A
username already declared in `dtaas.toml`'s `[[users]]` or the registry is
**skipped with a warning**: it is never added twice or overwritten.

A `USERNAME` or `--file` is required (not both) — a bare `dtaas admin user add`
with neither is rejected rather than silently reprovisioning the whole
registry. To (re)provision **every** registry user at once (e.g. after
`compose.users.yml` was lost), use `dtaas admin config reconcile --fix`
instead.

**Options:**

| Option | Default | Description |
|---|---|---|
| `USERNAME` | — | Add one user (requires `--email`) |
| `--file PATH` / `-f` | — | Bulk-add users from a CSV |
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
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
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
>
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

**Options:**

| Option | Default | Description |
|---|---|---|
| `USERNAMES` | — | One or more usernames to remove |
| `--file PATH` / `-f` | — | Bulk-delete users listed in a CSV (only the `username` column is used) |
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
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

---

### ⏯️ `admin user pause` / `stop` / `resume`

Suspend or resume **specific additional (registry) users** without touching
the rest of the installation, targeting one or more `USERNAMES` or a
`--file`/`-f users.csv` (only the `username` column is read), the same way
`admin user delete` does.

```bash
dtaas admin user pause alice bob
dtaas admin user stop alice
dtaas admin user resume alice bob
dtaas admin user pause --file users.csv
```

| Command | `docker compose` verb | Effect | Reverse with |
|---|---|---|---|
| `admin user pause` | `pause` | Freeze the named users' containers (memory preserved) | `admin user resume` |
| `admin user stop` | `stop` | Terminate the named users' containers, keep them | `admin user resume` |
| `admin user resume` | `unpause` or `start`, as needed | Thaw a paused user, or restart a stopped one | — |

Each command also writes a `desired_status` (`"paused"`/`"stopped"`/`"running"`)
into `dtaas.users.registry.json` for the users it acted on. This is what makes
the suspension durable: a later `dtaas admin user add` (which idempotently
re-provisions every registry user on every run) or `dtaas admin config
reconcile --fix` checks `desired_status` and will **not** silently restart a
user you paused or stopped. Only `admin user resume` (or hand-editing the
registry) clears it back to `"running"`.

Only additional users can be targeted here. Naming a `dtaas.toml` starting
user is rejected with an error: suspend or resume the whole installation
(starting users included) with [`dtaas admin pause`/`stop`/`resume`](#lifecycle-operations)
instead.

A username not found in the registry, or found but not currently provisioned
(e.g. `user add` was never run for them), is reported and skipped rather than
aborting the whole batch:

```text
'carol' is not a registered user, skipping
alice, bob paused successfully
```

**Options:**

| Option | Default | Description |
|---|---|---|
| `USERNAMES` | — | One or more usernames to target |
| `--file PATH` / `-f` | — | Bulk-target users listed in a CSV (only the `username` column is used) |

---

### 🔍 `admin config reconcile`

Reports drift between `dtaas.users.registry.json` (which **should** be
provisioned) and the live `compose.users.yml` services (which **are**
provisioned).

```bash
dtaas admin config reconcile
```

It lists:

- **missing** registered but not currently provisioned;
- **unexpected** provisioned but not in the registry (investigate: may be a
  manual edit or a partial delete);
- **drifted** provisioned, but the live config no longer matches what
  `.dtaas.state.json` recorded when it was last provisioned;
- **desired-status drift** provisioned, but the live container state does not
  match the user's registry `desired_status` (e.g. `desired 'paused' but
  container is 'running'`).

When everything matches, it prints `In sync: no drift detected.`

Without `--fix`, this is read-only. Pass `--fix` to reprovision **missing** and
**drifted** users and to pause/stop/start every provisioned user to match its
`desired_status` (equivalent to running `dtaas admin user add`, so it acts on
the current directory, not `--output-dir`):

```bash
dtaas admin config reconcile --fix
```

**unexpected** services are never touched by `--fix` removing something
that's actually running is a deliberate action use
`dtaas admin user delete` for those.

**Options:**

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
| `dtaas.toml` `[[users]]` | Human, at install time | **Starting** users: one self-contained record per user (`username`, `email`, `groups`, `load_balance`) | Tracked hand-edited |
| `dtaas.users.registry.json` | CLI (`user add` / `delete` / `pause` / `stop` / `resume`) | **Additional** users: the same fields, plus `desired_status` (`running`/`paused`/`stopped`) | Tracked CLI-written, never hand-edited |
| `.dtaas.state.json` | CLI, at provisioning time | Observed runtime facts: container id, status, provisioned-at, config hash | Ignored runtime cache |

- **`dtaas.toml`** is written once by a human and never rewritten by the CLI,
  so a comment-bearing, reviewed config is never silently mutated.
- **`dtaas.users.registry.json`** is a database the CLI owns and mutates
  atomically (the way `useradd` owns `/etc/passwd`). Edit its users through
  `dtaas admin user add --file users.csv` / `delete` / `pause` / `stop` /
  `resume`, not by hand. `users.csv` copied by `dtaas admin config generate`
  is the human-editable bulk input that feeds `add`/`delete`. `desired_status`
  defaults to `running` for a user who has never been paused or stopped, and
  `user add`/`config reconcile --fix` skip starting any user whose
  `desired_status` is not `running`.
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
| `[[users]]` | ✅ | ✅ | ✅ | ✅ |
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
| `[[users]]` | ✅ | ✅ |
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
