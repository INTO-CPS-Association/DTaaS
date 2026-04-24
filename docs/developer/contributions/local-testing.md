# Local Testing :test_tube:

This guide provides a practical local test loop for contributors working in the
DTaaS monorepo.

## Recommended Order

1. Run syntax and lint checks for the changed component.
2. Run fast local tests (unit or focused integration).
3. Run broader test suites before opening a pull request.
4. Build docs if markdown or navigation changed.

## Client (React + TypeScript)

Run from `client/`:

```bash
yarn syntax
yarn test:unit
yarn test:int
yarn build
```

For end-to-end checks:

```bash
yarn test:e2e
```

## Library Microservice (NestJS)

Run from `servers/lib/`:

```bash
yarn syntax
yarn build
yarn test:all
```

If you need API-level checks for cloudcmd integration, use `yarn test:http`.

## Runner Microservice (NestJS)

Run from `servers/execution/runner/`:

```bash
yarn syntax
yarn build
yarn test
```

Use `yarn test:int` and `yarn test:e2e` for deeper coverage.

## DTaaS CLI (Python)

Run from `cli/`:

```bash
poetry install
poetry run pytest
```

## Platform Services CLI (Python)

Run from `deploy/services/cli/`:

```bash
poetry install
poetry run pytest
```

## Documentation Validation

Run from repository root:

```bash
mkdocs build -f mkdocs-github.yml
```

If on Linux and full docs validation with optional PDF wiring is needed:

```bash
MKDOCS_ENABLE_PDF_EXPORT=1 mkdocs build -f mkdocs.yml
```

## Practical Tip

When changing multiple components, validate each package in isolation first.
This keeps failures local, shortens debug time, and avoids chasing unrelated
test errors.
