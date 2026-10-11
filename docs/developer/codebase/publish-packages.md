# Publish Packages :package:

DTaaS is a monorepo that publishes npm packages, Docker images, Python
packages and deployment bundles.

## Package Channels

- npm packages (public): `@into-cps-association/*`, published to both
  GitHub Packages and the npm registry
- Docker images: GitHub Container Registry and Docker Hub
- Python packages: the DTaaS CLI and the platform-services CLI on PyPI
- Deployment bundles: GitHub Actions artifacts built by the
  `Release Packages` workflow

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

All Dockerfiles live in `developer/check/`. The reusable workflows
`docker-build.yml`, `docker-ghcr.yml` and `docker-dockerhub.yml` build
them. The `client.yml`, `lib-ms.yml` and `logger-ms.yml` workflows
publish the `dtaas-web`, `libms` and `logger-ms` images.
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

## Deployment Bundles

The `Release Packages` workflow (`release-packages.yml`) runs when
`deploy/dtaas/` or `deploy/workspace/` changes. It uploads each
installation scenario under `deploy/dtaas/docker/` and
`deploy/workspace/` as a GitHub Actions artifact.

## Release Guidance

- Bump versions deliberately, and only for the packages that changed.
- Prefer the automated CI publishing where it exists.
- After publishing, install the package and run it once to check that
  it works.
