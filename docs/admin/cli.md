# DTaaS Command Line Interface

The DTaaS Command Line Interface (CLI) is a command line tool for managing
a DTaaS installation.

## Prerequisite

The DTaaS platform with base users and essential
containers must be operational before the CLI can be utilised.

## Installation

The CLI is available as a Python package that can be installed via pip.

It is recommended to install the CLI in a virtual environment.

The installation steps are as follows:

- Change the working folder:

```bash
cd <DTaaS-directory>/cli
```

- It is recommended to use a virtual environment.
  A virtual environment should be created and activated.

- To install the CLI:

```bash
pip install dtaas
```

## Usage

!!! note
    The base DTaaS platform should be up and running before
    adding/deleting users with the CLI.

### Configure

The CLI uses _dtaas.toml_ as configuration file. A sample
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

### Select Template

The _cli_ uses YAML templates provided in this directory to create
new user workspaces. The available templates are:

1. _user.local.yml_: localhost installation
1. _User.server.yml_: multi-user web application over HTTP
1. _user.server.secure.yml_: multi-user web application over HTTPS

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

```bash
docker compose --env-file config/.env up -d --force-recreate traefik-forward-auth
```

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
- Usernames may include `.`, `_` and `-` (must start with a letter or digit);
  whitespace, path separators, and shell metacharacters are rejected.
