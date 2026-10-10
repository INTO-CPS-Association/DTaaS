# Upgrade NPM Packages

A malicious npm release is usually found and pulled from the registry
within days. The project therefore waits before taking any newly
published package version.

- Dependabot waits **three days**, through `cooldown: default-days: 3` in
  `.github/dependabot.yml`.
- Upgrades made by hand bypass Dependabot. Run them through the
  `upgrade-npm-packages` agent skill or its script, which wait
  **ten days**.

## Agent skill

The `upgrade-npm-packages` skill in `.agents/skills/` runs the script,
explains every change, runs the project's build and tests, and pins back
any upgrade that breaks them. Ask a coding agent to upgrade the npm
packages of a project to use it. [Coding Agents](coding-agents.md)
explains how skills are organised.

## Usage

The script needs Node.js 24 or later, npm 7 or later and yarn 1. It has
no npm dependencies of its own. To run it without an agent:

```bash
node .agents/skills/upgrade-npm-packages/scripts/npm_pkg_upgrade.js client/package.json
```

The script takes the path to one `package.json` and performs these steps:

1. Computes the cutoff date, ten days before now.
1. For every entry in `dependencies`, `devDependencies` and
   `optionalDependencies`, picks the newest stable, non-deprecated version
   published on or before the cutoff that stays within the range the spec
   already allows. The range prefix (`^`, `~` or none) is kept.
1. Writes the new versions into the `package.json`.
1. Deletes the `yarn.lock` beside it and generates a fresh one.

The range follows npm's meaning of the prefix, and an exact version is
treated like `^`:

| Spec | Stays below |
| :--- | :--- |
| `^6.0.3` or `6.0.3` | `7.0.0` |
| `^0.18.9` | `0.19.0` |
| `~30.4.2` | `30.5.0` |

The output lists every changed package as `upgrade` or `DOWNGRADE`, and
every package left alone as `skip`, with the reason. A line starting with
`newer` names a version outside the range, such as a new major release,
which the script does not apply. Take such a version by editing the
`package.json` and running the script again.

## Packages published from this repository

Packages in the `@into-cps-association/` scope, such as
`@into-cps-association/dt-automation`, are built and published from this
repository, so the cooldown does not apply to them. The script keeps their
versions as written in the `package.json`, even when the release is only
days old. Their provenance is tracked separately; see the issue on npm
provenance attestations.

## How the new lockfile honours the cooldown

Yarn 1 has no setting to hold back recently published versions, and a
fresh `yarn install` resolves every transitive dependency to its newest
version. The script therefore builds the lockfile in an empty temporary
directory, away from any existing `node_modules`:

1. `npm install --package-lock-only --before=<cutoff>` resolves the whole
   dependency tree, transitive dependencies included, as it stood at the
   cutoff. The exempt `@into-cps-association/` packages are left out of
   this step.
1. A second `npm install --package-lock-only`, without `--before`, adds
   the exempt packages. It keeps every version the first step locked. Any
   package this step adds is printed as `no cooldown: <name>@<version>`
   for review.
1. `yarn_lock_from_npm.js` converts the `package-lock.json` into a
   `yarn.lock` holding exactly the versions npm chose.
1. `yarn install --frozen-lockfile` checks that yarn accepts the lockfile
   without resolving anything itself. The lockfile is then copied beside
   the `package.json`.

`yarn import` is not used. It reads an existing `node_modules` in
preference to the `package-lock.json`, and it re-resolves some entries
from the live registry, which lets recent versions back in.

Run `yarn install` afterwards to install the new versions.

## Review the result

The script applies the cooldown mechanically. Review the diff before
committing it.

- **Downgrades.** A version newer than the cutoff is replaced by the
  newest older version.
- **Newer versions outside the range.** Review each `newer` line. A major
  release can break the build; for example, TypeScript 7 does not work
  with `ts-jest`, so the client stays on TypeScript 6.
- **Deliberate pins.** A `~` range keeps a package on its minor release.
  For example, `jest` in `servers/lib` stays on `~30.4.2`; see
  `servers/lib/DEVELOPER.md`.
- **Skipped entries.** Ranges such as `>=1.0.0`, `file:` and `npm:`
  aliases, prerelease versions and packages missing from the registry are
  left unchanged.

Then run the build and test commands for the project; see `PROJECT.md`.

## Linting and tests

The `Lint and Test Node Scripts` job in
`.github/workflows/lint-scripts.yml` checks the skill's `scripts/`
directory with eslint and prettier, runs its unit tests, and checks every
skill's Claude Code stub. The linters are installed only in
CI, at exact versions and without a `package.json`. To run the same checks
locally:

```bash
cd .agents/skills/upgrade-npm-packages/scripts
npm install --no-save --no-package-lock --ignore-scripts \
  eslint@10.11.0 @eslint/js@10.0.1 prettier@3.9.9
npx eslint .
npx prettier --check .
node --test ./*.test.js
```
