# Contributors Guide

Welcome to the Digital Twin as a Service (DTaaS) contributing guide

Thank you for investing your time in contributing to our project!

Read our [Code of Conduct](./CODE_OF_CONDUCT.md) to keep our community
approachable and respectable.

In this guide you will get an overview of the contribution workflow
from opening an issue, creating a PR, reviewing, and merging the PR.

## Project Goals

It helps development team members get familiar with
the DTaaS project software design, and development processes.
Please see developer-specific
[Slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/20250605_Developer.pdf),
[Video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250605_Developer-recorded_web.mp4),
and [Research paper](https://arxiv.org/abs/2305.07244).

## :computer: Development Environment

There is a devcontainer configuration (`.devcontainer/devcontainer.json`)
for the project. Please use it to get a dockerized development environment.
DevContainer is the easiest way to get started.

<!--
TODO insert when githooks works

### git hooks

The git-hooks will ensure that your commits are formatted
correctly and that the tests pass before you
push the commits to remote repositories.

The project uses pre-commit for managing git hooks. Install git hooks using

```bash
pre-commit install
```

The git hooks run during pre-commit (`git commit`) and
pre-push (`git push`) stages. No special flags and options are
needed to run these git hooks.

You can also run the git-hooks manually before committing or pushing
by using the run commands below. The autoupdate command will set the
revisions of the git repos used in the .pre-commit-config.yaml up to date.

```bash
pre-commit run --hook-stage pre-commit # runs format and syntax checks
pre-commit run --hook-stage pre-push   # runs test
pre-commit autoupdate                  # update hooks to latests versions
```

Be aware that the some tests may take a long time to run.
If you want to skip the tests or formatting,
you can use the `--no-verify` flag
on `git commit` or `git push`. Please use this
option with care.

-->

## :building_construction: Development Workflow

To manage collaboration by multiple developers on the software,
a development workflow is in place. Each developer should follow these steps:

1. Fork of the main repository into your github account.
1. Setup
   [Qlty](https://docs.qlty.sh/cloud/quickstart)
   and
   [Codecov](https://docs.codecov.com/docs/quick-start)
   for your fork. The codecov does not require secret token
   for public repositories.
1. Use NodeJS 22 and Python 3.12 development environments
1. Use
   [Fork, Branch, PR](https://gun.io/news/2017/01/how-to-github-fork-branch-and-pull-request/)
   workflow.
1. Work in your fork and open a PR from your working
   branch to your `feature/distributed-demo` branch.
   The PR will run all the github actions, qlty and codecov checks.
1. Resolve all the issues identified in the previous step.
1. Once changes are verified, a PR should be made to
   the `feature/distributed-demo` branch of
   the upstream
   [DTaaS repository](https://github.com/into-cps-association/DTaaS).
1. The PR will be merged after checks by either the
   project administrators or the maintainers.

Remember that every PR should be meaningful and satisfies
a well-defined user story or improve
the code quality.

## ✨Coding Agents and Editors

We make extensive use of coding agents. A non-exhaustive list of
usage scenarios are:

👍 co-development
👍 code reviews
👍 draft pull requests to prototype ideas

This monorepo has [copilot instructions](.github/copilot-instructions.md)
to inform github copilot about the project structure and software
development conventions.

Most Code IDEs like VSCode and Cursor have native integration of
coding agents. No extra-effort is necessary for integrating these
LLM-driven development workflows. Please disclose the code generated
by the coding agent, especially if it embeds significant
programming logic.

Having said that, the following are a strict NO-NO:

👎Contributing unknown code
👎Not knowing the generated code

**TLDR**: Know your contributions and do not outsource your thinking
to coding agents.

## :eye: Code Quality

The project code qualities are measured based on:

- Linting issues identified by [qlty](https://docs.qlty.sh).
  Please [install qlty](https://docs.qlty.sh/cli/quickstart) and use
  the following command to check for code quality issues.
  `qlty check --no-fail --sample 5 --no-formatters` and resolve
  any issues identified by the **qlty**.
  (Please note that qlty only checks the files that changed from
  the default branch, i.e., `feature/distributed-demo`).
- Test coverage report collected by
  [Codecov](https://codecov.io/gh/INTO-CPS-Association/DTaaS)
- Successful [github actions](https://github.com/INTO-CPS-Association/DTaaS/actions)

### Qlty

Qlty performs static analysis, linting and style checks.
Quality checks are performed by qlty are to ensure the best
possible quality of code to add to our project.

While any new issues introduced in your code would be
shown in the PR page itself, to address any specific issue,
you can visit the issues or code section of the qlty page.

It is highly recommended that any code you add does
not introduce new quality issues. If they are introduced,
they should be fixed immediately using the appropriate suggestions
from Qlty, or in worst case, adding a ignore flag
(To be used with caution).

### Codecov

Codecov keeps track of the test coverage for the entire project.
For information about testing and workflow related to that,
please see the [testing page](testing/intro.md).

### Github Actions

The project has multiple
[github actions](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/.github/workflows)
defined. All PRs and direct code commits must have successful
status on github actions.
