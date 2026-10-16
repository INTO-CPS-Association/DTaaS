# Local Server Testing

The `server`, `secure-server` and `secure-server_with_integrated-gitlab`
packages, and the services CLI, expect a server with a domain name and
TLS certificates. This guide runs the integrated GitLab package on one
development machine under the hostname `intocps.test`, with
certificates from a local certificate authority.

The `.test` top-level domain is reserved (RFC 6761) and never resolves
on the public Internet, so the hostname cannot hide a real website.
Do not use `intocps.org`; it is the project's public domain.

## What This Covers

The setup tests the compose files, Traefik routing, TLS, the OAuth 2.0
sign-in flow, the GitLab container registry and GitLab runners. It does
not test public certificates, public DNS, firewalls or access from other
machines.

## Prerequisites

- Linux with Python 3.10 or later and `sudo` rights.
- Docker Engine, Docker Desktop or [Rancher Desktop](https://rancherdesktop.io/),
  running. GitLab needs at least 4 GB of memory; on Rancher Desktop,
  give the virtual machine 8 GB and keep Kubernetes off:

  ```bash
  rdctl start --kubernetes.enabled=false --container-engine.name=moby \
    --virtual-machine.memory-in-gb 8 --virtual-machine.number-cpus 4
  ```

- [mkcert](https://github.com/FiloSottile/mkcert), or `apt-get` so that
  the script can install it.

## Run the Script

From the repository root:

```bash
python3 developer/local-server/local_server.py all
```

The script asks for the `sudo` password when it changes the host. The
first run takes about ten minutes, most of it waiting for GitLab. It
ends with the [registry check](local-registry-testing.md) and prints
`Registry check passed.` when everything works.

Then open <https://intocps.test> and sign in as `user1` or `user2`. The
passwords, and a root access token for the GitLab API, are in
`~/dtaas-local-test/secrets/`. The GitLab `root` password is in the
GitLab container:

```bash
docker exec gitlab grep Password: /etc/gitlab/initial_root_password
```

`all` runs these commands in order. Each one can also run on its own
and can be repeated:

| Command     | What it does                                                       |
| :---------- | :----------------------------------------------------------------- |
| `host`      | Changes the host: hosts entry, port limit, mkcert CA, registry CA  |
| `package`   | Copies and configures the package, builds the forward-auth image   |
| `up`        | Starts the services and waits until GitLab and the registry answer |
| `configure` | Creates the GitLab users and the OAuth 2.0 applications            |
| `check`     | Tests the registry by hand and from a pipeline                     |
| `down`      | Stops the runner and the services, keeping GitLab's data           |
| `clean`     | Stops everything, deletes GitLab's data and the hosts entry        |

Every command accepts `--hostname` (default `intocps.test`),
`--registry-port` (default `5050`) and `--workdir` (default
`~/dtaas-local-test`). On Rancher Desktop the working directory must be
under your home directory, the only host directory its virtual machine
mounts.

## What the Script Changes

### Host

The script adds `127.0.0.1 intocps.test` to `/etc/hosts`.
On Rancher Desktop, which runs as a normal user, it also lowers
`net.ipv4.ip_unprivileged_port_start` to 80 so that ports 80 and 443
can be forwarded, and keeps the setting in
`/etc/sysctl.d/99-rancher-desktop.conf`. It installs mkcert if needed
and runs `mkcert -install`, which adds the mkcert root CA to the system
and browser trust stores. Restart the browser afterwards.

### Package

The script copies the package to
`~/dtaas-local-test/integrated-gitlab`, so test data and secrets stay
out of Git. It sets `SERVER_DNS`, `OAUTH_URL` and `REGISTRY_PORT` in
`config/.env`, replaces `intocps.org` in `config/client.js`, and creates
a certificate for `intocps.test`. It also creates the bind-mounted
directories, because Docker on Rancher Desktop cannot create them on
the `sshfs` mount of the home directory.

### Forward-Auth Image

The upstream
`thomseddon/traefik-forward-auth:latest` image does not trust the
mkcert CA, so an OAuth 2.0 code exchange over HTTPS with a GitLab that
uses an mkcert certificate fails with
`x509: certificate signed by unknown authority`. That happens, for
example, when the `secure-server` package uses the services CLI GitLab
at `https://intocps.test:8090/gitlab`. The script builds
`traefik-forward-auth-local:latest` from
`developer/local-server/forward-auth/Dockerfile`, which adds the mkcert
CA to the upstream image as the
[self-signed certificates guide](../../admin/guides/self-signed-certs.md)
describes. In the integrated GitLab package the exchange goes to
`http://gitlab` inside the Docker network, so the upstream image would
also work there.

### Compose Override

The script copies `developer/local-server/compose.local.yml` next to
the package's `docker-compose.yml`, and the `up` and `down` commands
pass both files to Docker Compose. The package's own compose file is
used unchanged, so the test covers what ships. The override does four
things:

- A network alias makes `intocps.test` resolve to Traefik inside the
  `dtaas-frontend` network, for containers such as GitLab runners.
- GitLab's `hostname` becomes `gitlab`. Docker publishes a container's
  hostname on its networks, and the package sets GitLab's hostname to
  `SERVER_DNS`, which would make `intocps.test` resolve to GitLab
  instead of Traefik.
- The override uses the forward-auth image above.
- Named volumes replace the GitLab bind mounts, so GitLab's data stays
  on the virtual machine's disk instead of the `sshfs` mount.

### GitLab

GitLab reports `healthy` minutes before its web interface
works, so the script waits for the sign-in page and the registry
instead. It then creates `user1` and `user2` with the emails that
`config/conf.server` allows, registers the two OAuth 2.0 applications,
writes their IDs into `config/.env` and `config/client.js`, and
recreates the `client` and `traefik-forward-auth` services.

## Other Packages

The `server` and `secure-server` packages use OAuth 2.0 applications on
<https://gitlab.com>, which the script cannot create. Prepare them by
hand with the same hostname and certificate: register the applications
with redirect URIs under `https://intocps.test`. The browser follows
the redirects, so gitlab.com does not need to reach the machine.

## Clean Up

```bash
python3 developer/local-server/local_server.py clean
rdctl shutdown
```

`clean` keeps the mkcert CA and the port setting. To remove them, run
`mkcert -uninstall` and delete `/etc/sysctl.d/99-rancher-desktop.conf`.
