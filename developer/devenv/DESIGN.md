# Containerised Developer Environment

Date: 2026-09-16
Status: implemented; see "Amendments" for changes made in review

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
| `developer/check/docker-compose.yml` | `build.context` becomes `../../` and `dockerfile:` gains `check/` |

The `dockerfile:` *input values* passed by callers stay bare filenames,
so only the three reusable workflows change their `file:` expression.

The `sparse-checkout: developer` entry in `docker-build.yml` needs no
change; a directory pattern already covers its subdirectories.

## Part B: the image

`developer/devenv/Dockerfile`, built from the repository root as context.

Base: `ubuntu:26.04`, the current Ubuntu LTS. It provides Python 3.14.x,
shellcheck 0.11.0, graphviz 14.1.2, Ruby 3.3 and pipx 1.8.

Node 26.10.0 with npm 11.19.1 is copied from the official
`node:26.10.0-slim` image in a first build stage, so its provenance is a
pinned image tag and no downloaded install script runs. This matches CI,
which uses `node-version: 26`, and the production Dockerfiles in
`developer/check/`, which pin `node:26.10.0-slim`. Node 26 no longer
ships corepack, so yarn 1.22.22 is installed globally through npm,
matching the repository's `yarn.lock` v1 files and `lib/dt-automation`'s
`packageManager` field.

Layers, in order:

1. apt: `apache2-utils build-essential ca-certificates curl git git-lfs
   gnupg graphviz inotify-tools jq less net-tools openssh-client openssl
   pipx procps python3 python3-dev python3-venv ruby-full shellcheck sudo
   unzip zsh`, then `git lfs install --system`. `.gitattributes` routes
   images and videos through LFS, and the mkdocs hook aborts on LFS
   pointers.
1. `node`, `lib/node_modules` and `include/node` copied from the Node
   stage, with the `npm` and `npx` links recreated.
1. `npm install --global --ignore-scripts` of pinned `yarn@1.22.22`,
   `serve@14.2.6`, `pm2@7.0.4`, `madge@8.0.0`, `markdownlint-cli@0.49.1`
   and `playwright@1.61.1`. The Playwright version tracks
   `client/package.json`.
1. One layer for the rest of the toolchain:
   - a virtualenv at `/opt/dtaas-venv`, populated from
     `script/docs/mkdocs-requirements.txt` and placed on `PATH`. That list
     is a superset of the docs CI job's `mkdocs-requirements-github.txt`:
     CI publishes `mkdocs-github.yml`, while the `docs` service serves
     `mkdocs.yml`, which also declares the `with-pdf` plugin;
   - `pipx` with `PIPX_HOME=/opt/pipx` and `PIPX_BIN_DIR=/usr/local/bin`,
     installing `poetry`, `pre-commit`, `flake8`, `pylint` and `yamllint`
     system-wide;
   - `gem install mdl`;
   - `playwright install-deps chromium`, run from the global install.
1. A `dtaas` user created from `ARG UID` and `ARG GID`, granted
   passwordless sudo, and the named-volume mount points it owns. See
   "Identity matching" below.

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
 && { [ -z "${existing_user}" ] || userdel -r "${existing_user}"; } \
 && existing_group="$(getent group "${GID}" | cut -d: -f1)" \
 && { [ -z "${existing_group}" ] || groupdel "${existing_group}"; } \
 && groupadd -g "${GID}" dtaas \
 && useradd -u "${UID}" -g "${GID}" -m -s /bin/zsh dtaas
```

`developer/devenv/.env` is generated by `init.sh`, never copied blindly:

```sh
cd developer/devenv
./init.sh
docker compose --env-file .env build
```

`init.sh` writes `UID` and `GID` from `id -u` and `id -g`, and leaves an
existing `.env` untouched so port overrides survive. It also creates the
four `node_modules` mount points on the host as the host user; otherwise
a rootful daemon creates them as root and a later host `yarn install`
fails. `.env.example` lists the overridable ports.

The compose build passes both through as build arguments, and
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

`.env.example` carries the published port numbers; `init.sh` supplies
`UID` and `GID`. The repository's bare `.env` rule in `.gitignore`
already keeps `developer/devenv/.env` untracked.

## Part D: `.devcontainer/`

`.devcontainer/client/` and `.devcontainer/dtaas/` are deleted. A single
`.devcontainer/devcontainer.json` replaces them, using:

```json
"dockerComposeFile": "../developer/devenv/docker-compose.yml",
"service": "devenv",
"workspaceFolder": "/workspace/DTaaS"
```

It runs `developer/devenv/init.sh` on the host as its
`initializeCommand`, and keeps the union of the two existing extension
lists and the `workspace-settings.json` copy step. It declares no
`forwardPorts`: compose already publishes every port, and 8000 belongs
to the `docs` service rather than `devenv`. This leaves
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

1. `./init.sh && docker compose --env-file .env build` succeeds.
1. Inside: `node -v` reports v26.10.0, `yarn -v` 1.22.22, `python3 -V`
   3.14.x, and `poetry`, `mkdocs`, `mdl`, `shellcheck`, `madge`,
   `pre-commit` and `git lfs` all report a version.
1. `cd client && yarn install && yarn build && yarn config:test &&
   yarn test:unit && yarn test:int` passes. These scripts supply
   `--setupFilesAfterEnv`; invoking `jest` directly omits it and fails.
1. `cd client && yarn test:e2e` passes after `yarn playwright install`,
   given a reachable GitLab instance for its auth setup. CI does not run
   this suite.
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
1. `git grep -n 'developer/\(client\|libms\|logger\|runner\|docker-compose\)'`
    returns only `developer/check/` paths.
1. `yamllint` passes on the changed workflows.
1. `mdl` passes on every changed or added Markdown file.

## Risks

The container and CI both use Python 3.14, and the Poetry projects
declare `python = "^3.10"`. A dependency without a 3.14 wheel would
surface in both places at once, in the Poetry test jobs.

Renaming paths under `developer/` touches six workflow files. A mistake
surfaces only when the affected workflow next runs. The `git grep` step,
`yamllint` and the actionlint step of the `Qlty` workflow are the guard;
the pull request's own CI exercises the renamed Dockerfile paths.

## Amendments

Changes made after review of the first implementation:

- The spec lived under `docs/superpowers/specs/`, which mkdocs publishes.
  It moved here, next to the code it describes.
- Node is 26.10.0, copied from the official `node:26.10.0-slim` image
  instead of the NodeSource install script, so no downloaded script is
  executed. Node 26 does not ship corepack; yarn and the global tools
  are installed with `npm install --global --ignore-scripts` at pinned
  versions, and Playwright's `install-deps` runs from that install rather
  than through `npx`.
- `git-lfs` is installed and enabled system-wide. `.gitattributes` routes
  images and videos through LFS, and the mkdocs hook aborts on LFS
  pointers.
- `init.sh` writes `.env` and creates the four `node_modules` mount
  points on the host as the host user. Without the latter, a rootful
  daemon creates them as root and a later host `yarn install` fails. The
  devcontainer runs it as `initializeCommand`.
- `forwardPorts` is dropped; compose already publishes every port, and
  port 8000 belongs to the `docs` service, not `devenv`.
- `developer/runner.dockerfile`, added upstream after this spec, moved
  into `developer/check/` too.
- CI moved to Node 26 and Python 3.14, and every workflow action to its
  latest release, so the container and CI run the same toolchain.
- CI no longer installs Playwright or runs the client e2e suite. Its
  auth setup needs a GitLab login that CI does not have, so it never
  produced a result there.
