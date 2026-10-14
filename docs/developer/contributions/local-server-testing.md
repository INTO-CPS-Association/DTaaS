# Local Server Testing

The `server`, `secure-server` and `secure-server_with_integrated-gitlab`
packages, and the services CLI, expect a server with a domain name and
TLS certificates. This guide runs them on one development machine
under the hostname `intocps.test`, with certificates from a local
certificate authority.

The `.test` top-level domain is reserved (RFC 6761) and never resolves
on the public Internet, so the hostname cannot hide a real website.
Do not use `intocps.org`; it is the project's public domain.

The commands below are for Linux with
[Rancher Desktop](https://rancherdesktop.io/) as the container runtime.
Steps that apply only to Rancher Desktop say so.

## What This Covers

The setup tests the compose files, Traefik routing, TLS, the OAuth 2.0
sign-in flow, the GitLab container registry and GitLab runners. It does
not test public certificates, public DNS, firewalls or access from other
machines.

## 1. Add the Hostname

```bash
echo "127.0.0.1 intocps.test" | sudo tee -a /etc/hosts
```

The browser, `curl` and `docker login` now resolve `intocps.test` to
the local machine. Rancher Desktop forwards the host's `/etc/hosts` to
its virtual machine and to containers, where `127.0.0.1` means the
container itself. Step 6 handles that.

## 2. Allow Ports 80 and 443 (Rancher Desktop)

Rancher Desktop runs as a normal user, so Linux stops it from binding
ports below 1024. Lower the limit:

```bash
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
# Keep the setting after a reboot (optional)
echo "net.ipv4.ip_unprivileged_port_start=80" |
  sudo tee /etc/sysctl.d/99-rancher-desktop.conf
```

GitLab needs at least 4 GB of memory. Give the Rancher Desktop virtual
machine 8 GB and keep Kubernetes off:

```bash
rdctl start --kubernetes.enabled=false --container-engine.name=moby \
  --virtual-machine.memory-in-gb 8 --virtual-machine.number-cpus 4
```

## 3. Create a Local Certificate Authority

Install [mkcert](https://github.com/FiloSottile/mkcert). `libnss3-tools`
lets mkcert add its root CA to Firefox and Chrome.

```bash
sudo apt install mkcert libnss3-tools
mkcert -install
```

`mkcert -install` creates a root CA in `$(mkcert -CAROOT)` and adds it
to the system and browser trust stores. Restart the browser afterwards.

## 4. Prepare a Package

Copy the package out of the repository so that test data and secrets
stay out of Git. On Rancher Desktop the copy must be under your home
directory, which is the only host directory the virtual machine mounts.

```bash
mkdir -p ~/dtaas-local-test
cp -r deploy/dtaas/docker/secure-server_with_integrated-gitlab \
  ~/dtaas-local-test/integrated-gitlab
cd ~/dtaas-local-test/integrated-gitlab
cp config/.env.example config/.env
cp config/conf.server.example config/conf.server
cp config/client.js.example config/client.js
```

Set `SERVER_DNS=intocps.test` in `config/.env`, and replace the example
hostname with `intocps.test` in every URL in `config/.env` and
`config/client.js`. Then create the TLS certificates:

```bash
mkcert -cert-file certs/fullchain.pem -key-file certs/privkey.pem \
  intocps.test localhost 127.0.0.1 ::1
```

For the `server` and `secure-server` packages, register the OAuth 2.0
applications on <https://gitlab.com> with redirect URIs under
`https://intocps.test`. The browser follows the redirects, so
gitlab.com does not need to reach the machine.

## 5. Build a CA-Aware traefik-forward-auth Image

`traefik-forward-auth` exchanges the OAuth 2.0 code with GitLab from
inside its container. The upstream `thomseddon/traefik-forward-auth:latest`
image does not trust the mkcert CA, so an exchange over HTTPS with a
GitLab that uses an mkcert certificate fails with
`x509: certificate signed by unknown authority`. That happens, for
example, when the `secure-server` package uses the services CLI GitLab
at `https://intocps.test:8090/gitlab`. In the integrated GitLab package
the exchange goes to `http://gitlab` inside the Docker network, so the
upstream image works there too.

Build an image that trusts the mkcert CA:

```bash
mkdir -p ~/dtaas-local-test/forward-auth
cd ~/dtaas-local-test/forward-auth
cp "$(mkcert -CAROOT)/rootCA.pem" rootCA.crt
cat > Dockerfile <<'EOF'
# Stage 1: prepare the root CA certificate
FROM alpine:latest AS cert-builder
RUN apk add --no-cache ca-certificates
COPY rootCA.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

# Stage 2: copy the updated certificate bundle into the final image
FROM thomseddon/traefik-forward-auth:latest
COPY --from=cert-builder /etc/ssl/certs/ca-certificates.crt \
     /etc/ssl/certs/ca-certificates.crt
CMD ["traefik-forward-auth"]
EOF
docker build -t traefik-forward-auth-local:latest .
```

The [self-signed certificates guide](../../admin/guides/self-signed-certs.md)
explains the same image for servers.

## 6. Add a Compose Override

Create `compose.local.yml` next to `docker-compose.yml`, instead of
editing the package's compose file:

```yaml
services:
  traefik:
    networks:
      frontend:
        aliases:
          - intocps.test
      users: {}
  traefik-forward-auth:
    image: traefik-forward-auth-local:latest
  gitlab:
    hostname: gitlab
    volumes:
      - gitlab-config:/etc/gitlab
      - gitlab-logs:/var/log/gitlab
      - gitlab-data:/var/opt/gitlab

volumes:
  gitlab-config:
  gitlab-logs:
  gitlab-data:
```

- The network alias makes `intocps.test` resolve to Traefik inside the
  `dtaas-frontend` network, for containers such as GitLab runners.
- Docker also publishes a container's `hostname` on the network. The
  package sets GitLab's hostname to `SERVER_DNS`, which would make
  `intocps.test` resolve to GitLab instead, so the override renames it.
- The named volumes replace the GitLab bind mounts, so GitLab's data
  stays on the virtual machine's disk rather than on the `sshfs` mount
  through which Rancher Desktop shares the home directory.

On Rancher Desktop, create the bind-mounted directories before the
first start, because Docker cannot create them on the `sshfs` mount:

```bash
mkdir -p logs/logger
cp -R files/template files/user1
cp -R files/template files/user2
```

Start the services with both files:

```bash
docker compose --env-file config/.env \
  -f docker-compose.yml -f compose.local.yml up -d
```

GitLab takes several minutes to start. Its container reports
`healthy` before the web interface is ready; wait until
<https://intocps.test/gitlab> loads. The `root` password is in the
container:

```bash
docker exec gitlab grep Password: /etc/gitlab/initial_root_password
```

Continue with the package's install guide from the step that creates
the OAuth 2.0 applications.

## 7. Test the Registry and Runners

[Local Registry Testing](local-registry-testing.md) continues from
here with the container registry and a GitLab runner.

## 8. Clean Up

```bash
cd ~/dtaas-local-test/integrated-gitlab
docker compose --env-file config/.env \
  -f docker-compose.yml -f compose.local.yml down -v
rdctl shutdown
```

To undo the machine changes, remove the `intocps.test` line from
`/etc/hosts`, delete `/etc/sysctl.d/99-rancher-desktop.conf`, and run
`mkcert -uninstall` to remove the root CA from the trust stores.
