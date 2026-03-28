# DTaaS self-contained docker packages

This directory contains source templates and generated docker
installation packages for four DTaaS installation scenarios.

## Layout

- `src/common/` contains shared source files used to build packages.
- `scripts/build-packages.py` generates scenario packages.
- `docker/` contains generated self-contained installation packages:
  - `localhost`
  - `secure-localhost`
  - `server`
  - `secure-server`

## Build packages

```bash
cd deploy/dtaas
python scripts/build-packages.py --clean
```

## Notes

- Packages are generated to be independently distributable.
- Workspace images use pinned `intocps/workspace` tags.
- Client and libms images use pinned `intocps` version tags.
