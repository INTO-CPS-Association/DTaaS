# Platform Services

Digital twins running inside DTaaS often need third-party services, and
we recommend installing them alongside the platform.
_These services can only be installed in secure (TLS) mode._

The following services can be installed:

* **Influx** time-series database and dashboard service
* **Grafana** visualisation and dashboard service
* **RabbitMQ** AMQP broker and its management interface.
  The **MQTT plugin** of this broker is enabled,
  so it can also be used as an **MQTT** broker.
* **MongoDB** database server
* **ThingsBoard** IoT device management and data visualisation platform
  (with PostgreSQL backend)
* **GitLab** OAuth2 identity provider and Git repository service

## DTaaS Services CLI

The `dtaas-services` command-line tool manages the DTaaS platform services:
MongoDB, InfluxDB, RabbitMQ, Grafana, ThingsBoard and GitLab.

## Features

* Generates a project structure with config and data directories.
* Sets up TLS certificates and file permissions with one command.
* Starts, stops and reports the status of all services.
* Creates user accounts in InfluxDB, RabbitMQ, MongoDB, PostgreSQL,
  ThingsBoard and GitLab.
* Runs on Linux, macOS and Windows.
* Reads its settings from `config/services.env`.

## Prerequisites

* Python 3.10 or higher
* Docker and Docker Compose
* TLS certificates
* Git 2.31 or later, for the GitLab projects of `user add`

## Installation

Install the package inside a Python virtual environment:

```bash
pip install dtaas-services
```

This installs the `dtaas-services` command.

To verify the installation:

```bash
dtaas-services --help
```

Commands follow the form `dtaas-services <noun> <verb>`. The nouns are
`project`, `host`, `service` and `user`, listed in the order you use them.

## Quick Start

1. Go to the desired setup location and generate the project
   structure:

   ```bash
   dtaas-services project generate
   ```

   This creates:
   * `config` for the service configuration
   * `data`, where the services store their data
   * `log` for the GitLab and ThingsBoard logs
   * `certs` for the TLS certificates the services need
   * `compose.services.yml` for the main services, including PostgreSQL
   * `compose.thingsboard.yml` for ThingsBoard
   * `compose.gitlab.yml` for GitLab

2. Update `config/services.env` with the environment values:
   * `HOSTNAME`: public hostname of the DTaaS server (used for
     certificate paths)
   * `CERTS_SRC`: directory that holds the TLS certificates to copy
   * `GITLAB_PORT`: port for the local GitLab instance (default: `8090`)
   * `GITLAB_ROOT_NEW_PASSWORD`: strong password to set for the GitLab
     root admin
   * `GITLAB_TEMPLATE_HOST` and `GITLAB_TEMPLATE_GROUP`: where the
     templates of each user's GitLab projects live (default
     `https://gitlab.com` and `dtaas`). The host must be an `https` URL.
     Set both, or remove both for GitLab accounts and tokens only. The
     defaults contact gitlab.com: without internet access, point them at
     a mirror on a host you control, or remove both
   * `GITLAB_TEMPLATE_COMMON_COMMIT` and `GITLAB_TEMPLATE_USER_COMMIT`:
     the full commit id each template is pinned to, so exactly that commit
     is pushed into every user's project (default: the commits the CLI was
     tested with). Empty means the template's default branch as it is when
     the user is added. Whoever controls the template group controls what
     every user's projects start with, including the CI configuration DTaaS
     runs when a user starts a digital twin: review a newer commit before
     you pin it
   * `TB_SYSADMIN_NEW_PASSWORD`: new password for the ThingsBoard
     system admin
   * `TB_TENANT_ADMIN_PASSWORD`: new password for the tenant admin
   * port numbers for each service
   * `USERID` and `GROUPID`: user and group ID that the Grafana
     container runs as
   * OAuth configuration (optional, to customise the GitLab OAuth app
     registrations):
     edit `config/gitlab_oauth.json` to adjust app names, redirect URIs,
     scopes or confidentiality settings before running
     `dtaas-services service install -s gitlab`.
     `dtaas-services project generate` creates this file.
     To use a different filename, set `OAUTH_APPS=<filename>` in
     `config/services.env`; the file is still looked up in `config/`.

3. Update `config/credentials.csv` with user accounts
   (format: `username,password,email`).

**Options:**

* `--path` Directory to generate the project structure in
  (default: current directory)
* `--force` Refresh the packaged files of an existing project (see below)

**Example:**

```bash
dtaas-services project generate --path /path/to/project
```

### Refreshing an existing project

By default an item that already exists is skipped, so re-running the command
is safe but picks up nothing new. After upgrading the package, `--force`
refreshes the files that ship with it:

```bash
dtaas-services project generate --force
```

It overwrites the three `compose.*.yml` files and the packaged files under
`config/`. It never touches `data/`, `log/` or `certs/`, and it never
overwrites these files, which are reported as kept:

* `services.env`, `credentials.csv`, `gitlab_oauth.json`
* `gitlab_tokens.json`, `gitlab_user_tokens.json`, `password.env.current`
* `gitlab_user_projects.json`
* `mongod.conf.secure`, `rabbitmq.conf`, `rabbitmq.enabled_plugins`

The first seven hold your settings, live credentials and the records of
the GitLab accounts the CLI made and their finished projects. The last
three are
service configuration you may have hardened locally. Overwritten files and
existing directories keep the permissions they already had, so a tightened
`config/` stays tightened. To adopt the packaged version of a kept file, copy
it aside, delete it and run the command again.

Review the refreshed files before starting the services, and re-run
`dtaas-services host setup` if certificate or service file permissions were
affected.

## Usage

### Service Setup

After generating the project and configuring the settings, run:

```bash
dtaas-services host setup
```

This command:

* copies the TLS certificates to the correct locations
* sets up MongoDB certificates and permissions
* sets up InfluxDB certificates and permissions
* sets up RabbitMQ certificates and permissions
* sets up ThingsBoard certificates and permissions

Run the clean command right after it:

```bash
dtaas-services service clean
```

### Managing Services

The `service` commands start, stop, restart, remove and report the status
of the services.

Example:

```bash
dtaas-services service start
```

To act on one service only, name it:

```bash
dtaas-services service stop -s influxdb
```

Remove services and their volumes:

```bash
dtaas-services service remove --volumes
# Specify
dtaas-services service remove --volumes -s <service_name>
```

`service status` prints a table by default. For scripting, `--json` prints a
JSON array on stdout, one object per container, so services that share a
container label are all listed:

```bash
dtaas-services service status --json
```

```json
[
  { "service": "gitlab", "container": "gitlab", "status": "running" },
  { "service": "grafana", "container": "grafana", "status": "removed" }
]
```

Failures are still reported as text on stderr, so a script can read stdout
only.

> **Note:** `-s` accepts a comma-separated list. A selector that names no
> service, such as `-s ""` from an unset shell variable, is an error rather
> than a silent "all services", so a mistyped selector cannot remove or clean
> more than you intended. Omit the flag entirely to act on all services.

### User Account Management

1. Edit `config/credentials.csv` with user accounts
   (format: `username,password,email`). List each username once:
   `user add` stops before any service when a username is on two rows,
   also when they differ only in case (GitLab ignores case in
   usernames).

2. Add users to all supported services:

    ```bash
    dtaas-services user add
    ```

    This creates user accounts in InfluxDB, RabbitMQ, MongoDB, PostgreSQL,
    ThingsBoard and GitLab. A service that is not running is skipped.
    For GitLab, a Personal Access Token is created for each new user and
    saved to `config/gitlab_user_tokens.json` (merged, so the tokens of users
    added earlier stay). Each account the CLI creates is recorded in
    `config/gitlab_user_projects.json` with its GitLab id and creation time.
    When the token of such an account could not be issued or saved, the
    next run revokes its `dtaas` tokens and issues a new one (`✅ GitLab
    token issued again for '<user>'.`). Removing a user's entry from
    `gitlab_user_tokens.json` does the same, so a token that expired can be
    replaced this way. To cut a user off, revoke their token in GitLab
    instead. Both files are checked before any account is created: one that
    cannot be read or written stops the GitLab step at once. An account
    GitLab refuses gets its own line, with GitLab's reason below it, for
    example an email that another account uses:

    ```text
      GitLab account 'user1' failed.
        GitLab did not create 'user1': 409: Email has already been taken
          GitLab has no user named 'user1'.
    ```

    When `GITLAB_TEMPLATE_HOST` and
    `GITLAB_TEMPLATE_GROUP` are set, each user also gets two private projects
    in their own namespace, `common` and `user`, filled from
    `<host>/<group>/common.git` and `.../user1.git`, at the pinned commits.
    This host clones each
    template (they must be public) and pushes it as the user, with their own
    token and no CI pipeline. One line per project says what happened:

    ```text
      ✅ GitLab project 'user1/common' created.
        Private, filled from https://gitlab.com/dtaas/common.git at commit 299d6e62e3addf074b2bbaffe4c5804ee096255c
    ```

    Before a project is created, the user's token is checked with GitLab:
    it must be valid, belong to that account and carry the
    `write_repository` or `api` scope, and the account must not be an
    administrator. Otherwise nothing is created and the line says why:
    replace the saved token when GitLab refused it, or run the command again
    when GitLab could not be reached. A project that already exists is never
    pushed to: it gets a `Warning:` (once when it has content, on every run
    while it is empty). A failed
    project fails that user only, and running the command again makes only
    the missing projects (finished ones are recorded in
    `config/gitlab_user_projects.json`, for that very account: after a
    reinstall, or when a user is deleted and added again, the new account
    gets its projects). A user whose account existed before the run, and
    was not created by the CLI, gets projects only when a token of theirs is
    saved in `config/gitlab_user_tokens.json`.

    Upgrading from 1.2.0: that version kept only the tokens of its last run
    in `gitlab_user_tokens.json`, so a user it added in an earlier run has an
    account but no saved token, and no record that the CLI created it. The
    CLI never issues a token for such an account, so every run prints
    `GitLab projects for '<user>' skipped.` for them. To give them their
    projects, save a token of theirs by hand: the user creates a personal
    access token with the `write_repository` scope (User settings, Access
    tokens), or an administrator creates one for them with
    `POST /users/:id/personal_access_tokens`. Add `"<user>": "<token>"` to
    `config/gitlab_user_tokens.json`, then run
    `dtaas-services user add -s gitlab` again.

3. Add users to a specific service:

    ```bash
    dtaas-services user add -s rabbitmq
    ```

## ThingsBoard

We recommend ThingsBoard for digital twins that need IoT device management.
It can only be installed in secure (TLS) mode.

The ThingsBoard setup uses two services:

* **ThingsBoard**, an IoT device management and data visualisation platform
* **PostgreSQL**, the database server for ThingsBoard

### ThingsBoard Installation

> **Warning:** Running `dtaas-services service install -s thingsboard`
> more than once re-runs the ThingsBoard schema migration against an
> already populated PostgreSQL database, which can corrupt it. To reinstall
> from scratch, first run
> `dtaas-services service clean -s "postgres,thingsboard"` to wipe all data,
> then re-run the install command.
> **Note:** Name the service explicitly with `-s <service>` when installing.
> Run the clean command before the installation.

```bash
# It starts PostgreSQL if it is not running, and it checks its health.
dtaas-services service install -s thingsboard
```

```bash
dtaas-services service start -s thingsboard
```

```bash
# After installation, wait some time before adding users.
# This creates the tenant, tenant admin, and users.
dtaas-services user add -s thingsboard
```

Reset the ThingsBoard sysadmin and tenant admin passwords to the values
configured in `config/services.env`:

```bash
dtaas-services user reset-password -s thingsboard
```

This command:

* changes the sysadmin password from the default (`"sysadmin"`) to
  `TB_SYSADMIN_NEW_PASSWORD`
* changes the tenant admin password from the default (`"tenant"`) to
  `TB_TENANT_ADMIN_PASSWORD`

### GitLab Installation

**Prerequisites:**

* The GitLab container joins the `dtaas-services` Docker network
  (`platform-services` in the compose files), which is created when the
  other platform services start. Start them first with
  `dtaas-services service start` before installing GitLab.
* Set `REACT_APP_AUTH_AUTHORITY` in the client config file to
  `https://<hostname>:<GITLAB_PORT>/gitlab`.

> **Note:** The DTaaS client uses `react-oidc-context`, which forces
> redirects to use HTTPS. GitLab must therefore be served over HTTPS
> at `https://<hostname>:<GITLAB_PORT>/gitlab`.

To install and configure the local GitLab instance:

```bash
dtaas-services service install -s gitlab
```

GitLab takes 5 to 10 minutes to become healthy after the first start.
The install command checks GitLab readiness and returns immediately:

* If GitLab is healthy, the command runs the post-install setup
  (PAT creation, OAuth app registration and, on the first install, root
  password reset) and saves each secret to `config/gitlab_tokens.json` as
  soon as it exists, so a later failing step cannot lose it.
* If GitLab is not ready, the command prints a status hint
  and exits. Check progress with `dtaas-services service status -s gitlab`
  and re-run `dtaas-services service install -s gitlab` once the status
  shows `running`. Status shows GitLab as `starting` while Docker's health
  check starts up, then as `not ready` (`unhealthy` with `--json`) until
  its `/-/readiness` check passes, the same check the install waits for.
  A GitLab that ran before and shows `not ready` has a failing part, such
  as Gitaly or the database.

> **Note:** After the first successful setup, `config/gitlab_tokens.json` is backed
> up to `config/backup_gitlab_tokens.json` and the `root_password` entry is
> removed from the live tokens file. A rerun neither reads the initial
> password nor resets root's password; use
> `dtaas-services user reset-password -s gitlab` for that.
> If the GitLab installation becomes corrupted before the root password is
> changed, the initial password can be found in the backup file
> `config/backup_gitlab_tokens.json`.
> If that file is also missing, re-install GitLab to generate a new
> initial password.
> **Warning:** The CLI manages `config/password.env.current`, which tracks
> the current service passwords. Do **not** edit or delete this file
> manually; doing so may cause the password reset commands to fail.

To complete the OAuth2 integration with DTaaS and set up GitLab Runner,
follow the [integration guide](../gitlab/integration.md) and the runner
setup guide for either [Linux](../gitlab/runner-linux.md) or
[Windows](../gitlab/runner-windows.md).

Reset the GitLab root admin password to the value configured in
`config/services.env` (`GITLAB_ROOT_NEW_PASSWORD`):

```bash
dtaas-services user reset-password -s gitlab
```

The command reads the new password from `GITLAB_ROOT_NEW_PASSWORD`
and applies it through the GitLab API.

## GitLab Post-Install Flow

The `dtaas-services service install -s gitlab` command performs these
steps:

1. Starts the GitLab Docker container.
2. Checks whether GitLab is healthy and its `/-/readiness` check passes
   inside the container.
3. On the first install only, reads the auto-generated root password from
   the container (`/etc/gitlab/initial_root_password`).
4. Creates a Personal Access Token with `gitlab-rails runner` inside the
   container (about a minute) and saves it, with the initial password, to
   `config/gitlab_tokens.json`.
5. Creates the server and client OAuth applications owned by root (root's
   **User Settings > Applications**) with `gitlab-rails runner` (about a
   minute) and saves their details to `config/gitlab_tokens.json`, even
   when only one of them succeeded.
6. On the first install only, resets the root password to
   `GITLAB_ROOT_NEW_PASSWORD`, backs up the tokens file to
   `config/backup_gitlab_tokens.json` and removes the root password from
   `config/gitlab_tokens.json`.

### Rerunning the GitLab Install

A rerun of `dtaas-services service install -s gitlab` replaces the
Personal Access Token and applies `config/gitlab_oauth.json` to root's
OAuth applications again:

* Root's applications keep their client ids and secrets. GitLab stores
  secrets hashed, so the kept secrets come from `config/gitlab_tokens.json`.
  If that file has no secret for an application's client id, the install
  stops and asks for `--rotate-secrets`.
* `--rotate-secrets` renews the client secrets of root's applications.
* Instance wide applications with the configured names (made by version
  1.1.0 and earlier, or by hand in **Admin Area > Applications**) are
  listed and left alone. `--replace-instance-apps` deletes them, and with
  them the tokens they issued.
* When an application gets a new client id or secret, the install names
  it. Copy the new values from `config/gitlab_tokens.json` into the DTaaS
  configuration (see the [integration guide](../gitlab/integration.md)).
* Both flags only affect GitLab; a ThingsBoard install ignores them.

To move an installation made by 1.1.0 to root's applications, rerun the
install (root's applications are created next to the old ones), switch
DTaaS to the new credentials, then rerun with `--replace-instance-apps`.

## Manual Compose Operations

After generating a services project, you can also run the services
directly with the compose files:

* `compose.services.yml`
* `compose.thingsboard.yml`
* `compose.gitlab.yml`

Start manually:

```bash
docker compose -f compose.services.yml --env-file config/services.env up -d
docker compose -f compose.thingsboard.yml --env-file config/services.env up -d
docker compose -f compose.gitlab.yml --env-file config/services.env up -d
```

Stop manually:

```bash
docker compose -f compose.services.yml --env-file config/services.env down
docker compose -f compose.thingsboard.yml --env-file config/services.env down
docker compose -f compose.gitlab.yml --env-file config/services.env down
```

## Troubleshooting

### Permission Issues (Linux/macOS)

```bash
sudo -E env PATH="$PATH" dtaas-services host setup
```

`service install` must run as root, so the files it writes under `config/`
(`gitlab_tokens.json`, `password.env.current` and their `.lock` files)
belong to root, and so do the files of any command run with `sudo`. A
later command run as yourself, such as `user add` or `service remove`, then
stops with `Permission denied: <file>` and the command that fixes it, which
names the file and its lock file:

```bash
sudo chown "$USER": config/gitlab_tokens.json config/gitlab_tokens.json.lock
```

When the `config/` folder itself cannot be written, the message names the
folder and its `chown` instead (the folder alone, so the files in it keep
their owners), also when the file it could not make is a lock file that
does not exist yet. The `chown` names only files that exist. Any other
file is named as it is, with no advice to change its owner: `host setup`
gives some files to the users of the services on purpose. On Windows the
error is shown as it is.

Run `user add` without `sudo` afterwards, so the GitLab projects are pushed
and the files it writes are owned by you.

Commands that change the same file under `config/` at once take turns on
its `.lock` file, so no entry is lost. One that waits more than 30 seconds
stops with `<file> is being changed by another dtaas-services command`.

When `user reset-password` or `service install` changed a password but
cannot record it in `config/password.env.current` (its lock not released
in time, a file that belongs to root, a full disk), the service already
uses the new password and the command says so, naming the key and where
the password is set, for example:

```text
GitLab: GitLab root password updated. GITLAB_ROOT_CURRENT_PASSWORD could not be recorded. The service already uses the password set by GITLAB_ROOT_NEW_PASSWORD in config/services.env: add the line GITLAB_ROOT_CURRENT_PASSWORD=<that password> to config/password.env.current by hand. Why: ...
```

Add that line as it says, or fix the cause and run
`dtaas-services user reset-password` for that service, which sets the same
password again and records it.

### Docker connectivity

```bash
docker ps
```

### ThingsBoard connection error

ThingsBoard needs time to initialise after it starts. Wait before adding
users or changing passwords.
