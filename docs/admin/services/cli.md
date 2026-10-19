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
  The **Web MQTT plugin** is enabled too, on `RABBITMQ_WEB_MQTT_PORT`,
  so the web client can read live sensor values in the browser
  (see `REACT_APP_VIZ_MQTT_URL` in the client configuration).
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
* `gitlab_tokens.json`, `gitlab_user_tokens.json`, `current.passwords.env`
* `mongod.conf.secure`, `rabbitmq.conf`, `rabbitmq.enabled_plugins`

The first six hold your settings and live credentials; the last three are
service configuration you may have hardened locally. Overwritten files and
existing directories keep the permissions they already had, so a tightened
`config/` stays tightened. To adopt the packaged version of a kept file, copy
it aside, delete it and run the command again.

Review the refreshed files before starting the services, and re-run
`dtaas-services host setup` if certificate or service file permissions were
affected.

#### Adding Web MQTT to an Existing Install

`--force` keeps `services.env`, `rabbitmq.conf` and
`rabbitmq.enabled_plugins`, so a project generated before the Web MQTT plugin
was added does not get it from a refresh. Add it by hand:

* `config/rabbitmq/rabbitmq.enabled_plugins`: add `rabbitmq_web_mqtt` to the
  list.
* `config/rabbitmq/rabbitmq.conf`: copy the `Web MQTT section` from the
  packaged file.
* `config/services.env`: add `RABBITMQ_WEB_MQTT_PORT=8091`, or another free
  port. The compose file uses 8091 when the key is missing.

Alternatively, move the three files aside, run the command again and carry
your own settings over into the regenerated files.

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
   (format: `username,password,email`).

2. Add users to all supported services:

    ```bash
    dtaas-services user add
    ```

    This creates user accounts in InfluxDB, RabbitMQ, MongoDB, PostgreSQL,
    ThingsBoard and GitLab. A service that is not running is skipped.
    For GitLab, a Personal Access Token is created for each new user and
    saved to `config/gitlab_user_tokens.json`.

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
  (PAT creation, OAuth app registration and root password reset) and
  saves the tokens to `config/gitlab_tokens.json`.
* If GitLab is still starting, the command prints a status hint
  and exits. Check progress with `dtaas-services service status -s gitlab`
  and re-run `dtaas-services service install -s gitlab` once the status
  shows `running`.

> **Note:** After a successful setup, `config/gitlab_tokens.json` is backed
> up to `config/backup_gitlab_tokens.json` and the `root_password` entry is
> removed from the live tokens file.
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
2. Checks whether GitLab is healthy.
3. Reads the auto-generated root password from the container
   (`/etc/gitlab/initial_root_password`).
4. Creates an initial Personal Access Token.
5. Creates the server and client OAuth applications.
6. Saves the root password, token and OAuth application details to
   `config/gitlab_tokens.json`.
7. Resets the root password to `GITLAB_ROOT_NEW_PASSWORD`.
8. Backs up the tokens file to `config/backup_gitlab_tokens.json` and
   removes the root password from `config/gitlab_tokens.json`.

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

### Docker connectivity

```bash
docker ps
```

### ThingsBoard connection error

ThingsBoard needs time to initialise after it starts. Wait before adding
users or changing passwords.
