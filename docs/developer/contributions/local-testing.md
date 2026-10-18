# Local Testing

This guide gives a local test loop for contributors working in the
DTaaS monorepo. The authoritative build and test command for each project
is in the "Build and test commands" section of `PROJECT.md`; the commands
below follow it. The development container in `developer/devenv/` has
every toolchain they need.

## Recommended Order

1. Run syntax and lint checks for the changed component.
2. Run fast local tests (unit or focused integration).
3. Run broader test suites before opening a pull request.
4. Build the docs if markdown or navigation changed.

## Client (React + TypeScript)

Run from `client/`:

```bash
yarn syntax
yarn build
yarn config:test
yarn test:unit
yarn test:int
```

`yarn config:test` copies the test configuration into `public/env.js`
and `build/env.js`. Use the `yarn test:*` scripts rather than bare
`jest`: they load the setup files that the tests depend on.

For end-to-end checks:

```bash
yarn test:e2e
```

The end-to-end suite logs in through GitLab, so it needs a reachable
GitLab instance configured in `client/test/.env`. GitHub Actions does not
run it; run it locally before opening a pull request that changes
client behaviour. See `client/test/README.md`.

## Library Microservice (NestJS)

Run from `servers/lib/`:

```bash
yarn syntax
yarn build
yarn test:all
```

For API-level checks of the cloudcmd integration, use `yarn test:http`.
It needs a configured `.env` file and starts the library microservice
under pm2.

## Runner Microservice (NestJS)

Run from `servers/execution/runner/`:

```bash
yarn syntax
yarn build
yarn test
```

`yarn test:unit` and `yarn test:int` run the unit and integration tests
separately.

## Logger Microservice (NestJS)

Run from `servers/logger/`:

```bash
yarn syntax
yarn test
```

## DT Automation Library (TypeScript)

Run from `lib/dt-automation/`:

```bash
yarn syntax
yarn test:unit
```

The package has no `test` script.

## DTaaS CLI (Python)

Run from `cli/`:

```bash
poetry install
poetry run python src/pkg/build.py
poetry run pytest
```

The build step copies the shared code from `lib/` into the package; the
tests cannot be collected without it.

## GitLab Common Library (Python)

Run from `lib/gitlab_common/`:

```bash
poetry install
poetry run pytest
```

## Platform Services CLI (Python)

Run from `deploy/services/cli/`:

```bash
poetry install
poetry run python -m dtaas_services.pkg.build
CI=true poetry run pytest --ignore=tests/system_tests
```

The CLI checks for root before it validates arguments, so non-root runs
need `CI=true`. The tests in `tests/system_tests` call `docker`.

## Documentation Validation

Run from the repository root:

```bash
python -m pytest script/docs
python script/docs/docs.py build
```

On Linux, to validate the full docs build including the PDF export:

```bash
python script/docs/docs.py build --pdf
```

## Server Packages

To run the server installation packages and the GitLab container
registry on a development machine, see
[Local Server Testing](local-server-testing.md).

## Practical Tip

When changing several components, validate each package on its own
first. Failures then stay local and are quicker to debug, and unrelated
test errors do not get in the way.
