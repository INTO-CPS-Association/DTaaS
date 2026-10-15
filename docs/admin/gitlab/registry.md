# Container Registry

The GitLab instances that DTaaS installs include GitLab's container
registry. Users and digital twin pipelines can store container images
in their GitLab projects and reuse them later. An image belongs to the
project it is pushed to, and only users with access to that project can
pull it.

The registry has its own port, `5050` by default. The Docker registry
API must be served at `/v2/` on the root of a host, so it cannot share
the `/gitlab` path with the GitLab web interface.

## Configuration

| Installation                                                       | Variable               | File                  |
| :----------------------------------------------------------------- | :--------------------- | :-------------------- |
| [Integrated GitLab package](../dtaas/secure-server-gitlab/install.md) | `REGISTRY_PORT`        | `config/.env`         |
| [Services CLI](../services/cli.md)                                 | `GITLAB_REGISTRY_PORT` | `config/services.env` |

Both variables default to `5050`. The registry uses the TLS certificate
of the GitLab instance. A certificate covers a hostname on every port,
so no new certificate is needed.

In the integrated package, Traefik terminates TLS on the registry port
and forwards requests to GitLab without the OAuth 2.0 middleware.
GitLab authenticates registry clients itself. With the services CLI,
GitLab serves the registry over TLS directly.

## Open the Firewall

Allow incoming TCP connections on the registry port, for example:

```bash
sudo ufw allow 5050/tcp
```

Also open the port in any cloud security group or network firewall in
front of the server.

## Upgrade an Existing Installation

The new port applies only after the GitLab container is recreated.
GitLab is unavailable for a few minutes while it reconfigures itself.
Its data is not changed.

### Integrated GitLab Package

Replace `docker-compose.yml` with the one from the new release, keep
`config/.env`, and recreate the services:

```bash
docker compose --env-file config/.env up -d
```

### Services CLI

Refresh the compose files of the services project. The command does not
overwrite `config/services.env` or the other credential files.

```bash
dtaas-services project generate --force
dtaas-services service stop -s gitlab
dtaas-services service start -s gitlab
```

`dtaas-services service restart` is not enough here: it restarts the
existing container, which keeps the old port mapping.

## Verify

Open `https://<server>:<port>/v2/`. The registry answers with HTTP
status `401` and an `UNAUTHORIZED` error, because the request has no
credentials. Then sign in with a GitLab username and a personal access
token that has the `api` or `write_registry` scope:

```bash
docker login <server>:<port>
```

## Self-Signed Certificates

If the server uses a certificate from a private certificate authority
(CA), every Docker client of the registry must trust that CA. This
includes the users' machines and the hosts of GitLab runners. Copy the
CA certificate to:

```text
/etc/docker/certs.d/<server>:<port>/ca.crt
```

Rancher Desktop links this directory to `~/.docker/certs.d` on the
host. See the [self-signed certificates guide](../guides/self-signed-certs.md)
for the server side.

## Runners on the Same Server

Pipeline jobs pull and push images through the server's public
hostname. When the runner runs on the DTaaS server itself, behind a NAT
that does not route traffic back to the server's own public address,
these connections fail even though the registry works from outside. Map
the hostname to `127.0.0.1` in `/etc/hosts` on that server to avoid
this.

## Storage

GitLab keeps images in its data directory: `data/` in the integrated
package and `data/gitlab/data/` in the services project, so plan disk
space for them. Deleting an image tag frees no space until the registry
garbage collector runs:

```bash
docker exec gitlab gitlab-ctl registry-garbage-collect
```

The command stops the registry while it runs.

## Related

- [Working with GitLab](../../user/gitlab/tutorial.md#container-registry)
  shows users how to push and pull images.
- [Local Registry Testing](../../developer/contributions/local-registry-testing.md)
  tests the registry on a development machine.
