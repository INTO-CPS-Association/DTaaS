# 🧰 Development Environment

A container carrying every toolchain this repository needs: Node, Python,
Ruby, and the linting and documentation tools. Your host stays untouched
apart from Docker itself.

This is not the same thing as `developer/check/`. That directory runs
DTaaS as an application on a developer machine, to see whether it works.
This directory gives you the tools to *write* the code.

## What is inside

| Tool | Version | Used by |
| :--- | :--- | :--- |
| Node | 24.21.0 (LTS) | `client`, `servers/lib`, `servers/logger`, `lib/dt-automation` |
| yarn | 1.22.22 | the same four projects |
| Python | 3.14 | `cli`, `lib/gitlab_common`, `deploy/services/cli` |
| Poetry | latest | the same three projects |
| mkdocs | pinned by `script/docs/mkdocs-requirements.txt` | `docs/` |
| mdl, markdownlint | latest | Markdown linting |
| shellcheck | 0.11.0 | shell scripts |
| madge, graphviz | latest | dependency graphs |
| pre-commit | latest | git hooks |

Node 24 is the current LTS line and matches the CI workflows and the
production Dockerfiles. Playwright's system libraries are installed;
browser binaries are not, so run `yarn playwright install` once.

## Getting started

Generate the identity file. Your host UID and GID are baked into the
image so files written through the bind mount belong to you:

```sh
cd developer/devenv
printf 'UID=%s\nGID=%s\n' "$(id -u)" "$(id -g)" > .env
```

Build and start:

```sh
docker compose --env-file .env up -d
docker compose --env-file .env exec devenv zsh
```

The repository is mounted at `/workspace/DTaaS`. Stop with
`docker compose --env-file .env down`.

VS Code users can instead choose **Reopen in Container**; the
`.devcontainer` configuration drives this same compose file. The `.env`
file must exist first either way.

## Working inside

```sh
cd client            && yarn install && yarn jest . --coverage=false
cd servers/lib       && yarn install && yarn build && yarn test:all
cd servers/logger    && yarn install && yarn test
cd lib/dt-automation && yarn install && yarn test:unit
cd cli               && poetry install && poetry run pytest
cd lib/gitlab_common && poetry install && poetry run pytest
```

`servers/lib`'s `test:nocov` additionally runs `test/cloudcmd`, which
needs a configured `.env` and a running libms instance. CI prepares that
with `node test/update-config.js` before starting the server, so
`test:all` is the command that matches a plain checkout.

`cli` and `deploy/services/cli` vendor shared code before their tests can
be collected. This is a documented step of those projects, not of the
container:

```sh
cd cli                && poetry run python src/pkg/build.py
cd deploy/services/cli && poetry run python -m dtaas_services.pkg.build
```

Documentation previews live on <http://localhost:8000>, served by the
`docs` service without occupying your shell.

Published ports are 4000 for the client, 4001 for libms, 4003 for the
logger and 8000 for the docs. Override them in `.env` if something on
your host already listens there.

## Installing extra packages

`sudo` works without a password. Anything you install this way lasts for
the lifetime of the container and disappears when it is recreated, which
is intended: if a package is genuinely needed, add it to the `Dockerfile`
so everybody gets it.

## Caches and node_modules

Every `node_modules` directory and the caches for yarn, npm, Poetry,
pre-commit and Playwright live in named Docker volumes, not in the bind
mount. Native modules compiled for the container must not overwrite the
ones your host built. A consequence is that `yarn install` inside the
container does not populate `node_modules` on your host, and vice versa.

To start clean:

```sh
docker compose --env-file .env down --volumes
```

## What does not work inside

The container has no Docker client and no access to a Docker daemon. Run
these from a host terminal:

- the `developer/check/` compose stack;
- `servers/lib/compose.lib.dev.yml`;
- `dtaas platform ...` and `dtaas user ...`;
- `dtaas-services install|setup|start|stop|status`;
- local builds of the published images.

This is a deliberate trade. Mounting the host Docker socket would force
the repository to be mounted at a path identical to its host path, since
the host daemon resolves bind mounts from nested compose files against
its own filesystem. You already need Docker on the host to start this
container, so those commands cost one extra terminal tab.

For the same reason, `deploy/services/cli`'s `tests/system_tests/` cannot
run inside; they shell out to `docker`.

One further test, `tests/test_commands/test_setup_ops.py::
test_install_invalid_service`, fails for any non-root user because
`dtaas-services` checks for root before validating its arguments. CI sets
`CI=true`, which the check skips. To reproduce CI locally:

```sh
cd deploy/services/cli
CI=true poetry run pytest --ignore=tests/system_tests
```
