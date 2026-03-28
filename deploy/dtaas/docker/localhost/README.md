# DTaaS localhost package

Single-user localhost deployment served over HTTP.

## Contents

- `docker-compose.yml`
- `.env.example`
- `config/`
- `files/`

## Configure

1. Copy `.env.example` to `.env`.
2. Update values for your installation.
3. For secure scenarios, place TLS files under `certs/`.

## Run

```bash
podman-compose up -d
```

## Stop

```bash
podman-compose down
```

## Notes

This package serves DTaaS over HTTP.
