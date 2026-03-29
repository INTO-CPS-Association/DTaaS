# Generated DTaaS packages

This directory contains generated self-contained installation packages:

1. `localhost`
2. `secure-localhost`
3. `server`
4. `secure-server`

Each package includes its own:

- `docker-compose.yml`
- `.env.example`
- `README.md` with scenario-specific setup instructions
- `LICENSE.md`

Regenerate packages:

```bash
cd deploy/dtaas
python scripts/build-packages.py --build
```

Remove generated package folders:

```bash
python scripts/build-packages.py --clean
```
