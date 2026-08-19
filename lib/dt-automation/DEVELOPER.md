# Working on DT Automation

This document describes the development and package validation workflow for
`@into-cps-association/dt-automation`.

See [`README.md`](./README.md) for installation and package usage.

React components and other React-specific code do not belong in this package.

## Prerequisites

DT Automation uses Node.js 24 and Yarn 1.22.22.

Install the dependencies:

```bash
yarn install
```

Run the commands below from the `dt-automation` directory.

## Common Commands

```bash
yarn syntax           # Run ESLint and apply fixes.
yarn format           # Format the source files.
yarn typecheck        # Check the TypeScript types.
yarn test:unit        # Run the unit tests.
yarn build            # Build the package.
yarn smoke:package    # Test the package from a clean consumer.
yarn validate:package # Run type checking and the package test.
yarn prep             # Run the full preparation workflow.
yarn clean            # Remove generated files.
```

`yarn syntax` and `yarn format` can modify source files.

## Build

Build the package with:

```bash
yarn build
```

The build creates the JavaScript and TypeScript declarations distributed in the
package.

`tsup` builds the ESM JavaScript entry point. TypeScript generates declaration
files and `tsc-alias` rewrites internal aliases for package consumers.

The generated files are written to `dist`.

## Test

Run the unit tests with:

```bash
yarn test:unit
```

Run the TypeScript checks with:

```bash
yarn typecheck
```

For a normal development check, use:

```bash
yarn typecheck
yarn test:unit
yarn build
```

## Validate the Package

Use the package smoke test for changes to exports, build configuration, or
package structure:

```bash
yarn smoke:package
```

The test builds the package, creates an archive with `yarn pack`, installs it in
a temporary project, and imports it through the published package name.

Run the type check and package test together with:

```bash
yarn validate:package
```

This verifies the package as an external consumer receives it rather than by
importing implementation files directly.

## Public Exports

`index.ts` defines the public package API.

Add new consumer-facing exports there and import them using the package root:

```ts
import { formatName } from '@into-cps-association/dt-automation';
```

Do not rely on imports from `src`. Internal paths are not part of the published
export map.

## Test a Local Package

To inspect package behavior manually without publishing it, build and create a
local archive:

```bash
yarn build
yarn pack --filename ../dt-automation-local.tgz
```

Install the archive in a temporary project:

```bash
yarn init -y
yarn add ../dt-automation-local.tgz
```

Test imports using the package name
`@into-cps-association/dt-automation`.

For regular development, prefer `yarn smoke:package`, which performs the same
package-level check automatically.

## Source Structure

| Path              | Purpose                                    |
| :---------------- | :----------------------------------------- |
| `index.ts`        | Public package exports                     |
| `src/gitlab/`     | GitLab and measurement logic               |
| `src/store/`      | Redux state                                |
| `src/state/`      | Digital Twin and execution-history state   |
| `src/util/`       | Shared operations and service registration |
| `src/interfaces/` | Shared and backend interfaces              |
| `test/`           | Tests                                      |
| `scripts/`        | Package validation scripts                 |

See [`src/ARCHITECTURE.md`](./src/ARCHITECTURE.md) for backend architecture and
instructions for adding another backend implementation.
