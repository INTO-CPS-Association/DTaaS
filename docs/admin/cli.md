# Install DTaaS with the CLI

The DTaaS Command Line Interface (CLI) is the recommended way to
install and operate a DTaaS deployment. One `dtaas` entry point
generates deployment projects, validates configuration, brings
deployments up and down, manages users, and rotates certificates for
all supported scenarios.

This page covers the standard installation workflow. The complete command
reference, including all options and generated-file layouts, is in
the
[Config Reference](cli-config.md).

## Installation

Installation inside a virtual environment is strongly recommended.

```bash
python -m venv .venv
source .venv/bin/activate     # Linux / macOS
# .venv\Scripts\activate      # Windows

pip install dtaas
dtaas --help                  # verify
```

## Quick Start

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
this prompts for confirmation).

### Deployment Types

| `--type` | When to use |
| :------- | :---------- |
| `localhost` | Local development or demo, single user |
| `insecure-server` | Multi-user HTTP demo — **not internet-facing** |
| `secure-server` | Multi-user HTTPS — production-ready |
| `secure-server-gitlab` | HTTPS with bundled GitLab — production-ready |
| `workspace-localhost` | Workspace with Dex on localhost |
| `workspace-secure-server` | Workspace with Keycloak — production-ready |

The generated packages match the
[manual installation scenarios](overview.md#manual-installation-scenarios-advanced);
the CLI fills in the configuration and file structure that the manual
path asks you to prepare by hand.

## Configuration

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
all problems at once.

### TLS Certificates

For the HTTPS scenarios, point `[common.security].certs-src` at the
directory holding the certificate pair before running
`generate-deployment`. To rotate certificates on a running
deployment:

```bash
dtaas admin update --certs
```

The command validates the new pair, swaps it in with a backup of the
live pair, and restarts only the gateway. If validation fails, the
live certificates are left untouched.

### Updating Configuration In Place

To re-apply `dtaas.toml` changes to an installed deployment without
regenerating the project:

```bash
dtaas admin update --config --dry-run   # preview
dtaas admin update --config             # apply and restart services
```

The command is idempotent and refuses to apply an invalid
configuration. `--certs` and `--config` may be combined.

### Abridged Configuration

The CLI uses _dtaas.toml_ as configuration file. An abridged
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

## User Management

### Generate Templates

The _cli_ uses YAML templates provided in this directory to create
new user workspaces. The available templates are:

1. _user.local.yml_: localhost installation
1. _User.server.yml_: multi-user web application over HTTP
1. _user.server.secure.yml_: multi-user web application over HTTPS

Generate the required user templates using

```bash
dtaas generate-project
```

### Add Users

The initial, "starting" users an instance is installed with are declared in
_dtaas.toml_ as `[[users]]` records (see above); they are hand-edited once,
at install time, and never rewritten by the CLI.

Users added later at runtime are **not** added to _dtaas.toml_. Instead, run
`dtaas admin user add` from the _cli_ directory, either for a single user:

```bash
dtaas admin user add alice --email alice@intocps.org
```

or in bulk from a CSV file (the sample `users.csv` is written alongside
`dtaas.toml` by `dtaas admin config generate`):

```bash
dtaas admin user add --file users.csv
```

`--group` (repeatable) and `--load-balance`/`--no-load-balance` set the
optional per-user tags. Either form merges the user(s) into the CLI-owned
`dtaas.users.registry.json` (never hand-edited), then provisions every
registry user. A username already declared in `dtaas.toml`'s `[[users]]` or
already in the registry is skipped with a warning, never added twice or
overwritten.

The command checks for the existence of `files/<username>` directory.
If it does not exist, a new directory with correct file structure is created.
The directory, if it exists, must be owned by the user executing
**dtaas** command on the host operating system. If the files do not
have the expected ownership rights, the command fails.

When an _email_ is given for a user, the CLI automatically adds the matching
traefik-forward-auth routing rule to `config/conf.server`; no manual editing
of `conf.server` is needed. Restart the container for the change to take
effect:

### Delete Users

Pass one or more usernames to `dtaas admin user delete`, run from the _cli_
directory:

```bash
dtaas admin user delete alice bob
```

or bulk-delete from the same CSV format (only the `username` column is used):

```bash
dtaas admin user delete --file users.csv
```

Add `--dry-run` to preview which users would be removed without deleting
anything. Each deleted user is deprovisioned (container stopped, compose
service and forward-auth rule removed) and dropped from
`dtaas.users.registry.json`.

### Additional Points to Remember

- `user add` starts a container for a new user, or restarts one that was
  stopped. It reports a _Running_ status for containers already up, without
  restarting them.
- Provisioning is idempotent: re-running `user add` reprovisions every
  registry user without duplicating work.
- Usernames may include `_` and `-` (must start with a letter or digit);
  whitespace, path separators, and shell metacharacters are rejected.

### Known Limitations

- Usernames containing `.` cannot currently be added through the
  CLI. This is an active issue that will be resolved in a future
  release.
