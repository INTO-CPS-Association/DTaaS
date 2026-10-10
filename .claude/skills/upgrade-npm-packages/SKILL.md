---
name: upgrade-npm-packages
description: Upgrade the npm dependencies of a package.json in this repository behind a ten-day release cooldown, regenerate its yarn.lock, and verify the project still builds and passes its tests. Use when asked to upgrade, update or bump npm packages or to refresh a yarn.lock by hand.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires Node.js 24 or later, npm 7 or later, yarn 1, and network access to registry.npmjs.org.
---

# Upgrade npm packages

The skill lives in `.agents/skills/upgrade-npm-packages/`, where agents
that follow the Agent Skills standard find it. Read
`.agents/skills/upgrade-npm-packages/SKILL.md` and follow its steps. Its
script paths are relative to the repository root.
