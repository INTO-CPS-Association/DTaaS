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
| `cpus` | `4` | Virtual CPUs per user container |
| `mem_limit` | `"4G"` | Memory limit per container |
| `pids_limit` | `4960` | Process limit per container |
| `shm_size` | `"512m"` | Shared memory per container |

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
