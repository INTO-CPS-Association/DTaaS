# Containerised Developer Environment

Date: 2026-09-16
Status: approved for implementation

## Problem

DTaaS has no reproducible developer environment. Onboarding means running
`script/base.sh`, `script/nvm.sh` and `script/env.sh` against the host OS,
which mutates the host, assumes Ubuntu, and drifts from CI. Two partial
attempts exist in `.devcontainer/client/Dockerfile` and
`.devcontainer/dtaas/Dockerfile`; both are VS Code only, pin Node 22 while
CI uses Node 24, and duplicate each other.

Separately, the `developer/` directory is overloaded. Its contents check
that DTaaS *functions* on a developer machine: a Traefik-fronted compose
stack with the client, libms, logger, two user workspaces and OAuth
forward-auth. That is a different concern from *setting up a developer's
toolchain*, and the incoming files need somewhere to live that does not
blur the two.

## Goals

1. One image carrying every toolchain the repository needs: Node, Python,
   Ruby and the lint and docs tooling.
1. Every test suite in the repository runs inside it.
1. A developer's host stays untouched apart from Docker itself.
1. `developer/` gains an unambiguous structure, with all existing call
   sites updated so GitHub Actions and local workflows keep working.

## Non-goals and accepted limitations

The container does not get access to a Docker daemon. No Docker CLI, no
`/var/run/docker.sock` mount, no `DOCKER_GID` build argument. This is a
deliberate trade.

Consequently these are run from a host terminal, not from inside:

- the `developer/check/docker-compose.yml` stack;
- `servers/lib/compose.lib.dev.yml`;
- `dtaas platform ...` and `dtaas user ...`, which drive Docker through
  `python_on_whales`;
- `dtaas-services install|setup|start|stop|status`;
- local builds of the publishable images.

Everything else runs inside, including all test suites. The three Poetry
projects patch `python_on_whales` and `subprocess.run` throughout, so
`poetry run pytest` needs no daemon. The client end-to-end suite starts
its own `yarn start` server (`client/playwright.config.ts`), so it needs
no daemon either.

Rejected alternative: mounting the host Docker socket. The host daemon
resolves bind-mount paths from nested compose files against the *host*
filesystem, so the repository would have to be mounted at a path
identical to its host path. That constraint is obscure and easy to break.
Developers already need Docker on the host to start the dev container, so
running platform stacks from a host shell costs one terminal tab.

## Part A: restructuring `developer/`

Everything currently in `developer/` moves, unchanged, into
`developer/check/`:

```text
developer/
|-- check/
|   |-- docker-compose.yml
|   |-- client.dockerfile
|   |-- client.built.dockerfile
|   |-- libms.dockerfile
|   |-- libms.npm.dockerfile
|   |-- logger.dockerfile
|   |-- config/
|   |-- files/
|   |-- README.md
|   |-- DOCKER-ENV.md
|   `-- developer-docker.png
`-- devenv/
    |-- Dockerfile
    |-- Dockerfile.dockerignore
    |-- docker-compose.yml
    |-- .env.example
    `-- README.md
```

Moves use `git mv` so history follows. Call sites to update:

| File | Change |
| :--- | :--- |
| `.github/workflows/docker-build.yml` | `file: ./developer/${{ inputs.dockerfile }}` gains the `check/` segment |
| `.github/workflows/docker-ghcr.yml` | same `file:` change |
| `.github/workflows/docker-dockerhub.yml` | same `file:` change |
| `.github/workflows/client.yml` | `paths` filters for `client.dockerfile` and `client.built.dockerfile` |
| `.github/workflows/lib-ms.yml` | `paths` filters, plus `LIBMS_LOCAL_PATH` and `LOCAL_PATH` pointing at `developer/files` |
| `.github/workflows/logger-ms.yml` | `paths` filters, plus `--file developer/logger.dockerfile` |
| `servers/lib/compose.lib.dev.yml` | `dockerfile:` and the `files` bind mount |
| `.gitignore` | `developer/config/*` and its `!` negation |
| `client/DEVELOPER.md` | documented paths |
| `docs/developer/contributions/docker.md` | documented paths and the workflow table |
| `developer/check/README.md` | internal path references |

The `dockerfile:` *input values* passed by callers stay bare filenames,
so only the three reusable workflows change their `file:` expression.

The `sparse-checkout: developer` entry in `docker-build.yml` needs no
change; a directory pattern already covers its subdirectories.

## Part B: the image

`developer/devenv/Dockerfile`, built from the repository root as context.

Base: `ubuntu:26.04`, the current Ubuntu LTS. It provides Python 3.14.x,
shellcheck 0.11.0, graphviz 14.1.2, Ruby 3.3 and pipx 1.8.

Node comes from NodeSource `setup_24.x`, giving 24.21.0 with npm 11.19.0.
Node 24 (Krypton) is the newest LTS line; 26.x is Current and does not
reach LTS until late October 2026. This also matches CI, which pins
`node-version: 24`, and the production Dockerfiles, which pin 24.12.0.
Yarn 1.22.22 is activated through corepack, matching the repository's
`yarn.lock` v1 files and `lib/dt-automation`'s `packageManager` field.

Layers, in order:

1. apt: `ca-certificates curl gnupg git openssh-client sudo build-essential
   python3 python3-venv python3-dev pipx ruby-full shellcheck graphviz
   openssl apache2-utils net-tools inotify-tools jq unzip zsh less procps`
1. NodeSource repository, then `nodejs`; `corepack enable` and
   `corepack prepare yarn@1.22.22 --activate`
1. `npm install -g serve pm2 madge markdownlint-cli`
1. `gem install mdl`
1. A virtualenv at `/opt/dtaas-venv`, populated from
   `script/docs/mkdocs-requirements.txt`, and placed on `PATH`. The file
   is the same pinned list the docs CI job uses, so docs build identically
   inside and in CI. Verified to install on Python 3.14.4.
1. `pipx` with `PIPX_HOME=/opt/pipx` and `PIPX_BIN_DIR=/usr/local/bin`,
   installing `poetry` and `pre-commit` system-wide
1. `npx --yes playwright@1.61.1 install-deps chromium`, mirroring
   `script/env.sh`. The version tracks `client/package.json`
1. A `dtaas` user created from `ARG UID` and `ARG GID`, granted
   passwordless sudo. See "Identity matching" below.

Passwordless sudo is retained deliberately. Without a Docker socket the
container is an ordinary unprivileged workload, and sudo lets a developer
install a package ad hoc for the lifetime of that container. Such installs
are deliberately ephemeral: anything durable belongs in this Dockerfile.

### Identity matching

The container user's UID and GID must equal the host user's, or files
written through the bind mount get the wrong owner and git inside the
container reports a dirty or unreadable tree.

Two facts make this more than a default:

- `ubuntu:26.04` already ships a user `ubuntu` at uid 1000, gid 1000, so
  a build for a host uid of 1000 collides with it;
- host accounts are not always 1000. The first developer to use this
  runs at 1001:1001.

So `UID` and `GID` carry no build-time default. The Dockerfile removes
whatever user or group already occupies the requested ids, then creates
`dtaas`:

```dockerfile
ARG UID
ARG GID
RUN existing_user="$(getent passwd "${UID}" | cut -d: -f1)" \
 && [ -z "${existing_user}" ] || userdel -r "${existing_user}" \
 && existing_group="$(getent group "${GID}" | cut -d: -f1)" \
 && [ -z "${existing_group}" ] || groupdel "${existing_group}" \
 && groupadd -g "${GID}" dtaas \
 && useradd -u "${UID}" -g "${GID}" -m -s /bin/zsh dtaas
```

`developer/devenv/.env` is generated, never copied blindly:

```sh
cd developer/devenv
printf 'UID=%s\nGID=%s\n' "$(id -u)" "$(id -g)" > .env
docker compose --env-file .env build
```

`.env.example` documents this with the `id` commands rather than literal
numbers. The compose build passes both through as build arguments, and
both services run as `dtaas`. Changing host user means rebuilding, which
is correct: the identity is baked into the image.

Environment: `PATH` prefixed with `/opt/dtaas-venv/bin`,
`NODE_OPTIONS=--max-old-space-size=4096`, `WORKDIR /workspace/DTaaS`.

`Dockerfile.dockerignore` reduces the build context to the single file the
build reads:

```text
*
!script/docs/mkdocs-requirements.txt
```

The repository has no root `.dockerignore`, so without this the whole tree
including `client/node_modules` would be sent to the daemon. BuildKit
prefers a `<dockerfile>.dockerignore` when present, so existing builds are
unaffected.

## Part C: compose

`developer/devenv/docker-compose.yml` defines two services from the same
image.

`devenv` runs `sleep infinity`; developers attach with
`docker compose exec devenv zsh`. It mounts the repository at
`/workspace/DTaaS` and publishes 4000 (client), 4001 (libms) and 4003
(logger).

`docs` runs `mkdocs serve -a 0.0.0.0:8000` and publishes 8000, so a live
docs preview does not occupy the shell.

Named volumes, never the bind mount, hold:

- `node_modules` for `client`, `servers/lib`, `servers/logger` and
  `lib/dt-automation` — native modules built for the container must not
  collide with a host install;
- the yarn, npm, Poetry, pre-commit and Playwright browser caches.

`.env.example` carries `UID`, `GID` and the published port numbers, with
the `id -u` and `id -g` commands shown in place of literal values.
`.gitignore` gains `developer/devenv/.env`.

## Part D: `.devcontainer/`

`.devcontainer/client/` and `.devcontainer/dtaas/` are deleted. A single
`.devcontainer/devcontainer.json` replaces them, using:

```json
"dockerComposeFile": "../developer/devenv/docker-compose.yml",
"service": "devenv",
"workspaceFolder": "/workspace/DTaaS"
```

It keeps the union of the two existing extension lists, the
`workspace-settings.json` copy step, and the forwarded ports. This leaves
one definition of the development environment for both VS Code and plain
Docker users.

The `fs.inotify` writes to `/etc/sysctl.d/` in the deleted Dockerfiles are
not carried over. They never took effect: watch limits come from the host
kernel and cannot be set during an image build.

## Part E: documentation

- `developer/devenv/README.md`: build, attach, per-project command
  recipes, the named-volume rationale, and an explicit statement that
  Docker-driven workflows run on the host.
- `developer/check/README.md`: path corrections only.
- `docs/developer/contributions/docker.md`: corrected paths, plus a
  pointer distinguishing the two directories.
- `client/DEVELOPER.md`, `cli/DEVELOPER.md`,
  `deploy/services/cli/DEVELOPER.md`: a line offering the container as an
  alternative to host setup.

## Verification

1. `docker compose --env-file .env build` succeeds.
1. Inside: `node -v` reports v24.21.0, `python3 -V` reports 3.14.x, and
   `poetry`, `mkdocs`, `mdl`, `shellcheck`, `madge`, `pre-commit` all
   report a version.
1. `cd client && yarn install && yarn build && yarn config:test &&
   yarn test:unit && yarn test:int` passes. These scripts supply
   `--setupFilesAfterEnv`; invoking `jest` directly omits it and fails.
1. `cd client && yarn test:e2e` passes after `yarn playwright install`.
1. `cd servers/lib && yarn install && yarn build && yarn test:all`
   passes. `test:nocov` additionally needs a configured `.env` and a
   running libms, which CI sets up separately.
1. `cd servers/logger && yarn install && yarn test` passes.
1. `cd lib/dt-automation && yarn install && yarn test:unit` passes.
1. `cd cli && poetry install && poetry run python src/pkg/build.py &&
   poetry run pytest` passes. The vendoring step is a documented
   prerequisite of that project.
1. `cd lib/gitlab_common && poetry install && poetry run pytest` passes.
1. `cd deploy/services/cli && poetry install && poetry run python -m
   dtaas_services.pkg.build && CI=true poetry run pytest
   --ignore=tests/system_tests` passes.
1. `mkdocs build --config-file mkdocs.yml` succeeds; the `docs` service
    answers on `http://localhost:8000`.
1. On the host afterwards, `git status` shows no root-owned files and no
    unexpected modifications, and `git status` inside the container
    reports the same. `ls -l` on a file written inside shows the host
    user as owner, and `id -u` matches on both sides.
1. A build on a host whose uid is 1000 succeeds, proving the collision
    with the base image's `ubuntu` user is handled.
1. `git grep -n 'developer/\(client\|libms\|logger\|docker-compose\)'`
    returns only `developer/check/` paths.
1. `yamllint` passes on the changed workflows.
1. `mdl` passes on every changed or added Markdown file.

## Risks

Python 3.14 is newer than the 3.12 used by the lint CI job, and the Poetry
projects declare `python = "^3.10"`. Those projects are to be upgraded
separately. If a dependency lacks a 3.14 wheel, step 8, 9 or 10 will
expose it during implementation.

Renaming paths under `developer/` touches six workflow files. A mistake
surfaces only when the affected workflow next runs. The `git grep` step
and `yamllint` are the guard; each edited workflow is also re-read
against its callers, and the pull request's own CI exercises the
renamed Dockerfile paths.
