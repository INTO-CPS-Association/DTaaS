# Contribution Guide

This guide describes how to contribute to the Digital Twin as a Service
(DTaaS) repository.

All participation must comply with the
[Code of Conduct](CODE_OF_CONDUCT.md).

## 🎯 Purpose

The contribution process keeps every change traceable and reviewable, and
holds it to the project's quality standards.

Background material for contributors:

- [Developer slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/20250605_Developer.pdf)
- [Developer video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250605_Developer-recorded_web.mp4)
- [Research paper](https://arxiv.org/abs/2305.07244)

## 🛠️ Development Environment

The repository includes a devcontainer definition at
`.devcontainer/devcontainer.json`.

The devcontainer is the recommended way to get a consistent Docker-based
development environment. VS Code's **Reopen in Container** runs
`developer/devenv/init.sh` on the host first; outside VS Code, run that script
once and follow
[developer/devenv/README.md](developer/devenv/README.md).

Recommended toolchain versions:

- Node.js 26
- Python 3.14

## 🔄 Workflow

1. Create a fork of the repository in a personal GitHub account.
2. Configure
   [Qlty](https://docs.qlty.sh/cloud/quickstart)
   and
   [Codecov](https://docs.codecov.com/docs/quick-start)
   for the fork.
3. Use a fork/branch/pull-request workflow for all changes.
4. Open pull requests against the fork branch used for active development.
5. Resolve all findings from CI, SonarQube, Qlty and the coverage checks.
6. Submit an upstream pull request to the target branch of
   [DTaaS](https://github.com/into-cps-association/DTaaS).
7. Wait for a maintainer or administrator to review and merge it.

Each pull request should represent a coherent user story, bug fix, or
quality improvement.

## 🤖 Coding Agents and Editors

Coding agents are used in this repository for work such as:

- Co-development
- Code review support
- Draft pull requests and exploratory implementations

Every coding agent reads [AGENTS.md](AGENTS.md) for the general coding
guidelines and [PROJECT.md](PROJECT.md) for the repository-specific
instructions. Task-specific instructions are Agent Skills in
`.agents/skills/`, each with a Claude Code stub in `.claude/skills/`.
[Coding Agents](docs/developer/contributions/coding-agents.md) lists the
skills and explains how to add one.

If generated code contributes substantial logic, say so in the pull
request description.

Do not contribute code that you have not reviewed and understood.

## ✅ Quality Gates

These systems evaluate quality:

- [SonarQube](https://sonarcloud.io/summary/new_code?id=INTO-CPS-Association_DTaaS)
  for bugs, vulnerabilities, code smells and duplication
- [Qlty](https://docs.qlty.sh) for static analysis and linting
- [Codecov](https://codecov.io/gh/INTO-CPS-Association/DTaaS) for test coverage
- [GitHub Actions](https://github.com/INTO-CPS-Association/DTaaS/actions)
  for CI execution

### Qlty

After [installing Qlty](https://docs.qlty.sh), run it as follows:

```bash
qlty check --no-fail --sample 5 --no-formatters
```

Resolve new findings before the pull request is merged.

### Code Coverage

Codecov tracks coverage trends. For testing guidance, see
[Testing](docs/developer/technical-concepts/testing.md).

### CI Execution

Every pull request and direct commit must pass the configured GitHub
Actions workflows.
