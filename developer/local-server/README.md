# Local Server

A script that runs the integrated GitLab installation package
(`deploy/dtaas/docker/secure-server_with_integrated-gitlab`) on one
Linux machine under the hostname `intocps.test`, with certificates from
a local certificate authority. It then tests the GitLab container
registry by hand and from a CI/CD pipeline.

The script tests what ships: it runs the package's own
`docker-compose.yml` from `deploy/` and adds only a small override for
running on one machine. It never changes files in `deploy/`.

The `.test` top-level domain is reserved (RFC 6761) and never resolves
on the public Internet, so the hostname cannot hide a real website. Do
not use `intocps.org`; it is the project's public domain.

## Prerequisites

- Linux with Python 3.10 or later and `sudo` rights. The script needs
  no Python packages.
- Docker Engine, Docker Desktop or Rancher Desktop, running, with 8 GB
  of memory for the containers; a 16 GB host is comfortable. On Rancher
  Desktop, give the virtual machine 8 GB and keep Kubernetes off:

  ```bash
  rdctl start --kubernetes.enabled=false --container-engine.name=moby \
    --virtual-machine.memory-in-gb 8 --virtual-machine.number-cpus 4
  ```

- [mkcert](https://github.com/FiloSottile/mkcert), or `apt-get` so that
  the script can install it.

## Quick Start

From the repository root:

```bash
python3 developer/local-server/src/local_server.py all
```

The script asks for the `sudo` password when it changes the host. The
first run takes about ten minutes, most of it waiting for GitLab, and
ends with `Registry check passed.` when everything works.

Then open <https://intocps.test> and sign in as `user1` or `user2`. The
passwords and a root access token for the GitLab API are in
`~/dtaas-local-test/secrets/`. For the GitLab `root` password, run
`docker exec gitlab grep Password: /etc/gitlab/initial_root_password`.

## Commands

`all` runs `host`, `package`, `up`, `configure` and `check` in order.
Every command can also run on its own and can be repeated.

| Command     | What it does                                                       |
| :---------- | :----------------------------------------------------------------- |
| `host`      | Changes the host: hosts entry, port limit, mkcert CA, registry CA  |
| `package`   | Copies and configures the package, builds the forward-auth image   |
| `up`        | Starts the services and waits until GitLab and the registry answer |
| `configure` | Creates the GitLab users and the OAuth 2.0 applications            |
| `check`     | Tests the registry by hand and from a pipeline                     |
| `down`      | Stops the runner and the services, keeping GitLab's data           |
| `clean`     | Stops everything, deletes GitLab's data and the hosts entry        |

| Option            | Default              | Meaning                                       |
| :---------------- | :------------------- | :-------------------------------------------- |
| `--hostname`      | `intocps.test`       | Hostname of the test server                   |
| `--registry-port` | `5050`               | Port of the container registry                |
| `--workdir`       | `~/dtaas-local-test` | Working directory for the copy and the secrets |

On Rancher Desktop the working directory must be under your home
directory, the only host directory its virtual machine mounts.

## What the Script Changes

### Host (`host`)

- Adds `127.0.0.1 intocps.test` to `/etc/hosts`.
- On Rancher Desktop, which runs as a normal user, lowers
  `net.ipv4.ip_unprivileged_port_start` to 80 so that ports 80 and 443
  can be forwarded, and keeps the setting in
  `/etc/sysctl.d/99-dtaas-local-server.conf`.
- Installs mkcert and `libnss3-tools` with `apt-get` if mkcert is
  missing, and runs `mkcert -install`, which adds the mkcert root CA to
  the system and browser trust stores. Restart the browser afterwards.
- Copies the root CA to where the Docker daemon looks for the
  registry's CA; see [Registry CA Locations](#registry-ca-locations).

### Package (`package`)

- Copies the package to `~/dtaas-local-test/integrated-gitlab` once, so
  test data and secrets stay out of Git, and copies the package's
  `docker-compose.yml` again on every run so that the copy follows
  `deploy/`.
- Sets `SERVER_DNS`, `OAUTH_URL` and `REGISTRY_PORT` in `config/.env`
  on every run, so change the port with `--registry-port`, not in the
  file. Replaces `intocps.org` in `config/client.js`.
- Creates the bind-mounted directories (`logs/logger`, `files/user1`,
  `files/user2`). Docker on Rancher Desktop cannot create them on the
  `sshfs` mount of the home directory.
- Creates a TLS certificate for the hostname with mkcert.
- Copies `compose.local.yml` next to the package's compose file.
- Builds `traefik-forward-auth-local:latest` from
  `forward-auth/Dockerfile`. The upstream image does not trust the
  mkcert CA, so an OAuth 2.0 code exchange over HTTPS with a GitLab
  that uses an mkcert certificate fails with
  `x509: certificate signed by unknown authority`. That happens, for
  example, when the `secure-server` package uses the services CLI
  GitLab at `https://intocps.test:8090/gitlab`. In the integrated
  package the exchange goes to `http://gitlab` inside the Docker
  network, so the upstream image would also work there.

### Compose Override (`compose.local.yml`)

- A network alias makes the hostname resolve to Traefik inside the
  `dtaas-frontend` network, for containers such as runner jobs.
- GitLab's `hostname` becomes `gitlab`. Docker publishes a container's
  hostname on its networks, and the package sets GitLab's hostname to
  `SERVER_DNS`, which would make the hostname resolve to GitLab instead
  of Traefik.
- `traefik-forward-auth` uses the image built above.
- Named volumes replace the GitLab bind mounts, so GitLab's data stays
  on the Docker host's disk instead of the `sshfs` mount.

### Services and GitLab (`up`, `configure`)

- `up` starts every service, then waits for the GitLab sign-in page
  and for the registry to answer `401`. GitLab reports `healthy`
  minutes before its web interface works.
- `configure` creates a root access token, creates `user1` and `user2`
  with the emails that `config/conf.server` allows, and registers the
  two OAuth 2.0 applications when GitLab does not have them. It writes
  the application IDs into `config/.env` and `config/client.js` and
  recreates the `client` and `traefik-forward-auth` services.

### Registry Check (`check`)

- Logs in to the registry with the root token, then pushes and pulls an
  image in the project `dtaas/registry-test`.
- Checks that `user2`, who is not a project member, cannot pull it.
- Registers an instance runner and starts it from
  `~/dtaas-local-test/runner` with `runner/compose.yml` and
  `runner/config.toml.template`. The runner and its jobs join
  `dtaas-frontend`, the runner is not privileged, and it gives jobs the
  CA in `CI_SERVER_TLS_CA_FILE`.
- Commits `registry-test.gitlab-ci.yml` with `[skip ci]` if it changed,
  then starts one pipeline. Its first job publishes an image with
  `crane`; its second job runs inside that image. The check passes when
  both jobs succeed and `user2` was refused.

## Registry CA Locations

| Runtime                 | CA location                                                         |
| :---------------------- | :------------------------------------------------------------------ |
| Docker Engine (Linux)   | `/etc/docker/certs.d/<host>:<port>/ca.crt`, written with `sudo`     |
| Docker Engine in WSL2   | `/etc/docker/certs.d/<host>:<port>/ca.crt` inside the distribution  |
| Docker Desktop          | macOS: `~/.docker/certs.d/<host>:<port>/ca.crt` or the keychain. Windows: the Windows certificate store. Restart Docker Desktop afterwards |
| Rancher Desktop (Linux) | `~/.docker/certs.d/<host>:<port>/ca.crt`, linked into its virtual machine |

The script picks the location from the Docker context and the daemon's
system name, so it also recognises Docker Desktop's WSL integration. It
writes `~/.docker/certs.d` for Docker Desktop, which Docker documents
for macOS only; on Windows, add the CA to the certificate store too.

## Files

| Path                          | Purpose                                                |
| :---------------------------- | :----------------------------------------------------- |
| `src/local_server.py`         | Command line and the order of the steps                |
| `src/settings.py`             | Hostname, port, working directory and derived paths    |
| `src/shell.py`                | Runs commands, with or without `sudo`                  |
| `src/host.py`                 | Hosts entry, port limit, mkcert, registry CA           |
| `src/package.py`              | Package copy, configuration, certificate, image        |
| `src/stack.py`                | `docker compose` with the override, readiness wait     |
| `src/gitlab.py`               | GitLab REST API client and the root token              |
| `src/configure.py`            | Users, OAuth 2.0 applications, secrets                 |
| `src/runner.py`               | Runner registration and its compose project            |
| `src/registry_check.py`       | Push and pull, pipeline run                            |
| `compose.local.yml`           | Override copied next to the package's compose file     |
| `forward-auth/Dockerfile`     | traefik-forward-auth image that trusts the mkcert CA   |
| `runner/`                     | Compose file and configuration template of the runner  |
| `registry-test.gitlab-ci.yml` | Pipeline that publishes an image and runs a job in it  |
| `tests/`                      | Unit tests                                             |
| `requirements.txt`            | Pinned checking tools: flake8, pylint and pytest       |

## Development

The unit tests replace `subprocess`, `sudo` and the GitLab API with
test doubles, so they need neither Docker nor GitLab. From this
directory:

```bash
pip install -r requirements.txt
flake8 src tests --max-complexity=10 --max-line-length=127
pylint src tests --rcfile=../../.pylintrc --recursive=y
python -m pytest
```

`pytest.ini` puts `src/` and `tests/` on the import path. The
`Local Server Script` workflow (`.github/workflows/developer-local-server.yml`)
runs the same checks on Python 3.10 and 3.14, and renders the
integrated package with a custom registry port. Run `all` before
opening a pull request that changes the script or the integrated
package.

## Troubleshooting

- **`up` takes long or times out.** GitLab answers `502` for several
  minutes after it starts; `up` waits up to 20 minutes. Check progress
  with `docker logs gitlab`.
- **Ports 80 or 443 cannot be bound on Rancher Desktop.** Run `host`
  again, or check `sysctl net.ipv4.ip_unprivileged_port_start`.
- **`docker login` fails with `x509`.** The Docker daemon does not
  trust the CA. Run `host`, and restart Docker Desktop if you use it.
- **The registry redirects to the GitLab sign-in.** The package's
  Traefik router for the registry lost its priority. Run `package` to
  copy the current compose file from `deploy/`, then `up`.
- **A pipeline job stays in `running` without a log.** GitLab restarted
  while the job started. Run `check` again.
- **Old runners in Admin > CI/CD > Runners.** Each `check` registers a
  new runner; the earlier ones stay offline and can be deleted.
- **Rancher Desktop stops in the middle of a run.** The host ran out of
  memory; `journalctl --user | grep oom-kill` shows it. Close other
  applications, start Rancher Desktop again, then run `up` and `check`.

## Limitations

- Only the integrated GitLab package is automated. The `server` and
  `secure-server` packages use OAuth 2.0 applications on gitlab.com,
  which must be registered by hand with redirect URIs under
  `https://intocps.test`.
- Public certificates, public DNS, firewalls and access from other
  machines are not tested.

## Clean Up

```bash
python3 developer/local-server/src/local_server.py clean
```

`clean` keeps the mkcert CA (`mkcert -uninstall` removes it), the
`intocps.test:*` registry CA directories and the port setting file.

## More Documentation

- [Local Server Testing](../../docs/developer/contributions/local-server-testing.md)
- [Local Registry Testing](../../docs/developer/contributions/local-registry-testing.md)
- [Local Server Script](../../docs/developer/codebase/local-server.md)
