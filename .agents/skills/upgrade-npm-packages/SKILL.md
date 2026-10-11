---
name: upgrade-npm-packages
description: Upgrade the npm dependencies of a package.json in this repository behind a ten-day release cooldown, regenerate its yarn.lock, and verify the project still builds and passes its tests. Use when asked to upgrade, update or bump npm packages or to refresh a yarn.lock by hand.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires Node.js 24 or later, npm 7 or later, yarn 1, and network access to registry.npmjs.org.
---

# Upgrade npm packages

A malicious npm release is usually found and pulled within days, so hand
upgrades take only versions published at least ten days ago. Dependabot
keeps its own, shorter cooldown in `.github/dependabot.yml`. The script in
`scripts/` applies the cooldown mechanically; this skill is the judgement
around it. Run every step for each `package.json` the user names.

## Steps

1. **Run the script** from the repository root:

   ```bash
   node .agents/skills/upgrade-npm-packages/scripts/npm_pkg_upgrade.js <project>/package.json
   ```

   It rewrites the `package.json` and replaces the `yarn.lock` beside it.
   A run takes several minutes, because it ends with a frozen
   `yarn install` that downloads every package. Rerun after a network
   timeout. Done when it exits 0.

1. **Account for every output line.** Each line has a kind:

   | Line | Meaning |
   | :--- | :--- |
   | `upgrade` | Newer version within the spec's own range. |
   | `DOWNGRADE` | The current version is younger than the cooldown; the newest older one replaces it. |
   | `newer` | A version outside the spec's range, such as a new major. Not applied. |
   | `skip` | Left unchanged; the reason follows. |
   | `no cooldown:` | Pulled in by an exempt package, so it skipped the cooldown. |

   Packages in the `@into-cps-association/` scope are exempt: this
   repository publishes them, so they keep their versions.

1. **Verify.** Delete `<project>/node_modules`, then run the project's
   build and test command from the table in `PROJECT.md`. Done when it
   passes. On failure, run the same command on the merge base; a failure
   that is there too is pre-existing, so report it and move on.

1. **Isolate a new failure.** Restore the original spec of one changed
   package at a time (`git diff <project>/package.json` lists them), rerun
   the script and the tests, until the culprit is found. Pin it with a `~`
   range or an exact version that passes. Application code stays as it
   is; the upgrade is the variable under test.

1. **Keep TypeScript on 6.x.** `ts-jest` needs the JavaScript compiler
   API, which TypeScript 7 no longer exposes; with TypeScript 7 every
   client test suite fails before running. Leave the
   `newer typescript: 7.x` line unapplied. Take any other `newer` version
   only when the user asks for it: write its spec, such as `^5.0.0`, into
   the `package.json`, then repeat from step 1. If that version is younger
   than the cooldown, the script reports a `DOWNGRADE` instead.

1. **Report** per project: the changed packages, the `newer` versions left
   for a decision, the `no cooldown:` packages, any pins added in step 4,
   and the test counts.

The rationale and the lockfile mechanism are documented for people in
`docs/developer/contributions/npm-upgrade.md`.
