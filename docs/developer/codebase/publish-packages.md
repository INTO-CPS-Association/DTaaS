# Publish Packages

DTaaS is a monorepo that publishes npm packages, Docker images, Python
packages and installation packages.

## Package Channels

- npm packages (public): `@into-cps-association/*`, published to both
  GitHub Packages and the npm registry
- Docker images: GitHub Container Registry and Docker Hub
- Python packages: the DTaaS CLI and the platform-services CLI on PyPI
- Installation packages: zip files attached to each GitHub release by
  the `Release Packages` workflow

## JavaScript/TypeScript Packages

The package roots are:

- `servers/lib` -> `@into-cps-association/libms`
- `servers/execution/runner` -> `@into-cps-association/runner`
- `servers/logger` -> `@into-cps-association/logger-ms`
- `lib/dt-automation` -> `@into-cps-association/dt-automation`
- `client` -> `@into-cps-association/dtaas-web`, which is published as a
  Docker image rather than an npm package

The workflow of each package (`lib-ms.yml`, `runner.yml`,
`logger-ms.yml` and `dt-automation.yml`) first runs the lint, build and
test jobs. It then calls the reusable `publish-npm.yml` workflow once
for GitHub Packages and once for the npm registry. `publish-npm.yml`
runs `yarn install`, `yarn build` and `yarn publish --access public`
with the registry token passed in as the `NPM_TOKEN` secret.

Publishing happens on a push or manual run on the
`feature/distributed-demo` branch. The logger workflow also publishes
from any `feature/*` or `release-v*` branch.

The `dt-automation` workflow also checks the tarball contents and
installs the packed tarball into an empty project before publishing.

## Private Registry Workflow (Development)

Use a private registry such as Verdaccio to test publish and unpublish
behaviour before a public release.

A typical local flow:

```bash
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
npm adduser --registry http://localhost:4873
npm set registry http://localhost:4873/
```

## Docker Artifacts

All Dockerfiles for the published images live in `developer/check/`.
The reusable workflows `docker-build.yml`, `docker-ghcr.yml` and
`docker-dockerhub.yml` build them. The `client.yml`, `lib-ms.yml` and
`logger-ms.yml` workflows publish the `dtaas-web`, `libms` and
`logger-ms` images for `linux/amd64` and `linux/arm64`. Each platform
is built on a native runner and pushed by digest; a final job tags one
multi-platform manifest that points at both.
Deployment-level compose definitions are under `deploy/`.

When changing runtime dependencies, check that the images build and the
deployment scenarios start before tagging a release.

## Python Packages

Two Poetry-based CLIs are published to PyPI:

- `cli` (`dtaas`), by the `CLI for DTaaS` workflow (`python-cli.yml`)
- `deploy/services/cli` (`dtaas-services`), by the
  `Platform Services CLI` workflow (`platform-services-cli.yml`)

Both call the reusable `python-reusable.yml` workflow for tests and
builds, and publish on a push or manual run on the
`feature/distributed-demo` branch. The `lib/gitlab_common` library is
tested by the `gitlab-common.yml` workflow and is not published on its
own.

Use Poetry for versioning and keep the lock files up to date so that
builds are reproducible.

## Installation Packages

The installation packages attached to each GitHub release are built by
the `Release Packages` workflow (`.github/workflows/release-packages.yml`)
with `script/release-packages.sh`. Each package is
`<package>-<version>.zip`, holding every tracked file of its source
directory under `deploy/dtaas/docker/` or `deploy/workspace/`.

The workflow builds and verifies the packages whenever
`deploy/dtaas/`, `deploy/workspace/`, the script or the workflow
changes, and keeps them for two days as one `release-packages` artifact
of the workflow run. Publishing a GitHub release also attaches them to
the release. Do not edit or re-zip them by hand; change the source
directory instead.

To build and check the packages locally:

```bash
git lfs install --local
git lfs pull --include="deploy/dtaas/**,deploy/workspace/**"
script/release-packages.sh build dev dist
script/release-packages.sh verify dev dist
```

`git lfs install --local` sets up the Git LFS filters. Without them,
the fetched images look like uncommitted changes and the script refuses
to build.

To replace the packages of an existing release, check out its tag,
build the packages with the script from the default branch into a fresh
directory and upload them:

```bash
git switch --detach v1.0
git lfs install --local
git lfs pull --include="deploy/dtaas/**,deploy/workspace/**"
git show origin/feature/distributed-demo:script/release-packages.sh > /tmp/release-packages.sh
rm -rf dist-1.0
bash /tmp/release-packages.sh build 1.0 dist-1.0
bash /tmp/release-packages.sh verify 1.0 dist-1.0
gh release upload v1.0 dist-1.0/*-1.0.zip --clobber --repo INTO-CPS-Association/DTaaS
```

`--clobber` replaces only assets with the same name. Releases up to
v1.0 carry packages without a version in their name, such as
`dtaas-localhost.zip`, so delete those after the upload:

```bash
for name in dtaas-localhost dtaas-server dtaas-secure-server \
  dtaas-secure-server-integrated-gitlab workspace-dex-localhost \
  workspace-keycloak-production; do
  gh release delete-asset v1.0 "$name.zip" --yes --repo INTO-CPS-Association/DTaaS
done
```

## Release Guidance

- Bump versions deliberately, and only for the packages that changed.
- Prefer the automated CI publishing where it exists.
- After publishing, install the package and run it once to check that
  it works.
