# Workspace with Dex on Localhost

This scenario is intended for single-user local workspace deployment.

Package root:

- `deploy/workspace/dex/localhost`

## Requirements

- Docker Engine with Compose plugin
- Ports 80 and 5556 available locally

## Quick Start

1. Change directory:

   ```bash
   cd deploy/workspace/dex/localhost
   ```

2. Create runtime config files:

   ```bash
   cp .env.example .env
   cp config/dex-config.yaml.example config/dex-config.yaml
   ```

3. Start services:

   ```bash
   docker compose up -d
   ```

4. Open:

   - <http://localhost>

Default login values are documented in
`deploy/workspace/dex/localhost/README.md`.

## Customize Local Credentials

Use:

- `deploy/workspace/dex/localhost/CUSTOM_USER.md`

Keep these values aligned:

- `.env` -> `DEFAULT_USER`
- `config/dex-config.yaml` -> `username` and `preferredUsername`

## Stop

```bash
docker compose down
```
