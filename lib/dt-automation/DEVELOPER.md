# Working on DT Automation

See [README](./README.md) for installation and package usage instructions.

This package uses shared data, state, and application rules. React
components and other React-specific code belong in the client application, not here.

## Source code placement

The source code is in `lib/dt-automation`. The package is published as
`@into-cps-association/dt-automation`.

## Common commands

You can run these commands from `lib/dt-automation`:

```bash
yarn install          # Install the required tools and packages.
yarn syntax           # Check the code for common mistakes.
yarn format           # Format the source files.
yarn typecheck        # Check the TypeScript types.
yarn test:unit        # Run the unit tests.
yarn build            # Build the package.
yarn smoke:package    # Check that a consumer can install the package.
yarn validate:package # Run the type check and package check.
yarn prep             # Run the full preparation process.
yarn clean            # Remove generated files.
```

## Building and validating the package

How to build the package and validate that it works:

`yarn build` creates the JavaScript files and TypeScript type information that
are included in the published package.

`yarn smoke:package` creates a temporary package, installs the built package,
and checks that it can be imported by another project. Use
`yarn validate:package` to run the type check and this package check together.
