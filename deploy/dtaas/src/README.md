# DTaaS package source

This directory contains the source-of-truth files used to generate
self-contained DTaaS installation packages.

- `common/.env.local.example` and `common/.env.server.example` are copied to
  generated `.env.example` files.
- `common/README.<scenario>.md` files are copied into package `README.md`.
- `common/LICENSE.md` is copied into every generated package.
- `common/files/` stores workspace file templates used by all scenarios.
- `common/config/` stores reusable client, traefik, and forward-auth config.
- `common/assets/` stores documentation images copied into packages.
