# Install DTaaS with the CLI

The DTaaS Command Line Interface (CLI) is the recommended way to
install and operate a DTaaS deployment. One `dtaas` entry point
generates deployment projects, validates configuration, brings
deployments up and down, manages users, and rotates certificates for
all supported scenarios.

This page covers the standard installation workflow and every `dtaas`
command. The complete `dtaas.toml` field reference — validation
rules, the annotated example file, and the user-file model — is in
the [Config Reference](cli-config.md).

## 📦 Installation

Installation inside a virtual environment is strongly recommended.

```bash
python -m venv .venv
source .venv/bin/activate     # Linux / macOS
# .venv\Scripts\activate      # Windows

pip install dtaas
dtaas --help                  # verify
```

## ⚡ Quick Start

From a clean machine to a running deployment:

```bash
# 1. Generate dtaas.toml + a sample users.csv
dtaas admin config generate

# 2. Edit dtaas.toml: server DNS, paths, OAuth credentials, users

# 3. Validate; fix any reported errors before continuing
dtaas admin config validate

# 4. Generate deployment files for your chosen scenario
dtaas generate-deployment --type secure-server

# 5. Bring the deployment up
dtaas admin install
```

Tear it down again with `dtaas admin uninstall` (add
`--remove-user-files` to also delete per-user workspace directories;
this prompts for confirmation, or pass `--yes` to skip the prompt).

### 🗺️ Deployment Types {#deployment-types}

| `--type` | When to use | Support level |
| :------- | :---------- | :------------- |
| `localhost` | Local development or demo, single user | dev/demo only |
| `insecure-server` | Multi-user HTTP demo | insecure/demo only |
| `secure-server` | Multi-user HTTPS | **production-supported** |
| `secure-server-gitlab` | HTTPS with bundled GitLab | **production-supported** |
| `workspace-localhost` | Workspace with Dex on localhost | dev/demo only |
| `workspace-secure-server` | Workspace with Keycloak | **production-supported** |

!!! warning
    Types marked *dev/demo only* or *insecure/demo only* run over
    plain HTTP with default or static credentials. **Do not expose
    them to the internet or shared networks.** Production-supported
    types still require the manual hardening steps documented in the
    `README.md` and `CONFIGURATION.md` shipped with each generated
    project.

The generated packages match the
[manual installation scenarios](overview.md#manual-installation-scenarios-advanced);
the CLI fills in the configuration and file structure that the manual
path asks you to prepare by hand.

## ⚙️ Configuration

The CLI treats `dtaas.toml` as the single source of truth. It looks
for the file in `--output-dir` first, then in the current working
directory, so one top-level `dtaas.toml` can serve a deployment
generated into a subdirectory.

Key sections:

- `[common]` — server DNS and the absolute path of the DTaaS
  installation directory.
- `[common.resources]` — default resource limits applied to user
  workspace containers (`cpus`, `mem_limit`, `pids_limit`,
  `shm_size`), with a `set_limits` flag to disable enforcement.
  Adjust to match host capacity and tenancy policy.
- `[common.security]` — OAuth credentials and `certs-src`, the
  source directory for TLS certificates.

Always run `dtaas admin config validate` after editing; it reports
all problems at once — see
[Validation Rules](cli-config.md#validation-rules) for the full list.

### 📄 Abridged Configuration {#abridged-configuration}

The CLI uses *dtaas.toml* as its configuration file. An abridged
configuration file is given here.

```toml
# This is the config for DTaaS CLI

name = "Digital Twin as a Service (DTaaS)"
version = "0.2.1"
owner = "The INTO-CPS-Association"
git-repo = "https://github.com/into-cps-association/DTaaS.git"

[common]
# Server hostname either localhost or a valid hostname, ex: intocps.org
server-dns = "localhost"
# absolute path to the DTaaS application directory
# Specify the directory of DTaaS installation
# Linux example
path = "/Users/username/DTaaS"
# Windows example
#path = "C:\\Users\\XXX\\DTaaS"
# Note: You have to either use / or \\ when specifying path, else you would get 
# "Error while getting toml file: dtaas.toml, Invalid unicode value"

[common.resources]
# Default resource limits applied when creating user workspace containers.
# Keys:
# - cpus: integer count of virtual CPUs to allocate to the container
# - mem_limit: memory limit string accepted by Docker (e.g. "4G", "512M")
# - pids_limit: maximum number of processes the container may create
# - shm_size: size for /dev/shm (shared memory), e.g. "512m"
#
# Adjust these values to match your host capacity and tenancy policy.
cpus = 4
mem_limit = "4G"
pids_limit = 4960
shm_size = "512m"

# Example: Increase memory and lower CPU for heavier-memory workloads
# cpus = 2
# mem_limit = "8G"


[[users]]
username = "username1"
email = "username1@intocps.org"

[[users]]
username = "username2"
email = "username2@intocps.org"
...
```

#### Notes

- Edits to `dtaas.toml` affect new user containers created after the change.
- To apply updated limits to existing containers, recreate or restart
  the user container(s) (for example by removing and re-adding the user
  workspace via the CLI or by restarting the container in Docker Compose).
- Use units (`M`, `G`) for memory and shared memory values.

## 🛠 Commands

This section documents every `dtaas` command not already covered
above. Every command accepts `--output-dir` (default `.`), checked
before falling back to the current working directory.

### 🗒️ `admin config generate` / `admin config validate`

```bash
dtaas admin config generate    # writes dtaas.toml + a sample users.csv
dtaas admin config validate    # checks an existing dtaas.toml
```

`generate` writes `dtaas.toml` and a sample `users.csv` (bulk input
for `admin user add --file`) into `--output-dir`; `--force` overwrites
an existing `dtaas.toml`. `validate` reports every problem in the
file at once — see [Validation Rules](cli-config.md#validation-rules).

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | For `generate`: target directory (created if missing). For `validate`: search location |
| `--force` | off | (`generate` only) Overwrite an existing `dtaas.toml` |

### 🔍 `admin config reconcile`

Reports drift between `dtaas.users.registry.json` (which **should** be
provisioned) and the live `compose.users.yml` services (which **are**
provisioned):

```bash
dtaas admin config reconcile
```

It lists:

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
provisioned user to match its `desired_status`:

```bash
dtaas admin config reconcile --fix
```

**unexpected** services are never touched by `--fix` — removing
something that's actually running is a deliberate action; use
`dtaas admin user delete` for those.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory to inspect |
| `--fix` | off | Reprovision missing/drifted registry users, and enforce desired status, after reporting |

### 🏗️ `generate-deployment`

Copies the full project structure for a specific deployment scenario
— `docker-compose.yml`, config examples, and supporting files — into
a target directory ready to be customised.

```bash
dtaas generate-deployment --type <name>
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--type NAME` | *(required)* | Deployment scenario (see [Deployment Types](#deployment-types)) |
| `--output-dir PATH` | `.` | Target directory (must already exist) |
| `--force` | off | Overwrite files that already exist |

**Examples:**

```bash
# Localhost demo in the current directory
dtaas generate-deployment --type localhost

# Production HTTPS server in a subdirectory
dtaas generate-deployment --type secure-server --output-dir ./my-server

# Regenerate, overwriting existing files
dtaas generate-deployment --type insecure-server --output-dir ./demo --force
```

When `dtaas.toml` is present, values are substituted automatically
into the generated files (dotenv files, `config/client.js`, and — for
TLS types — the `certs/` directory). See
[Configuration Substitution](cli-config.md#configuration-substitution)
for the full details. If `dtaas.toml` is not found, a note is printed
and generated files keep their default placeholder values.

### 🧰 `generate-project`

Scaffolds `dtaas.toml`, Docker Compose user-workspace templates, and
the `files/template/` directory into your working directory.

```bash
dtaas generate-project
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Target directory (must already exist) |
| `--force` | off | Overwrite files that already exist |

**Generated files:**

| Item | Purpose |
| :--- | :------ |
| `dtaas.toml` | Main CLI configuration |
| `users.server.yml` | Docker Compose template for HTTP deployments |
| `users.server.secure.yml` | Docker Compose template for HTTPS/TLS deployments |
| `users.resources.yml` | Per-user resource-limit overlay, merged in when `set_limits` is true |
| `files/template/` | Skeleton copied into each new user workspace |

!!! tip "Verify the Docker image tag"
    `users.server.yml` and `users.server.secure.yml` contain a pinned
    workspace image tag (e.g. `intocps/workspace:main-56c6f68`). Check
    [Docker Hub](https://hub.docker.com/r/intocps/workspace/tags) and
    update the tag to a current, stable version before deploying.

### 🚀 `admin install`

Brings a generated deployment up with a single command.

```bash
dtaas admin install
```

Internally runs `docker compose up -d` against the
`docker-compose.yml` in the installation directory. Before starting,
it ensures per-user workspace directories for every `[[users]]`
record exist, recreating each from `files/template/` if missing, and
sets ownership to `1000:100`.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory containing the generated deployment |

The CLI looks for `dtaas.toml` in `--output-dir` first, then the
current working directory, so a single top-level `dtaas.toml` can
serve a deployment generated into a subdirectory:

```bash
dtaas admin install --output-dir ./insecure
```

The command fails with a clear error if `docker-compose.yml` is
missing, `dtaas.toml` cannot be found, or the Docker daemon is
unreachable.

### 🧹 `admin uninstall`

Tears the deployment down, stopping and removing containers and
networks.

```bash
dtaas admin uninstall
```

User containers added with `admin user add` run as a separate Compose
project; they are torn down first so they do not hold the shared
network open. **Per-user workspace files are preserved by default.**

To also delete the generated per-user workspace directories **and**
the CLI-owned `dtaas.users.registry.json` / `.dtaas.state.json`:

```bash
dtaas admin uninstall --remove-user-files
```

This is destructive, so the command prompts for confirmation. Skip
the prompt in non-interactive scripts with `--yes`:

```bash
dtaas admin uninstall --remove-user-files --yes
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |
| `--remove-user-files` | off | Also delete per-user workspace dirs + registry/state files |
| `--yes` / `-y` | off | Skip the confirmation prompt for `--remove-user-files` |

!!! note
    `--remove-user-files` removes only the per-user directories inside
    `<output-dir>/files/`, preserving `files/common/` and
    `files/template/` so a later `admin install` can recreate user
    directories. It refuses to follow a symlinked `files/`.
    Double-check `--output-dir` before using this flag.

### 🔄 Lifecycle operations {#lifecycle-operations}

Operational controls for an **already-installed** deployment: observe
it with `status`, and suspend or resume it with `stop`/`start` and
`pause`/`resume`. None of these remove containers or networks — that
is `uninstall`'s job. Each command targets both the main deployment
and any user-added workloads (`compose.users.yml`), and exits `0` on
success (including the idempotent "nothing installed" case) and
non-zero on failure, so they are safe to call from CI/ops scripts.

`stop`/`start`/`pause`/`resume` act on the main deployment first, then
user-added workloads. If the second project fails after the first
already succeeded, there is no rollback — re-run the same command:
each project's compose command is idempotent, so retrying repeats a
harmless no-op against whichever project already changed and retries
the one that failed.

**Lifecycle command matrix:**

| Command | `docker compose` verb | Effect | Containers kept? | Reverse with |
| :------ | :---------------------- | :----- | :----------------: | :----------- |
| `admin install` | `up -d` | Create and start every service | n/a | `admin stop` / `admin uninstall` |
| `admin status` | `ps` (read-only) | Report per-service state; no change | n/a | n/a |
| `admin stop` | `stop` | Terminate the processes, keep the containers | yes | `admin start` |
| `admin start` | `start` | Start previously stopped containers | yes | `admin stop` |
| `admin pause` | `pause` | Freeze the processes (memory preserved) | yes | `admin resume` |
| `admin resume` | `unpause` | Thaw previously paused processes | yes | n/a |
| `admin uninstall` | `down` | Stop **and remove** containers and networks | no | `admin install` |

!!! note "`stop` vs `pause`"
    `stop` sends `SIGTERM`/`SIGKILL`: processes end, and a restart
    re-runs them from scratch (reverse with `admin start`). `pause`
    uses the kernel cgroup freezer: processes are suspended in place
    with their memory intact and resume instantly (reverse with
    `admin resume`), but a paused container still holds its resources.
    Use `stop` to free CPU; use `pause` for a brief, instantly
    reversible suspension. `pause` expects running containers and will
    error if the deployment is already stopped.

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

State values are `running`, `paused`, `stopped` (a terminated
container, what Docker calls `exited`), `restarting`, or
`not created` (a service defined in `docker-compose.yml` that has no
container yet). `HEALTH` shows the container healthcheck status, or
`-` when the service has none.

For automation, `--json` emits the same records as machine-readable
JSON:

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
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |
| `--json` | off | Emit machine-readable JSON instead of the table |

#### ⏹️ `admin stop` / ▶️ `admin start`

`stop` stops all services with `docker compose stop`; `start` brings
the stopped containers back with `docker compose start`. Containers
and networks are **kept**, so `stop` is not an uninstall.

```bash
dtaas admin stop
dtaas admin start
```

Both report `no existing DTaaS / Workspace installation` and exit `0`
when nothing is installed (no containers in any state), so they are
safe to call repeatedly.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |

#### ⏸️ `admin pause` / ▶️ `admin resume`

`pause` freezes every running container in place with
`docker compose pause`; `resume` thaws them with
`docker compose unpause`. Memory is preserved and resume is
near-instant.

```bash
dtaas admin pause
dtaas admin resume
```

Both report the absent-installation case and exit `0` when nothing is
installed (no containers in any state).

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |

### 🔁 `admin update --certs`

Rotates TLS certificates of a running deployment in place: no project
regeneration or manual file copying required.

```bash
dtaas admin update --certs
```

The command reads `[common.security].certs-src` from `dtaas.toml`,
then:

1. **Validates** the new certificate pair (parseable, private key
   matches cert, no expired intermediates).
2. **Stops** the `traefik` service to release open file handles.
3. **Swaps** the validated files into `<output-dir>/certs/`, backing
   up the live pair and restoring it on any failure.
4. **Restricts** the private key to `0600` (POSIX; prints a warning
   on Windows).
5. **Restarts** `traefik` and waits for it to come back up.

If validation fails, live certificates are left untouched. The
command is safe to run repeatedly.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--certs` | *(required)* | Refresh the deployment's TLS certificates |
| `--output-dir PATH` | `.` | Installation directory |

### 🧩 `admin update --config`

Re-applies the values in `dtaas.toml` to an already-installed
deployment's service config files without regenerating the project.

```bash
dtaas admin update --config
```

Treats `dtaas.toml` as the single source of truth, re-runs the same
substitution as `generate-deployment`, and if anything changed,
recreates all deployment services with
`docker compose up -d --force-recreate`. The deployment type is
auto-detected from `docker-compose.yml`.

```bash
# Preview changes without writing or restarting
dtaas admin update --config --dry-run

# Apply changes and restart
dtaas admin update --config

# Update a deployment in a subdirectory
dtaas admin update --config --output-dir ./my-server
```

`--config` validates `dtaas.toml` before making any changes and
refuses to apply if problems are found. It is **idempotent** — a
second run with no `dtaas.toml` changes reports
`No configuration changes` and restarts nothing.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--config` | *(required)* | Re-apply `dtaas.toml` to installed service config files |
| `--dry-run` | off | Report what would change without writing or restarting |
| `--output-dir PATH` | `.` | Installation directory |

`--certs` and `--config` may be combined in a single invocation.

## 👥 User Management

User management spans three files, each with a single owner — see
[User Files](cli-config.md#user-files) for the full model.

- **`dtaas.users.registry.json`** — the CLI-owned record of every
  *additional* user (added after install with `admin user add`),
  including their `desired_status` (`running`/`paused`/`stopped`).
  Mutated only by `admin user add`/`delete`/`pause`/`stop`/`resume`;
  never hand-edited.
- **`.dtaas.state.json`** — a git-ignored, disposable cache of what is
  actually running: per-user container id, status, and a config hash,
  refreshed on every add/delete. Safe to delete; the CLI rebuilds it
  on the next provisioning run. `admin config reconcile` compares it
  against the registry to detect drift.

### ➕ Add Users

The initial, "starting" users an instance is installed with are declared in
*dtaas.toml* as `[[users]]` records (see [Abridged Configuration](#abridged-configuration));
they are hand-edited once, at install time, and never rewritten by the CLI.

Users added later at runtime are **not** added to *dtaas.toml*. Instead, run
`dtaas admin user add`, either for a single user:

```bash
dtaas admin user add --email alice@intocps.org --group dtaas --load-balance alice
```

`--group` is repeatable, not comma-separated — pass it once per group to add
a user to multiple groups:

```bash
dtaas admin user add --email alice@intocps.org --group dtaas --group testers alice
```

or in bulk from a CSV file (the sample `users.csv` is written alongside
`dtaas.toml` by `dtaas admin config generate`):

```bash
dtaas admin user add --file users.csv
```

```csv
username,email,groups,load_balance
alice,alice@intocps.org,additional,true
bob,bob@intocps.org,additional;beta-testers,false
```

`groups` is a `;`-separated list and `load_balance` is `true`/`false`. A
`USERNAME` or `--file` is required (not both) — a bare `dtaas admin user add`
with neither is rejected rather than silently reprovisioning the whole
registry.

Either form merges the user(s) into the CLI-owned
`dtaas.users.registry.json` (never hand-edited) with `desired_status` set to
`running`, then **only the newly-added users are started** — already-running
users are left untouched, so adding one user never recreates the rest. A
username already declared in `dtaas.toml`'s `[[users]]` or already in the
registry is skipped with a warning, never added twice or overwritten.

To (re)provision **every** registry user at once (e.g. after
`compose.users.yml` was lost), use `dtaas admin config reconcile --fix`
instead.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `USERNAME` | — | Add one user (requires `--email`) |
| `--file PATH` / `-f` | — | Bulk-add users from a CSV |
| `--email TEXT` | — | Email for `USERNAME` (enables forward-auth routing) |
| `--group TEXT` | `additional` | Group tag for `USERNAME`; repeat the flag for multiple groups |
| `--load-balance` / `--no-load-balance` | on | Mark `USERNAME` for load balancing |

The command checks for the existence of the `files/<username>` directory.
If it does not exist, a new directory with the correct file structure is
created. The directory, if it exists, must be owned by the user executing
the **dtaas** command on the host operating system. If the files do not
have the expected ownership rights, the command fails.

When an *email* is given for a user, the CLI automatically adds the matching
traefik-forward-auth routing rule to `config/conf.server`; no manual editing
of `conf.server` is needed. Restart the container for the change to take
effect:

```bash
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

#### ⚖️ Resource limits (optional)

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

The flag is read on every `user add`, so a deployment can host both
constrained and unconstrained users by toggling `set_limits` between runs.

### ➖ Delete Users

Pass one or more usernames to `dtaas admin user delete`:

```bash
dtaas admin user delete alice bob
```

or bulk-delete from the same CSV format (only the `username` column is used):

```bash
dtaas admin user delete --file users.csv
```

`USERNAMES` and `--file` are mutually exclusive, and one of them is required.
Add `--dry-run` to preview which users would be removed without deleting
anything:

```bash
dtaas admin user delete alice bob --dry-run
```

Each deleted user is deprovisioned (container stopped, compose service and
forward-auth rule removed) and dropped from `dtaas.users.registry.json`.
Users that are not currently provisioned are reported and skipped, but are
still removed from the registry.

The CLI automatically removes the traefik-forward-auth routing rules for
deleted users from `config/conf.server`. Restart the container for the
change to take effect:

```bash
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `USERNAMES` | — | One or more usernames to remove |
| `--file PATH` / `-f` | — | Bulk-delete users listed in a CSV (only the `username` column is used) |
| `--dry-run` | off | Preview the removal without making any changes |

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
| :------ | :----------------------- | :----- | :----------- |
| `admin user pause` | `pause` | Freeze the named users' containers (memory preserved) | `admin user resume` |
| `admin user stop` | `stop` | Terminate the named users' containers, keep them | `admin user resume` |
| `admin user resume` | `unpause` or `start`, as needed | Thaw a paused user, or restart a stopped one | — |

Each command also writes a `desired_status` (`"paused"`/`"stopped"`/`"running"`)
into `dtaas.users.registry.json` for the users it acted on. This is what makes
the suspension durable: a later `dtaas admin user add` (which idempotently
re-provisions every registry user on every run) or
`dtaas admin config reconcile --fix` checks `desired_status` and will **not**
silently restart a user you paused or stopped. Only `admin user resume` (or
hand-editing the registry) clears it back to `"running"`.

Only additional users can be targeted here. Naming a `dtaas.toml` starting
user is rejected with an error: suspend or resume the whole installation
(starting users included) with
[`dtaas admin pause`/`stop`/`resume`](#lifecycle-operations) instead.

A username not found in the registry, or found but not currently provisioned
(e.g. `user add` was never run for them), is reported and skipped rather than
aborting the whole batch:

```text
'carol' is not a registered user, skipping
alice, bob paused successfully
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `USERNAMES` | — | One or more usernames to target |
| `--file PATH` / `-f` | — | Bulk-target users listed in a CSV (only the `username` column is used) |

### 📌 Additional Points to Remember

- `user add` starts a container for a new user, or restarts one that was
  stopped. It reports a *Running* status for containers already up, without
  restarting them.
- Provisioning is idempotent: re-running `user add` reprovisions every
  registry user without duplicating work. An empty registry is a no-op.
- Usernames may include `.`, `_` and `-` (must start with a letter or digit);
  whitespace, path separators, and shell metacharacters are rejected.
- This command does not enable AuthMS authentication.

### ⚠️ Known Limitations

- Usernames containing `.` are accepted by validation, but `.` is a special
  character for labels in Docker Compose, so containers for such users can
  fail to provision correctly. This is an active issue, tracked for a future
  release to internally replace `.` with `-` or `_` in generated labels.
