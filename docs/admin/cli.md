# Install DTaaS with the CLI

The DTaaS command line interface (CLI) is the recommended way to
install and operate a DTaaS deployment. A single `dtaas` entry point
generates deployment projects, validates configuration, starts and
stops deployments, manages users and rotates certificates for all
supported scenarios.

This page covers the standard installation workflow and every `dtaas`
command. The complete `dtaas.toml` field reference, with the
validation rules, an annotated example file and the user-file model,
is in the [Config Reference](cli-config.md).

## Installation

Install the CLI inside a virtual environment.

```bash
python -m venv .venv
source .venv/bin/activate     # Linux / macOS
# .venv\Scripts\activate      # Windows

pip install dtaas
dtaas --help                  # verify
```

The package needs Python 3.10 or newer.

## Quick start

From a clean machine to a running deployment:

```bash
# 1. Generate dtaas.toml + a sample users.csv
dtaas config generate

# 2. Edit dtaas.toml: server DNS, paths, OAuth credentials, users

# 3. Validate; fix any reported errors before continuing
dtaas config validate

# 4. Generate deployment files for your chosen scenario
dtaas deployment generate --type secure-server

# 5. Bring the deployment up
dtaas platform install
```

Tear it down again with `dtaas platform uninstall`. Add
`--remove-user-files` to also delete the per-user workspace
directories. That flag asks for confirmation; pass `--yes` to skip
the prompt.

### Deployment types {#deployment-types}

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
[manual installation scenarios](overview.md#manual-installation-scenarios-advanced).
The CLI fills in the configuration and file structure that the manual
path asks you to prepare by hand.

## Configuration

The CLI reads all its settings from `dtaas.toml`. It looks for the
file in `--output-dir` first and then in the current working
directory, so one top-level `dtaas.toml` can serve a deployment
generated into a subdirectory.

The main sections are:

- `[common]`: the server DNS name and the absolute path of the DTaaS
  installation directory.
- `[common.security]`: the `tls` flag and `certs-src`, the source
  directory for TLS certificates.
- `[common.resources]`: default resource limits for user workspace
  containers (`cpus`, `mem_limit`, `pids_limit`, `shm_size`), with a
  `set_limits` flag that turns enforcement off. Adjust them to the
  host capacity and your tenancy policy.
- One section per deployment type, such as `[secure-server]`, which
  holds the OAuth credentials for that type.

Run `dtaas config validate` after every edit. It reports all problems
at once; see [Validation Rules](cli-config.md#validation-rules) for
the full list.

### Abridged configuration {#abridged-configuration}

An abridged `dtaas.toml`:

```toml
# This is the config for DTaaS CLI

name = "Digital Twin as a Service (DTaaS)"
version = "2.1.0"
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

- Edits to `dtaas.toml` affect only user containers created after the
  change.
- To apply new limits to existing containers, recreate or restart the
  user containers, for example by deleting and re-adding the user with
  the CLI or by restarting the container with Docker Compose.
- Give memory and shared memory values a unit (`M`, `G`).

## Commands

Every command follows a `dtaas <noun> <verb>` grammar with four nouns,
listed in workflow order:

| Noun | Acts on |
| :--- | :------ |
| `config` | `dtaas.toml` and the user registry |
| `deployment` | The generated deployment files |
| `platform` | The installed core services, as one unit |
| `user` | Additional users, one at a time |

The `config`, `deployment` and `platform` commands accept
`--output-dir` (default `.`). The `user` commands always act on the
current directory, so run them from the deployment directory.

If a command fails because a path is root-owned (for example TLS
certificates under `/etc/letsencrypt`), the CLI suggests re-running
it as `sudo -E env PATH="$PATH" dtaas <command>`.

### `config generate` / `config validate`

```bash
dtaas config generate    # writes dtaas.toml + a sample users.csv
dtaas config validate    # checks an existing dtaas.toml
```

`generate` writes `dtaas.toml` and a sample `users.csv` (bulk input
for `user add --file`) into `--output-dir`. `--force` overwrites an
existing `dtaas.toml`. `validate` reports every problem in the file at
once; see [Validation Rules](cli-config.md#validation-rules).

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | For `generate`: target directory (created if missing). For `validate`: search location |
| `--force` | off | (`generate` only) Overwrite an existing `dtaas.toml` |

### `config reconcile`

Reports drift between `dtaas.users.registry.json` (the users who
**should** be provisioned) and the live `compose.users.yml` services
(the users who **are** provisioned):

```bash
dtaas config reconcile
```

It lists users in these categories:

- **missing**: registered but not provisioned.
- **unexpected**: provisioned but not in the registry. This can come
  from a manual edit or a partial delete, so investigate it.
- **drifted**: provisioned, but the live config no longer matches
  what `.dtaas.state.json` recorded at the last provisioning.
- **absent**: provisioned (the user has a compose service), but the
  container is gone, for example after an interrupted `user add`.
- **desired-status drift**: provisioned, but the live container state
  does not match the user's registry `desired_status` (for example
  `desired 'paused' but container is 'running'`).

When everything matches, it prints `In sync: no drift detected.` If
Docker is unreachable, the command warns that it could not verify
container state and reports only the drift it can read from the
compose file. It never reports `In sync` in that case.

Without `--fix`, the command is read-only. With `--fix`, it
reprovisions **missing** and **drifted** users, restarts the
containers of **absent** users, and then pauses, stops or starts every
provisioned user to match its `desired_status`:

```bash
dtaas config reconcile --fix
```

`--fix` runs the same code as `dtaas user add`, so it acts on the
current directory. Combining it with an `--output-dir` other than the
current directory is rejected. It also refuses to run when Docker is
unreachable.

`--fix` never touches **unexpected** services, because removing
something that is running should be a deliberate action. Use
`dtaas user delete` for those.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory to inspect |
| `--fix` | off | Reprovision missing/drifted registry users, and enforce desired status, after reporting |

### `deployment generate`

Copies the project structure for one deployment scenario
(`docker-compose.yml`, config examples and supporting files) into a
target directory. It also writes the user-workspace templates and the
`files/template/` skeleton.

```bash
dtaas deployment generate --type <name>
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--type NAME` | *(required)* | Deployment scenario (see [Deployment Types](#deployment-types)) |
| `--output-dir PATH` | `.` | Target directory (created if missing) |
| `--force` | off | Overwrite files that already exist |

**Examples:**

```bash
# Localhost demo in the current directory
dtaas deployment generate --type localhost

# Production HTTPS server in a subdirectory
dtaas deployment generate --type secure-server --output-dir ./my-server

# Regenerate, overwriting existing files
dtaas deployment generate --type insecure-server --output-dir ./demo --force
```

**Generated files** besides the scenario's compose tree:

| Item | Purpose |
| :--- | :------ |
| `users.server.yml` | Docker Compose template for HTTP deployments |
| `users.server.secure.yml` | Docker Compose template for HTTPS/TLS deployments |
| `users.resources.yml` | Per-user resource-limit overlay, merged in when `set_limits` is true |
| `files/template/` | Skeleton copied into each new user workspace |

When `dtaas.toml` is present, its values are substituted into the
generated files (dotenv files, the client config and, for TLS types,
the `certs/` directory). See
[Configuration Substitution](cli-config.md#configuration-substitution)
for details. If `dtaas.toml` is not found, the command prints a note
and the generated files keep their placeholder values.

!!! tip "Verify the Docker image tag"
    `users.server.yml` and `users.server.secure.yml` pin a workspace
    image tag (e.g. `intocps/workspace:main-56c6f68`). Check
    [Docker Hub](https://hub.docker.com/r/intocps/workspace/tags) and
    update the tag to a current, stable version before deploying.

### `platform install`

Starts a generated deployment.

```bash
dtaas platform install
```

The command runs `docker compose up -d` against the
`docker-compose.yml` in the installation directory. Before that, it
makes sure a workspace directory exists for every `[[users]]` record,
creating any missing one from `files/template/`, and sets its
ownership to `1000:100`.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory containing the generated deployment |

Because the CLI looks for `dtaas.toml` in `--output-dir` first and
then in the current working directory, a single top-level
`dtaas.toml` can serve a deployment generated into a subdirectory:

```bash
dtaas platform install --output-dir ./insecure
```

The command fails with an error if `docker-compose.yml` is missing,
`dtaas.toml` cannot be found or the Docker daemon is unreachable.

### `platform uninstall`

Tears the whole installation down, stopping and removing containers
and networks.

```bash
dtaas platform uninstall
```

Containers of users added with `user add` run as a separate Compose
project. The command removes them first so that they do not hold the
shared network open. **Per-user workspace files are kept by
default.**

To also delete the per-user workspace directories **and** the
CLI-owned `dtaas.users.registry.json` and `.dtaas.state.json`:

```bash
dtaas platform uninstall --remove-user-files
```

This is destructive, so the command asks for confirmation. Skip the
prompt in non-interactive scripts with `--yes`:

```bash
dtaas platform uninstall --remove-user-files --yes
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |
| `--remove-user-files` | off | Also delete per-user workspace dirs + registry/state files |
| `--yes` / `-y` | off | Skip the confirmation prompt for `--remove-user-files` |

!!! note
    `--remove-user-files` removes only the per-user directories inside
    `<output-dir>/files/`. It keeps `files/common/` and
    `files/template/`, so a later `platform install` can recreate the
    user directories. It refuses to follow a symlinked `files/`.
    Double-check `--output-dir` before using this flag.

### Lifecycle operations {#lifecycle-operations}

These commands work on an **installed** deployment. `status` reports
its state; `stop`/`start` and `pause`/`resume` suspend and resume it.
None of them remove containers or networks; `uninstall` does that.
They exit `0` on success, including when nothing is installed, and
non-zero on failure, so CI and ops scripts can call them safely.

`platform stop`, `start`, `pause` and `resume` act on the **core
services only** and never touch per-user containers. Suspend or
resume additional users with
[`dtaas user stop`/`pause`/`resume`](#user-pause-stop-resume).
`platform status` still reports the whole installation, core services
**and** user containers.

**Lifecycle command matrix:**

| Command | `docker compose` verb | Effect | Containers kept? | Reverse with |
| :------ | :---------------------- | :----- | :----------------: | :----------- |
| `platform install` | `up -d` | Create and start every service | n/a | `platform stop` / `platform uninstall` |
| `platform status` | `ps` (read-only) | Report per-service state; no change | n/a | n/a |
| `platform stop` | `stop` | Terminate the processes, keep the containers | yes | `platform start` |
| `platform start` | `start` | Start previously stopped containers | yes | `platform stop` |
| `platform pause` | `pause` | Freeze the processes (memory preserved) | yes | `platform resume` |
| `platform resume` | `unpause` | Thaw previously paused processes | yes | n/a |
| `platform uninstall` | `down` | Stop **and remove** containers and networks | no | `platform install` |

!!! note "`stop` vs `pause`"
    `stop` sends `SIGTERM`/`SIGKILL`: the processes end, and a restart
    runs them from scratch (reverse with `platform start`). `pause`
    uses the kernel cgroup freezer: the processes are suspended in
    place with their memory intact and resume instantly (reverse with
    `platform resume`), but a paused container still holds its
    resources. Use `stop` to free CPU and `pause` for a short
    suspension. `pause` expects running containers and fails if the
    deployment is already stopped.

#### `platform status`

Reports the state of every service, for both the core services and
the user containers.

```bash
dtaas platform status
```

```text
PROJECT     SERVICE            STATE        HEALTH
deployment  traefik            running      healthy
deployment  client             running      -
deployment  gitlab             not created  -
users       alice              paused       -
```

The state is one of `running`, `paused`, `stopped` (a terminated
container, which Docker calls `exited`), `restarting` or
`not created` (a service defined in `docker-compose.yml` that has no
container yet). `HEALTH` shows the container healthcheck status, or
`-` when the service has no healthcheck.

For automation, `--json` prints the same records as JSON:

```bash
dtaas platform status --json
```

```json
[
  {"project": "deployment", "service": "traefik", "state": "running", "health": "healthy"}
]
```

For the user containers alone, use [`dtaas user status`](#user-status).

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |
| `--json` | off | Emit machine-readable JSON instead of the table |

#### `platform stop` / `platform start`

`stop` stops the core services with `docker compose stop`; `start`
brings the stopped containers back with `docker compose start`.
Containers and networks are **kept**, so `stop` is not an uninstall.

```bash
dtaas platform stop
dtaas platform start
```

After `stop`, the command notes how many per-user containers are
still running and suggests `dtaas user stop --all`. Both commands
print `There is no existing DTaaS / Workspace installation` and exit
`0` when nothing is installed (no containers in any state), so they
are safe to call repeatedly.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |

#### `platform pause` / `platform resume`

`pause` freezes the running core-service containers in place with
`docker compose pause`; `resume` thaws them with
`docker compose unpause`. Memory is preserved and resuming is almost
instant.

```bash
dtaas platform pause
dtaas platform resume
```

Like `stop`, `pause` notes any per-user containers still running.
Both commands report the absent installation and exit `0` when
nothing is installed (no containers in any state).

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--output-dir PATH` | `.` | Installation directory |

### `platform update --certs`

Replaces the TLS certificates of a running deployment in place,
without regenerating the project or copying files by hand.

```bash
dtaas platform update --certs
```

The command reads `[common.security].certs-src` from `dtaas.toml`,
then:

1. **Validates** the new certificate pair (parseable, private key
   matches the certificate, no expired intermediates).
2. **Stops** the `traefik` service to release open file handles.
3. **Swaps** the validated files into `<output-dir>/certs/`, backing
   up the live pair and restoring it on any failure.
4. **Restricts** the private key to `0600` (POSIX; prints a warning
   on Windows).
5. **Restarts** `traefik` and waits for it to come back up.

If validation fails, the live certificates are left untouched. The
command is safe to run repeatedly.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--certs` | *(required)* | Refresh the deployment's TLS certificates |
| `--output-dir PATH` | `.` | Installation directory |

### `platform update --config`

Re-applies the values in `dtaas.toml` to the service config files of
an installed deployment without regenerating the project.

```bash
dtaas platform update --config
```

The command runs the same substitution as `deployment generate`. If
any file changed, it recreates all deployment services with
`docker compose up -d --force-recreate`. It detects the deployment
type from `docker-compose.yml`.

```bash
# Preview changes without writing or restarting
dtaas platform update --config --dry-run

# Apply changes and restart
dtaas platform update --config

# Update a deployment in a subdirectory
dtaas platform update --config --output-dir ./my-server
```

`--config` validates `dtaas.toml` before changing anything and
refuses to apply an invalid file. A second run with no `dtaas.toml`
changes reports `No configuration changes` and restarts nothing. If
secrets are still template placeholders after the update, the command
lists them.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `--config` | *(required)* | Re-apply `dtaas.toml` to installed service config files |
| `--dry-run` | off | Report what would change without writing or restarting |
| `--output-dir PATH` | `.` | Installation directory |

`--certs` and `--config` can be combined in one invocation.

### Deprecated command spellings

Version 2.0.0 of the CLI moved every command to the
`dtaas <noun> <verb>` grammar. The old spellings still work for one
release as hidden aliases. Each prints a deprecation warning and then
runs the new command. Update your scripts:

| Old spelling | New spelling |
| :----------- | :----------- |
| `dtaas generate-project` | `dtaas config generate` + `dtaas deployment generate` |
| `dtaas generate-deployment --type <t>` | `dtaas deployment generate --type <t>` |
| `dtaas admin config <verb>` | `dtaas config <verb>` |
| `dtaas admin install`, `uninstall`, `update`, `status` | `dtaas platform <verb>` |
| `dtaas admin stop`, `start`, `pause`, `resume` | `dtaas platform <verb>` (scope narrowed, see below) |
| `dtaas admin user add`, `delete`, `pause`, `stop`, `resume` | `dtaas user <verb>` |

!!! warning "Scope change"
    Before 2.0, `admin stop`, `start`, `pause` and `resume` acted on
    the whole installation, including every additional user. The
    `platform` replacements act on the core services only. To get the
    old effect, also run `dtaas user stop --all`, `pause --all` or
    `resume --all`. `admin start` maps to `user resume --all`, since
    there is no `user start`.

## User management

User management spans three files, each with a single owner; see
[User Files](cli-config.md#user-files) for the full model.

- **`dtaas.users.registry.json`** is the CLI-owned record of every
  *additional* user (added after installation with `user add`),
  including their `desired_status` (`running`/`paused`/`stopped`).
  Only `user add`, `delete`, `pause`, `stop` and `resume` change it;
  do not edit it by hand.
- **`.dtaas.state.json`** is a git-ignored, disposable cache of what
  is running: per-user container id, status and a config hash,
  refreshed on every add and delete. It is safe to delete; the CLI
  rebuilds it on the next provisioning run. `config reconcile`
  compares it against the registry to detect drift.

### Add users

The starting users an instance is installed with are declared in
*dtaas.toml* as `[[users]]` records (see
[Abridged Configuration](#abridged-configuration)). You edit them once
at installation time, and the CLI never rewrites them.

Users added later are **not** written to *dtaas.toml*. Add them with
`dtaas user add`, either one at a time:

```bash
dtaas user add --email alice@intocps.org --group dtaas --load-balance alice
```

`--group` is repeatable, not comma-separated. Pass it once per group
to add a user to several groups:

```bash
dtaas user add --email alice@intocps.org --group dtaas --group testers alice
```

or in bulk from a CSV file (`dtaas config generate` writes a sample
`users.csv` next to `dtaas.toml`):

```bash
dtaas user add --file users.csv
```

```csv
username,email,groups,load_balance
alice,alice@intocps.org,additional,true
bob,bob@intocps.org,additional;beta-testers,false
```

`groups` is a `;`-separated list and `load_balance` is `true` or
`false`. Give either a `USERNAME` or `--file`, not both. A bare
`dtaas user add` with neither is rejected, so it cannot reprovision
the whole registry by accident.

Both forms merge the users into the CLI-owned
`dtaas.users.registry.json` with `desired_status` set to `running`.
**Only the newly added users are started**; users already running are
left alone, so adding one user never recreates the others. A username
that is already declared in `dtaas.toml`'s `[[users]]` or already in
the registry is skipped with a warning. It is never added twice or
overwritten.

To reprovision **every** registry user at once (for example after
`compose.users.yml` was lost), use `dtaas config reconcile --fix`.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `USERNAME` | — | Add one user (requires `--email`) |
| `--file PATH` / `-f` | — | Bulk-add users from a CSV |
| `--email TEXT` | — | Email for `USERNAME` (enables forward-auth routing) |
| `--group TEXT` | `additional` | Group tag for `USERNAME`; repeat the flag for multiple groups |
| `--load-balance` / `--no-load-balance` | on | Mark `USERNAME` for load balancing |
| `--password TEXT` | — | Initial GitLab password for `USERNAME`; only used when GitLab provisioning is enabled (see below). Prefer the `users.csv` `password` column or the interactive prompt, because a command-line value is visible in shell history and the process list |

For each user, the command checks for a `files/<username>` directory.
If it does not exist, the command creates it with the correct file
structure. An existing directory must be owned by the user running
the **dtaas** command on the host; otherwise the command fails.

When a user has an *email*, the CLI adds the matching
traefik-forward-auth routing rule to `config/conf.server`, so you do
not need to edit `conf.server` by hand. Restart the container for the
change to take effect:

```bash
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

#### GitLab provisioning (optional)

When `[gitlab].provision = true` in `dtaas.toml` (off by default),
`user add` also creates each new user's GitLab account and a Personal
Access Token:

```toml
[gitlab]
provision = true
api_url = "https://gitlab.example.com"
```

The provisioning token must be able to create users, so it has to be
an admin token. The CLI reads it from the `DTAAS_GITLAB_PAT`
environment variable, and the generated template deliberately has no
key for it. A `[gitlab].pat` key also works and takes precedence over
the variable.

```bash
export DTAAS_GITLAB_PAT="glpat-xxxxxxxxxxxxxxxxxxxx"
```

Each provisioned user needs an initial GitLab password. Supply it with
`--password` (for a single-user add, the CLI prompts with hidden input
if you omit it) or with a `password` column in `users.csv`:

```csv
username,email,groups,load_balance,password
alice,alice@intocps.org,additional,true,S3cur3-p4ss
```

The password is used only to create the account. It is never written
to `dtaas.users.registry.json`, `.dtaas.state.json` or logs. Issued
tokens are saved to `gitlab_user_tokens.json` (mode `0600`); treat that
file as a credential store.

Re-running `user add` for a user who is already provisioned retries
only the steps that failed before. Once a token has been issued for a
user, a later run does not issue another. An existing GitLab account
is left untouched and reported with a warning. A GitLab failure does
not affect the containers, which are already running by then, but it
makes the command exit non-zero.

For a self-hosted GitLab behind an internal CA, set
`[gitlab].ssl_verify` to the path of the CA bundle. `false` turns
verification off entirely and prints a warning.

#### Resource limits (optional)

By default each user container gets the CPU, memory, process and
shared-memory caps from `[common.resources]`, merged in from the
`users.resources.yml` overlay. To add users without any caps, set
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

The CLI reads the flag on every `user add`, so one deployment can host
both constrained and unconstrained users if you change `set_limits`
between runs.

### Delete users

Pass one or more usernames to `dtaas user delete`:

```bash
dtaas user delete alice bob
```

or delete in bulk from the same CSV format (only the `username`
column is used):

```bash
dtaas user delete --file users.csv
```

Give either `USERNAMES` or `--file`; one of them is required. Add
`--dry-run` to see which users would be removed without deleting
anything:

```bash
dtaas user delete alice bob --dry-run
```

Each deleted user is deprovisioned (container stopped, compose
service and forward-auth rule removed) and dropped from
`dtaas.users.registry.json`. Users who are not provisioned are
reported and skipped, but they are still removed from the registry.

The CLI removes the traefik-forward-auth routing rules of deleted
users from `config/conf.server`. Restart the container for the change
to take effect:

```bash
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `USERNAMES` | — | One or more usernames to remove |
| `--file PATH` / `-f` | — | Bulk-delete users listed in a CSV (only the `username` column is used) |
| `--dry-run` | off | Preview the removal without making any changes |

### `user pause` / `stop` / `resume` {#user-pause-stop-resume}

Suspend or resume **specific additional users** without touching the
rest of the installation. Target one or more `USERNAMES`, a
`--file`/`-f users.csv` (only the `username` column is read, as with
`user delete`), or every additional user with `--all`.

```bash
dtaas user pause alice bob
dtaas user stop alice
dtaas user resume alice bob
dtaas user pause --file users.csv
dtaas user stop --all
```

| Command | `docker compose` verb | Effect | Reverse with |
| :------ | :----------------------- | :----- | :----------- |
| `user pause` | `pause` | Freeze the named users' containers (memory preserved) | `user resume` |
| `user stop` | `stop` | Terminate the named users' containers, keep them | `user resume` |
| `user resume` | `unpause` or `start`, as needed | Thaw a paused user, or restart a stopped one | — |

Each command also records a `desired_status`
(`"paused"`/`"stopped"`/`"running"`) in `dtaas.users.registry.json`
for the users it acted on. This makes the suspension durable: a later
`dtaas user add` or `dtaas config reconcile --fix` checks
`desired_status` and does **not** restart a user you paused or
stopped. Only `user resume` (or editing the registry by hand) sets it
back to `"running"`.

Only additional users can be targeted. Naming a `dtaas.toml` starting
user is an error. To suspend or resume the whole installation,
starting users included, use
[`dtaas platform pause`/`stop`/`resume`](#lifecycle-operations)
together with `--all` here.

A username that is not in the registry, or is registered but not
provisioned (for example because `user add` never ran for it), is
reported and skipped, and the rest of the batch continues:

```text
'carol' is not a registered user, skipping
alice, bob paused successfully
```

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `USERNAMES` | — | One or more usernames to target |
| `--file PATH` / `-f` | — | Bulk-target users listed in a CSV (only the `username` column is used) |
| `--all` | off | Target every additional user; cannot be combined with `USERNAMES` or `--file` |

### `user status` {#user-status}

Reports the state of every additional user's container, or of one
named user. It is the per-user part of `platform status`, using the
same table and `--json` format.

```bash
dtaas user status
dtaas user status alice
dtaas user status --json
```

A username that is not in `dtaas.users.registry.json` is rejected, so
a typo is not mistaken for a stopped user. A registered user without
a container is reported as not provisioned. The command exits `0`
whenever it can read the deployment.

**Options:**

| Option | Default | Description |
| :----- | :------ | :----------- |
| `USERNAME` | — | Report only this user |
| `--json` | off | Emit machine-readable JSON instead of the table |

### Additional points to remember

- `user add` writes every registry user into `compose.users.yml` but
  starts only the users added in that run. Users whose
  `desired_status` is not `running` are never started.
- An empty registry makes `user add` a no-op.
- Usernames may contain `.`, `_` and `-` and must start with a letter
  or digit. Whitespace, path separators and shell metacharacters are
  rejected.
- `user add` does not enable AuthMS authentication.

### Known limitations

- Validation accepts usernames that contain `.`, but `.` is a special
  character in Docker Compose labels, so containers for such users can
  fail to provision. A future release will replace `.` with `-` or `_`
  in the generated labels.
