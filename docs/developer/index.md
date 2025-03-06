# Contributors Guide

Welcome to the Digital Twin as a Service (DTaaS) contributing guide

Thank you for investing your time in contributing to our project!

Read our [Code of Conduct](conduct.md) to keep our community
approachable and respectable.

In this guide you will get an overview of the contribution workflow
from opening an issue, creating a PR, reviewing, and merging the PR.

## Project Goals

It helps development team members get familiar with
the DTaaS project software design, and development processes.
Please see developer-specific
[Slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/DTaaS-developer-overview_march2024.pdf),
[Video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/DTaaS-developer-overview_march2024.mp4),
and [Research paper](https://arxiv.org/abs/2305.07244).

## :computer: Development Environment

Please use the steps given here to have suitable development
environment.

### DevContainers

There is a devcontainer configuration (`.devcontainer/devcontainer.json`)
for the project. Please use it to get a dockerized development environment.
DevContainer is the easiest way to get started.

### DevContainers

There is a devcontainer configuration (`.devcontainer/devcontainer.json`)
for the project. Please use it to get a dockerized development environment.
DevContainer is the easiest way to get started.

### Ubuntu/Linux

The code base has been developed for most part on
Ubuntu/Linux Operating System.Thus certain parts of the code base might
have bugs when run on Windows. At the moment, only
[runner](../user/servers/execution/runner/README.md) has problems running
on non-Linux OS.

The development environment can be installed by using the following
scripts.

```bash
bash script/env.sh
bash script/docker.sh
```

:warning: The docker images are large and are likely to consume
about 5GB of bandwidth and 15GB of space.
You will have to download the docker images on a really good network.

### Windows

The development environment scripts for Windows are still buggy.
Any help in improving them is greatly appreciated.
Given that, caveat, please use the following installation steps
for Windows.

Two powershell installation scripts, namely `base.ps1` and `env.ps1`
are available to install the required
software packages. But errors might crop up due to missing
environment variables. The potential errors are:

1. `npm is not recognized.........` in `base.ps1`.
1. `gem is not recognized.........` in `env.ps1`

If you encounter these errors,
remember to include _node_ and _ruby_ installation locations in
**PATH** environment variable
(`Settings --> search for "system environment variables"`
`--> Advanced --> Environment Variables --> PATH`).

The `base.ps1` and `env.ps1` scripts can be run again after setting
the correct **PATH** environment variable.

#### Pre-install Nodejs and Ruby Software

Another way to solve the **PATH** environment problem is to
install Nodejs and Ruby software packages before running the powershell
scripts.

1. Install the latest stable version of NodeJS from the
   [official NodeJS website](https://nodejs.org/en).
1. Install Ruby from
   [official Ruby website](https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-3.1.2-1/rubyinstaller-devkit-3.1.2-1-x64.exe)
   and follow all the defaults during the installation.

#### Run Scripts

Then, open powershell with **administrative** priviledges and run the
following commands in the given order:

```bash
powershell -executionpolicy bypass -F script/base.ps1
powershell -executionpolicy bypass -F script/env.ps1
powershell -executionpolicy bypass -F script/docker.ps1
```

:warning: The docker images are large and are likely to consume
about 5GB of bandwidth and 15GB of space.
You will have to download the docker images on a really good network.

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
   [Code Climate](https://docs.codeclimate.com/docs/getting-started-with-code-climate)
   and
   [Codecov](https://docs.codecov.com/docs/quick-start)
   for your fork. The codecov does not require secret token
   for public repositories.
1. nvm use 22 (if nvm or node isn't installed)
1. Use
   [Fork, Branch, PR](https://gun.io/news/2017/01/how-to-github-fork-branch-and-pull-request/)
   workflow.
1. Active the Python Virtual Enviornment by calling (`./dtaas-venv/bin/activate`)
1. Work in your fork and open a PR from your working
   branch to your `feature/distributed-demo` branch.
   The PR will run all the github actions, code climate and codecov checks.
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

## :eye: Code Quality

The project code qualities are measured based on:

- Linting issues identified by
  [Code Climate](https://codeclimate.com/github/INTO-CPS-Association/DTaaS)
- Test coverage report collected by
  [Codecov](https://codecov.io/gh/INTO-CPS-Association/DTaaS)
- Successful [github actions](https://github.com/INTO-CPS-Association/DTaaS/actions)

### Code Climate

Code Climate performs static analysis, linting and style checks.
Quality checks are performed by codeclimate are to ensure the best
possible quality of code to add to our project.

While any new issues introduced in your code would be
shown in the PR page itself, to address any specific issue,
you can visit the issues or code section of the codeclimate page.

It is highly recommended that any code you add does
not introduce new quality issues. If they are introduced,
they should be fixed immediately using the appropriate suggestions
from Code Climate, or in worst case, adding a ignore flag
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
