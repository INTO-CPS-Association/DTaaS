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
- `servers/logger` -> `@into-cps-association/logger-ms`
- `lib/dt-automation` -> `@into-cps-association/dt-automation`
- `client` -> web client package metadata and build artefacts

Typical publish prerequisites:

1. Lint/syntax checks.
2. Build output generation.
3. Test execution.
4. Registry authentication.

The `dt-automation` workflow validates tarball contents and a clean consumer
install before publishing.

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

The repository includes dedicated Docker build configurations under `developer/`,
`client/`, `servers/lib/`, `servers/logger/`, and `deploy/dtaas/docker/`.
Deployment-level compose definitions are under `deploy/`.

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
