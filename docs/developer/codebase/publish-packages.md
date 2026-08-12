# Publish Packages :package:

DTaaS is a monorepo with publishable artefacts across npm, Docker, and Python
package channels.

## Package Channels

- npm packages (public): `@into-cps-association/*`
- Docker images: GitHub Container Registry and Docker Hub
- Python packages: DTaaS CLI and platform-services CLI release flows

## JavaScript/TypeScript Packages

Notable package roots:

- `servers/lib` -> `@into-cps-association/libms`
- `servers/execution/runner` -> `@into-cps-association/runner`
- `client` -> web client package metadata and build artefacts

Typical publish prerequisites:

1. Lint/syntax checks.
2. Build output generation.
3. Test execution.
4. Registry authentication.

## DTaaS Model Package

`client/src/model` is being prepared as an independently installable npm
package. The existing model tests run against client source and do not by
themselves prove that the packed npm artifact installs, imports, or exposes
valid TypeScript declarations. The `model-package` job in `client.yml`
therefore builds and packs the package, checks its contents, installs the
tarball in a fresh consumer, type-checks its root declarations, and runs a
root-import smoke test.

## Private Registry Workflow (Development)

Use a private registry (for example Verdaccio) when testing publish/unpublish
behaviour before public releases.

Typical local flow:

```bash
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
npm adduser --registry http://localhost:4873
npm set registry http://localhost:4873/
```

## Docker Artifacts

The repository includes dedicated Docker build configurations under `docker/`
and deployment-level compose definitions under `deploy/`.

When changing runtime dependencies, validate image builds and scenario startup
paths before release tagging.

## Python Packages

Two Poetry-based CLIs are maintained:

- `cli` (`dtaas`)
- `deploy/services/cli` (`dtaas-services`)

Use Poetry-managed versioning and lockfile workflows for package reproducibility.

## Release Guidance

- Keep version bumps intentional and scoped to changed packages.
- Prefer automated CI publishing where available.
- Validate package install and smoke-run behaviour after publishing.
