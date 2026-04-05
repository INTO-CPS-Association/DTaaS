# DTaaS self-contained docker packages

This directory contains source templates and generated docker installation
packages for four DTaaS deployment scenarios.

## Layout

- `src/common/` is the source of truth copied into generated packages.
- `scripts/build-packages/build-packages.py` generates package directories.
- `scripts/build-packages/dtaas.toml` pins docker image names and versions.
- `docker/` contains generated self-contained installation packages:
  - `localhost` (single-user, HTTP)
  - `secure-localhost` (single-user, HTTPS)
  - `server` (multi-user, HTTP + OAuth)
  - `secure-server` (multi-user, HTTPS + OAuth)

## Build and clean

```bash
cd deploy/dtaas
python scripts/build-packages/build-packages.py --build
```

Clean generated package folders only:

```bash
python scripts/build-packages/build-packages.py --clean
```

Clean and rebuild:

```bash
python scripts/build-packages/build-packages.py --clean --build
```

Running without flags defaults to `--build`.

## Source files copied into packages

- `src/common/LICENSE.md` -> `<scenario>/LICENSE.md`
- `src/common/.env.local.example` -> `<localhost*/.env.example>`
- `src/common/.env.server.example` -> `<server*/.env.example>`
- `src/common/README.localhost.md` -> `localhost/README.md`
- `src/common/README.secure-localhost.md` -> `secure-localhost/README.md`
- `src/common/README.server.md` -> `server/README.md`
- `src/common/README.secure-server.md` -> `secure-server/README.md`
- `src/common/config/**` -> `<scenario>/config/**` (scenario-specific subset)
- `src/common/files/**` -> `<scenario>/files/**`
- `src/common/assets/**` -> scenario-appropriate diagram images

## Notes

- Generated packages are independently distributable.
- Workspace images use pinned `intocps/workspace` tags.
- Client and libms images use pinned `intocps` tags.
