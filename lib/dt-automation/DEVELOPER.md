# DT Automation Developer Instructions

See [README](./README.md) for installation and package usage.

## Package source

The package source lives under `lib/dt-automation` and is published as
`@into-cps-association/dt-automation`.

## Developer commands

```bash
yarn install
yarn syntax
yarn format
yarn typecheck
yarn test:unit
yarn build
yarn smoke:package
yarn validate:package
yarn prep
yarn clean
```

## Build

The JavaScript bundle is produced by `tsup`. TypeScript declarations are emitted
separately by `tsc`, then `tsc-alias` rewrites internal `src/*` aliases to
portable relative imports in `dist`.

The package smoke test builds a tarball and verifies that a clean consumer can
install and import it. Use `yarn validate:package` for typechecking followed
by this smoke test.
