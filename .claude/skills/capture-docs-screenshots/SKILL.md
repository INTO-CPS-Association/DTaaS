---
name: capture-docs-screenshots
description: Capture the DTaaS website screenshots used in the user documentation from a running installation, in light mode, and copy them over the images in docs/. Use when asked to retake, refresh or update documentation screenshots, or after a change to the website's layout or theme.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires Node.js 24 or later, Playwright with Chromium installed in client/node_modules, and a running DTaaS installation with a GitLab user whose workspace is running.
---

# Capture documentation screenshots

The skill lives in `.agents/skills/capture-docs-screenshots/`, where
agents that follow the Agent Skills standard find it. Read
`.agents/skills/capture-docs-screenshots/SKILL.md` and follow its steps.
Its script paths are relative to the repository root.
