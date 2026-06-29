# DTaaS Command Line Interface

This is a command-line tool for the
INTO-CPS-Association Digital Twin as a Service platform.

## 📦 Installation

Installation in a virtual environment is recommended.

Steps to install:

- Create and activate a virtual environment.

- Install the package:

```bash
pip install dtaas
```

## 📖 Usage

### Generate Project Files

Before configuring the CLI, generate the required project files in your
working directory:

```bash
dtaas generate-project
```

By default, this creates files in the current directory and skips any that
already exist. You can customize this behaviour with the following options:

```bash
# Generate files in a specific directory
dtaas generate-project --output-dir /path/to/target/dir

# Overwrite existing files
dtaas generate-project --force

# Combine options
dtaas generate-project --output-dir /path/to/target/dir --force
```

**Options:**

- `--output-dir` (default: `.`): Target directory for generated files.
The directory must already exist.
- `--force`: Overwrite existing files. Without this flag,
existing files are left untouched and a message is printed.

This creates three configuration files and the workspace directory structure:

| Item | Purpose |
|------|---------|
| `dtaas.toml` | Main CLI configuration (server DNS, paths, resources, users) |
| `users.server.yml` | Docker Compose user-workspace template for HTTP deployments|
| `users.server.secure.yml` | Docker Compose user-workspace template for HTTPS/TLS deployments |
| `files/template/` | Template directory for user workspace initialization |

The `files/template/` directory is created if it does not exist.

#### Important: Verify Docker Image Tag

The generated `users.server.yml` and `users.server.secure.yml` files contain a
pinned Docker image tag for the workspace container (e.g., `intocps/workspace:main-967bc10`).
This tag is baked into the templates at generation time and may become stale as
the project evolves.

**You should verify and update the Docker image tag** in these templates to use
a current, stable version before deploying user workspaces.
Check the available tags in the
[INTO-CPS workspace repository](https://hub.docker.com/r/intocps/workspace/tags)
or your Docker registry to ensure you are using an up-to-date image version.

### Generate Deployment Project

To generate the full project structure for a specific deployment scenario without
downloading separate zip packages:

```bash
dtaas generate-deployment --type <name>
```

**Available types:**

| `--type` | Deployment scenario | Support level |
|---|---|---|
| `localhost` | Single-machine Docker deployment | dev/demo only |
| `insecure-server` | Multi-user HTTP server deployment | insecure/demo only |
| `secure-server` | Multi-user HTTPS/TLS server deployment | production-supported |
| `secure-server-gitlab` | HTTPS/TLS server with integrated GitLab | production-supported |
| `workspace-localhost` | Workspace service with Dex on localhost | dev/demo only |
| `workspace-secure-server` | Workspace service with Keycloak in production | production-supported |

> [!WARNING]
> Templates labelled **dev/demo only** or **insecure/demo only** run over plain
> HTTP and use default or static credentials. They are **not safe for
> internet-facing or shared deployments**. Use a **production-supported** type
> for any environment reachable from outside your local machine.
>
> Production-supported types still require manual hardening steps documented
> inside each generated project (see the `README.md` and `CONFIGURATION.md`
> shipped with the template).

**Options:**

- `--type` (required): Deployment scenario to generate.
- `--output-dir` (default: `.`): Target directory for generated files.
  The directory must already exist.
- `--force`: Overwrite existing files. Without this flag, existing files are
  left untouched and a message is printed.

**Examples:**

```bash
# Generate a localhost deployment in the current directory
dtaas generate-deployment --type localhost

# Generate a secure-server deployment in a specific directory
dtaas generate-deployment --type secure-server --output-dir /path/to/project

# Regenerate, overwriting any existing files
dtaas generate-deployment --type insecure-server --output-dir /path/to/project --force
```

Each type copies the relevant `docker-compose.yml`, configuration examples,
and supporting files into the target directory, ready to be customised.

#### Configuration substitution

When `dtaas.toml` is present, `generate-deployment` reads deployment-specific
values from it and substitutes them into the generated files, so you do not
have to edit every placeholder by hand. The CLI looks for `dtaas.toml` in
`--output-dir` first; if not found there, it falls back to the current
working directory.

Each `--type` reads from its matching top-level section in `dtaas.toml`.
Values are written into the generated config files by key: dotenv files
(`config/.env`, `config/conf.server`) line by line, and client website
config files (`config/client.js`) via the object assigned to `window.env`.

The `[frontend]` section holds the OAuth application for the DTaaS client
website (React frontend): `react-app-client-id` and `react-app-oauth-url`
are substituted as `REACT_APP_CLIENT_ID` and `REACT_APP_AUTH_AUTHORITY` in
`config/client.js`. This is a separate OAuth application from the server
one (traefik-forward-auth) configured by `oauth-client-id` and friends in
the `[insecure-server]` and `[secure-server]` sections.

The `[common]` section (`server-dns`) and the `[users]` section (usernames,
paths, and emails) are substituted across all types where they appear.

If `dtaas.toml` is not found in either location, a note is printed and the
files keep their default placeholder values.

#### TLS certificate placement

For the TLS deployment types (`secure-server`, `secure-server-gitlab`,
`workspace-secure-server`), `generate-deployment` also populates the
generated `certs/` directory so the reverse proxy can find its certificates.
It reads the source location from `[common.security].certs-src` in
`dtaas.toml` and copies the latest `fullchain.pem` and `privkey.pem` into
`<output-dir>/certs/`.

### 🚀 Install Deployment

Once a deployment has been generated (and `dtaas.toml` configured), bring it up
with a single command:

```bash
dtaas admin install
```

This runs `docker compose up -d` against the generated `docker-compose.yml` in
the installation directory.

Before starting the stack, the command ensures the per-user workspace
directories listed in `[users].add` exist — recreating each from
`files/template` if missing — and sets their ownership to `1000:100`. This
means a fresh install, or a reinstall after `uninstall --remove-user-files`,
does not leave Docker to auto-create empty, root-owned mount directories.

**Options:**

- `--output-dir` (default: `.`): Installation directory containing the
  generated deployment.

The `docker-compose.yml` must live in `--output-dir`. The CLI looks for
`dtaas.toml` in `--output-dir` first and, if not found there, falls back to the
current working directory, so a single top-level `dtaas.toml` can serve a
deployment generated into a subdirectory (e.g.
`dtaas admin install --output-dir insecure`).

The command fails with a clear error if the deployment has not been generated
(`docker-compose.yml` missing), if `dtaas.toml` is missing from both locations,
or if the Docker daemon is not reachable.

### 🧹 Uninstall Deployment

To tear the deployment down:

```bash
dtaas admin uninstall
```

This runs `docker compose down`, stopping and removing the deployment's
containers and networks. Containers added with `admin user add` run as a
separate Compose project, so they are torn down first; otherwise they would
survive and hold the shared network open. If nothing is currently installed,
the command reports that there is no existing installation rather than claiming
a successful teardown, but `--remove-user-files` is still honoured, so you can
clean up workspace files after a teardown. **Per-user workspace files are
preserved by default.**

To additionally delete the generated per-user workspace directories, pass
`--remove-user-files`:

```bash
dtaas admin uninstall --remove-user-files
```

Because this is destructive, the command prompts for confirmation. Supply
`--yes` (or `-y`) to skip the prompt in non-interactive scripts:

```bash
dtaas admin uninstall --remove-user-files --yes
```

**Options:**

- `--output-dir` (default: `.`): Installation directory containing the
  generated deployment.
- `--remove-user-files`: Also delete the generated per-user workspace
  directories. Opt-in to avoid accidental data loss: it requires a generated
  deployment in `--output-dir`, prompts for confirmation, and refuses to follow
  a symlinked `files/`. It removes only the per-user directories inside
  `<output-dir>/files`, keeping the shared `files/common` and the
  `files/template` skeleton so a later `admin install` can recreate the user
  directories. It does not protect against pointing `--output-dir` at the wrong
  directory, so double-check the path.
- `--yes` / `-y`: Skip the confirmation prompt for `--remove-user-files`.

### 🔁 Update TLS Certificates

To rotate the TLS certificates of a running deployment in place, without
regenerating the project or copying files by hand:

```bash
dtaas admin update --certs
```

This reads the certificate source from `[common.security].certs-src` in
`dtaas.toml` (the same key used to seed `certs/` during
`generate-deployment`), picks the newest `fullchain.pem` and `privkey.pem`
there, and then:

1. **Validates** the new pair before anything is replaced — it must be
   parseable, the private key must match the certificate, and neither the leaf
   nor any intermediate in the chain may already be expired.
2. **Stops** the `traefik` service so nothing holds the certificate files open
   while they are replaced.
3. **Swaps** the validated files into `<output-dir>/certs/`, backing up the
   live pair first and restoring it on any failure, so the deployment is never
   left with a half-updated (mismatched) pair.
4. **Restricts** the private key to `0600` on POSIX hosts; on Windows it prints
   a warning instead, because file permissions cannot be enforced there.
5. **Restarts** `traefik` and waits for it to come back up, so certificates the
   proxy rejects are reported as a failure rather than a false success.

If validation fails, the live certificates are left untouched and a clear
error is raised. The command is safe to run repeatedly.

**Options:**

- `--certs`: Refresh the deployment's TLS certificates. Pass at least one of
  `--certs` or `--config` (see below).
- `--output-dir` (default: `.`): Installation directory containing the
  generated deployment (the `docker-compose.yml` and `certs/`). The CLI looks
  for `dtaas.toml` here first, then in the current directory. Keep
  `dtaas.toml` inside `--output-dir`: if it is absent there, `certs-src` is read
  from the `dtaas.toml` in the directory you run the command from, which may
  belong to a different deployment.

The command fails with a clear error if the deployment has not been generated
(`docker-compose.yml` missing), if `certs-src` is unset or missing, if either
certificate is absent from `certs-src`, if the Docker daemon is not reachable,
or if `traefik` does not come back up after the swap.

### 🧩 Update Service Configuration

To re-apply the values in `dtaas.toml` to an already-installed deployment's
service config files — without regenerating the project — use:

```bash
dtaas admin update --config
```

This treats `dtaas.toml` as the single source of truth, re-runs the same
substitution as `generate-deployment` against the installed config files, and
if anything changed, recreates **all** the deployment's services with
`docker compose up -d --force-recreate`. Because a config change can affect any
service (the shared `.env`, routing, or a mounted config file), the whole stack
is restarted rather than guessing which services are impacted. The deployment
type is **auto-detected** from the services in `docker-compose.yml`, so you do
not pass `--type`. Examples:

```bash
# Preview what would change (no writes, no restart):
dtaas admin update --config --dry-run

# Apply the changes and restart all services:
dtaas admin update --config

# Update a deployment generated elsewhere:
dtaas admin update --config --output-dir ./my-server
```

`--config` first **validates** `dtaas.toml` with the same checks as
`dtaas admin config validate` and refuses to apply anything if it finds
problems, reporting each field-level issue. It is **idempotent**: a second run
with no `dtaas.toml` changes reports `No configuration changes` and restarts
nothing. It fails with a clear error if the deployment has not been generated,
if `dtaas.toml` is missing or invalid, or if the restart fails.

**Options:**

- `--config`: Re-apply `dtaas.toml` to the installed services' config files.
- `--dry-run`: With `--config`, report what would change without writing files
  or restarting anything.

`--certs` and `--config` may be combined in a single invocation.

### 📁 Select Template

The _cli_ uses YAML templates provided in this directory to create
new user workspaces. The available templates are:

1. _user.local.yml_: localhost installation
1. _User.server.yml_: multi-user web application over HTTP
1. _user.server.secure.yml_: multi-user web application over HTTPS

### ➕ Add Users

To add new users using the CLI, fill in the
_users.add_ list in
_dtaas.toml_ with the Gitlab instance
usernames of the users to be added

```toml
[users]
# matching user info must present in this config file
add = ["username1","username2", "username3"]
```

Ensure the working directory is _cli_.

Then run:

```bash
dtaas admin user add
```

The command checks for the existence of `files/<username>` directory.
If it does not exist, a new directory with correct file structure is created.
The directory, if it exists, must be owned by the user executing
**dtaas** command on the host operating system. If the files do not
have the expected ownership rights, the command fails.

#### Caveats

This brings up the containers, without the AuthMS authentication.

When an `email` is provided for a user in `dtaas.toml`, the CLI automatically
adds the traefik-forward-auth routing rule to `config/conf.server`. For the
change to take effect, restart the `traefik-forward-auth` container:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

The new users are now added to the DTaaS instance, with authorization enabled.

### ➖ Delete Users

To delete users, add their GitLab instance usernames to the _users.delete_
list in _dtaas.toml_ file.

```toml
[users]
# matching user info must present in this config file
delete = ["username1","username2", "username3"]
```

- Ensure you are in the working directory where the _dtaas.toml_ file is.

Then run:

```bash
dtaas admin user delete
```

The CLI automatically removes the traefik-forward-auth routing rules for
deleted users from `config/conf.server`. Restart `traefik-forward-auth`
for the change to take effect:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

### 📌 Additional Points

- The _user add_ CLI will add and start a
  container for a new user.
  It can also start a container for an existing
  user if that container was somehow stopped.
  It shows a _Running_ status for existing user
  containers that are already up and running,
  it doesn't restart them.

- _user add_ and _user delete_ CLIs return an
  error if the _add_ and _delete_ lists in
  _dtaas.toml_ are empty, respectively.

- '.' is a special character. Currently, usernames which have
  '.'s in them cannot be added properly through the CLI.
  This is an active issue that will be resolved in future releases.

### 🛠️ Configuration File

`dtaas.toml` can be generated and checked on its own, without the other project
files produced by `generate-project`.

To write a fresh `dtaas.toml` template to fill in:

```bash
dtaas admin config generate
```

Then, after editing it with your own values, check those values:

```bash
dtaas admin config validate
```

`validate` reads `dtaas.toml` (from `--output-dir` first, then the current
directory) and reports every problem it finds at once. It checks:

| Value | Rule |
| --- | --- |
| `git-repo` | must be an `http(s)` URL |
| `[common].server-dns` | must be `localhost`, an IP, or a dotted (fully qualified) hostname |
| `[common].path` | must be an absolute path to a directory that exists |
| `[common.security].certs-src` | when present, must be an absolute path to a directory that exists |
| `[common.resources].cpus` | must be a positive number of CPU cores (e.g. `4` or `0.5`) |
| `[common.resources].pids_limit` | must be an integer |
| `[common.resources].mem_limit`, `shm_size` | must be a byte size with a required unit (e.g. `4G`, `512m`) |
| `[users].add`, `[users].delete` | when present, must be lists of strings |
| `[users.<name>].email` | must be a valid email address (RFC 5321/5322, no DNS lookup) |
| deployment-section URLs | when present, must be `http(s)` URLs |
| deployment-section `default-user` | when present, must be a valid username |

The deployment-section URLs are `react-app-oauth-url`, `oauth-url`,
`auth-authority`, and `keycloak-issuer-url` across the `[frontend]`,
`[localhost]`, `[insecure-server]`, `[secure-server]`, `[workspace-localhost]`,
and `[workspace-secure-server]` sections; each is checked only when its section
is present.

`path` and `certs-src` are checked against the local filesystem, so run
`validate` on the deployment host. A bare single-label `server-dns` (e.g.
`myhost`) is rejected; use `localhost` or a fully qualified name. URL checking
is strict, so unreplaced placeholders such as `https://your_server_dns/...`
(an underscore is not a valid hostname) are reported until you fill them in.

**Options (both commands):**

- `--output-dir` (default: `.`): for `generate`, the target directory for the
  new `dtaas.toml` (it is created if it does not exist); for `validate`, the
  directory to look in first.
- `--force` (`generate` only): overwrite an existing `dtaas.toml`. Without it,
  an existing file is left untouched and a message is printed.

## ⚙️ Configure

After running `dtaas generate-project`, open `dtaas.toml` and fill in the
values below. The `[users]`, `[frontend]`, and config-substitution behaviour
are described in the command sections above.

### `[common]`

Set `server-dns` to your server's public hostname (`localhost` for a local
deployment) and `path` to the absolute path of your DTaaS installation.
Set `[common.security] tls = true` for HTTPS deployments.

For TLS deployments, set `[common.security].certs-src` to the directory
holding your `fullchain.pem` and `privkey.pem`.

Adjust `[common.resources]` to match your hardware:

| Key | Default | Description |
| --- | --- | --- |
| `cpus` | `4` | CPU cores per user container; may be fractional (e.g. `0.5`) |
| `mem_limit` | `"4G"` | Memory limit per container; a byte size with a required unit |
| `pids_limit` | `4960` | Process limit per container (integer) |
| `shm_size` | `"512m"` | Shared memory per container; a byte size with a required unit |

### Deployment-specific credentials

Each section name matches a `--type` value for `dtaas generate-deployment`.

**`[insecure-server]` and `[secure-server]`** GitLab OAuth app for
traefik-forward-auth (Redirect URI `https://<server-dns>/_oauth`,
Confidential ticked, scopes `openid profile read_user`):

| Key | Description |
| --- | --- |
| `oauth-url` | Base URL of your GitLab instance |
| `oauth-client-id` | Application ID |
| `oauth-client-secret` | Application secret |
| `oauth-secret` | Random string for signing session cookies |

**`[secure-server-gitlab]`** same keys as above, without `oauth-url`
(derived from the bundled GitLab service).

**`[localhost]`** single-machine deployment with an external OIDC provider:

| Key | Description |
| --- | --- |
| `default-user` | Username shown in the UI |
| `client-id` | OAuth client ID |
| `auth-authority` | OIDC provider URL |

**`[workspace-localhost]`** workspace service with Dex on localhost:

| Key | Description |
| --- | --- |
| `default-user` | Default workspace username |
| `client-id` | Dex client ID |
| `auth-authority` | Dex OIDC provider URL |

**`[workspace-secure-server]`** workspace service with Keycloak in production:

| Key | Description |
| --- | --- |
| `keycloak-admin` | Keycloak admin username |
| `keycloak-admin-password` | Keycloak admin password |
| `keycloak-realm` | Realm name (e.g. `dtaas`) |
| `keycloak-issuer-url` | OIDC issuer URL of the realm |
| `keycloak-client-id` | Client ID for the workspace service |
| `keycloak-client-secret` | Client secret |
| `oauth-secret` | Random string for signing session cookies |
| `client-id` | Frontend OAuth client ID |
| `auth-authority` | Keycloak OIDC authority URL |
