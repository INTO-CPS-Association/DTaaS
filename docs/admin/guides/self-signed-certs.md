# Self-Signed Certificates

This guide explains how to configure DTaaS to work with self-signed TLS
certificates. This is needed for internal servers that are not reachable
from the public Internet and therefore cannot use certificates from
public certificate authorities such as Let's Encrypt.

## Background

When DTaaS is installed with a self-signed certificate, the
`traefik-forward-auth` service must trust that certificate in order to
complete the OAuth 2.0 token exchange with the GitLab instance.
Without this, authentication fails with a certificate error,
and logs of `traefik-forward-auth` service contains this error:

```text
level=error msg="Code exchange failed with provider"
error="Post https://intocps.org/gitlab/oauth/token:
x509: certificate signed by unknown authority"
```

## Prerequisites

- Administrative access to the host
- A DTaaS installation using the secure server package

## Step 1: Update the DNS Configuration

Containers in the secure-server package use the host's DNS configuration.
If the GitLab instance uses an internal DNS name that is not resolvable from
the public Internet, the Docker host must be able to resolve it by adding the
correct nameserver to `/etc/resolv.conf` on the host. Obtain the correct
values from the IT department. For example:

```text
search client.intocps.org
nameserver 10.20.25.125
```

## Step 2: Create Local TLS Certificates with mkcert

Install `mkcert` if it is not already present. The preferred approach is
to use the OS package manager:

```bash
# Debian / Ubuntu 22.04+
sudo apt install mkcert

# macOS (via Homebrew)
brew install mkcert
```

Alternatively, download the binary from the
[mkcert releases page](https://github.com/FiloSottile/mkcert/releases)
and verify its SHA-256 checksum against the value published on that page
before installing:

```bash
wget https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
# Verify the checksum from https://github.com/FiloSottile/mkcert/releases/tag/v1.4.4
sha256sum mkcert-v1.4.4-linux-amd64
sudo mv mkcert-v1.4.4-linux-amd64 /usr/local/bin/mkcert
sudo chmod +x /usr/local/bin/mkcert
```

Create a local root CA and server certificates:

```bash
mkcert -install
mkcert "intocps.org" "*.intocps.org" "localhost" "127.0.0.1" "::1"
cp ~/.local/share/mkcert/rootCA.pem rootCA.crt
```

Replace `intocps.org` with the actual hostname of the DTaaS installation.

## Step 3: Build a Custom traefik-forward-auth Image

The `traefik-forward-auth` container must trust the local root CA.
Create a `Dockerfile` in the same directory as `rootCA.crt`:

```docker
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
```

Build the image:

```bash
docker build -t traefik-forward-auth-local:latest .
```

## Step 4: Use the Custom Image

In `deploy/dtaas/docker/secure-server/docker-compose.yml`, replace the
existing `image: thomseddon/traefik-forward-auth:latest` image reference with:

```yaml
image: traefik-forward-auth-local:latest
```

## Step 5: Recreate the forward-auth Container

```bash
docker compose --env-file config/.env \
  up -d --force-recreate traefik-forward-auth
```

## External GitLab with Self-Signed Certificates

If the GitLab OAuth provider is hosted on a separate server
(for example, `gitlab.intocps.org`) and also uses a self-signed certificate,
generate that certificate using the same `mkcert` root CA:

```bash
mkcert "gitlab.intocps.org" "localhost" "127.0.0.1" "::1"
```

Because the custom `traefik-forward-auth` image already trusts the
`mkcert` root CA, the OAuth token exchange will succeed.

## Notes

- Certificates created with `mkcert` are trusted only on the machine
  where `mkcert -install` was run. Other clients that access the DTaaS
  installation must also import the `rootCA.crt` into their trust store.
- If the server has a valid public TLS certificate, this guide is not
  needed. Use the standard
  [Let's Encrypt renewal guide](renew_certs.md) instead.
