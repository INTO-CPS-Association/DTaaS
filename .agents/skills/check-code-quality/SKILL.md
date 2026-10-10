---
name: check-code-quality
description: Run static analysis, the tests and the build for one DTaaS component and report the findings without changing code. Use when asked to check code quality, lint a component, or run a quality review of the client, a CLI, a library or a microservice.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires poetry for the Python components and Node.js with yarn for the Node.js components.
---

# Check code quality

## Role

Act as a senior software engineer conducting a code quality review of a
specified DTaaS component.

## Scope

The following components are in scope for code quality checks:

| Component | Directory | Source directory |
| :--- | :--- | :--- |
| Admin CLI | `cli/` | `src` |
| Platform services CLI | `deploy/services/cli/` | `dtaas_services` |
| GitLab common library | `lib/gitlab_common/` | `gitlab_common` |
| React client | `client/` | `src` |
| DT automation library | `lib/dt-automation/` | `src` |
| Digital twin runner | `servers/execution/runner/` | `src` |
| Library microservice | `servers/lib/` | `src` |
| Logger microservice | `servers/logger/` | `src` |

## Procedure

When asked to check a component, perform the following steps in order.

### 1. Identify the component

Confirm which directory corresponds to the requested component using the
table above. If the component is ambiguous, request clarification before
proceeding.

### 2. Run static analysis

Execute the linting and type-checking tools appropriate to the component's
language. `<src-dir>` is the component's source directory from the table.

**Python components** (`cli/`, `deploy/services/cli/`,
`lib/gitlab_common/`):

```bash
cd <component-directory>
poetry run pylint <src-dir> tests --rcfile=<repo-root>/.pylintrc --fail-under=9.0
poetry run pyright <src-dir>
```

**Node.js / TypeScript components** (`client/`, `lib/dt-automation/`,
`servers/execution/runner/`, `servers/lib/`, `servers/logger/`):

The `syntax` and `format` scripts in `package.json` run
`eslint --fix` and `prettier --write`, which change files. Run their
check-only forms instead:

```bash
cd <component-directory>
npx eslint .                 # ESLint checks
npx prettier --check <glob>  # the glob from the "format" script
```

`servers/logger/` provides these as `yarn syntax:check` and
`yarn format:check`.

Report all violations with their file path, line number, rule identifier,
and a brief explanation of the issue.

### 3. Run the test suite

Run the component's command from the "Build and test commands" table
in `PROJECT.md`; it is written to avoid known pitfalls, such as missing
Jest setup files or the vendoring step the Python CLIs need. The runner
is not in that table: run `yarn build && yarn test` there.

**Python components:** add coverage options to the `pytest` part of
that command, keeping any options it already has:

```bash
poetry run pytest --cov=<src-dir> --cov-report=term-missing
```

For the `client/` component, after the unit and integration tests, also
run:

```bash
yarn test:coverage:int-unit
```

Report any failing tests, the error message, and the relevant file path.

### 4. Verify build artefacts

Confirm that the component builds without errors.

**Python components** (for `cli/` and `deploy/services/cli/`, after the
vendoring step from `PROJECT.md`):

```bash
poetry build --format wheel
poetry build --format sdist
```

**Node.js / TypeScript components:**

```bash
yarn build
```

### 5. Report findings

Produce a structured summary with the following sections:

- **Static analysis**: list of linting or type errors, or confirmation
  that none were found.
- **Test results**: pass/fail counts, coverage percentage, and any
  failing test names.
- **Build status**: success or failure, with any error output.
- **Recommended actions**: ordered list of issues to resolve, from
  highest to lowest severity.

## Standards

The following thresholds apply:

| Metric | Threshold |
| :--- | :--- |
| Pylint score | ≥ 9.0 |
| Test pass rate | 100 % |
| Build | Must succeed without errors |

## Constraints

- Do not modify source files during the quality check.
- Do not commit or push any changes.
- Report findings only; do not apply fixes unless explicitly instructed.
- Each changed line, if fixes are later requested, must trace directly
  to a reported issue.
