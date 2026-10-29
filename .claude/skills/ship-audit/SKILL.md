---
name: ship-audit
description: Audit a change before it is committed, pushed or offered for review, and report each gate with the evidence that proves it. Checks that the project's tests and linters pass, that nothing is hardcoded (credentials, user names, hosts, colours), that nothing is duplicated or left dead, that new dependencies are old enough and safe, that documentation matches the code, and that every earlier review point is answered. Use before opening a pull request, before asking a maintainer to review, before a force push to a branch with an open pull request, or when asked whether a change is ready to ship.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires git, the toolchains listed in PROJECT.md for the components the change touches, and the GitHub CLI (gh) for the pull request gates.
---

# Ship audit

The skill lives in `.agents/skills/ship-audit/`, where agents that follow
the Agent Skills standard find it. Read `.agents/skills/ship-audit/SKILL.md`
and follow its gates.
