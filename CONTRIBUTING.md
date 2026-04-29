# Contribution Guide

This guide describes the expected contribution workflow for the Digital Twin as
a Service (DTaaS) repository.

All participation must comply with the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Purpose

The contribution process is intended to ensure that changes are traceable,
reviewable, and aligned with project quality standards.

Background material for contributors is available in the following resources:

- [Developer slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/20250605_Developer.pdf)
- [Developer video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250605_Developer-recorded_web.mp4)
- [Research paper](https://arxiv.org/abs/2305.07244)

## Development Environment

The repository includes a devcontainer definition at
`.devcontainer/devcontainer.json`.

Using the devcontainer is the recommended approach for obtaining a consistent
Docker-based development environment.

Recommended toolchain versions:

- Node.js 24
- Python 3.12

## Workflow

1. Create a fork of the repository in a personal GitHub account.
2. Configure
   [Qlty](https://docs.qlty.sh/cloud/quickstart)
   and
   [Codecov](https://docs.codecov.com/docs/quick-start)
   for the fork.
3. Use a fork/branch/pull-request workflow for all changes.
4. Open pull requests against the fork branch used for active development.
5. Resolve all findings from CI, Qlty, and coverage checks.
6. Submit an upstream pull request to the target branch of
   [DTaaS](https://github.com/into-cps-association/DTaaS).
7. Await maintainer or administrator review and merge.

Each pull request should represent a coherent user story, bug fix, or
quality improvement.

## Coding Agents and Editors

Coding agents are routinely used in this repository for activities such as:

- Co-development
- Code review support
- Draft pull requests and exploratory implementations

Repository-specific guidance for GitHub Copilot is provided in
[.github/copilot-instructions.md](.github/copilot-instructions.md).

Specialized reusable modes live in `.github/agents/*.agent.md`. Use these
files for task-specific agent behavior, not for repository-wide defaults.
Keep the always-on project guidance in `.github/copilot-instructions.md`.

Each agent markdown file should:

- declare `name` and `description` in YAML frontmatter,
- include the trigger phrases in `description`,
- stay focused on one workflow or domain.

Examples in this repository include:

- `.github/agents/plan.agent.md` for planning and architecture work,
- `.github/agents/playwright-tester.agent.md` for browser exploration and
  Playwright tests,
- `.github/agents/expert-react-frontend-engineer.agent.md` for React client tasks.

Minimal example:

```md
---
name: "Playwright Tester"
description: "Testing mode for Playwright tests"
tools: ["search/codebase", "execute/runInTerminal"]
---

# Core Responsibilities
Describe the testing workflow and boundaries for this mode.
```

When generated code contributes substantial logic, disclosure in the pull
request description is expected.

Contributions should not include code that has not been reviewed and
understood by the contributor.

## Quality Gates

Quality is evaluated through the following systems:

- [Qlty](https://docs.qlty.sh) for static analysis and linting
- [Codecov](https://codecov.io/gh/INTO-CPS-Association/DTaaS) for test coverage
- [GitHub Actions](https://github.com/INTO-CPS-Association/DTaaS/actions)
  for CI execution

### Qlty

Install and run Qlty as follows:

```bash
qlty check --no-fail --sample 5 --no-formatters
```

Newly introduced findings should be resolved before merge.

### Code Coverage

Coverage trends are tracked in Codecov. Testing guidance is available in
the documentation at `docs/developer/testing/intro.md`.

### CI Execution

All pull requests and direct commits are expected to pass the configured
GitHub Actions workflows.
