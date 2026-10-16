# traefik-forward-auth that trusts the mkcert root CA (rootCA.crt in the
# build context), for OAuth 2.0 code exchanges with a locally signed GitLab.
FROM alpine:3 AS cert-builder
RUN apk add --no-cache ca-certificates
COPY rootCA.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

FROM thomseddon/traefik-forward-auth:latest
COPY --from=cert-builder /etc/ssl/certs/ca-certificates.crt \
     /etc/ssl/certs/ca-certificates.crt
