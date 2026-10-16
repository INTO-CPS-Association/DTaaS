# traefik-forward-auth that trusts the mkcert root CA (rootCA.crt in the
# build context), for OAuth 2.0 code exchanges with a locally signed GitLab.
FROM alpine:3 AS cert-builder
RUN apk add --no-cache ca-certificates
COPY rootCA.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

# The image that thomseddon/traefik-forward-auth:latest pointed to when
# this file was written, which is the tag the package uses.
FROM thomseddon/traefik-forward-auth@sha256:b364aa6a4117569163eff793999901f9f5a0c4f7f2da18b4ecbcd140d7b6107b
COPY --from=cert-builder /etc/ssl/certs/ca-certificates.crt \
     /etc/ssl/certs/ca-certificates.crt
# The service listens on port 4181 and needs no root rights.
USER 65534:65534
