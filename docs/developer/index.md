# Developers Guide

This guide is to help developers get familiar with the project. Please see
developer-specific
[Slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/DTaaS-overview.pdf),
[Video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/DTaaS-overview.mp4),
and [Research paper](https://arxiv.org/abs/2305.07244).

## :computer: Development Environment

Ideally, developers should work on Ubuntu/Linux. Other operating systems
are not supported inherently and may require additional steps.

To start with, install the required software and git-hooks.

```bash
bash script/env.sh
bash script/configure-git-hooks.sh
```

The git-hooks will ensure that your commits are formatted
correctly and that the tests pass before you
push the commits to remote repositories.

You can also run the git-hooks manually before committing or pushing
by using the run commands below. The autoupdate command will set the
revisions of the git repos used in the .pre-commit-config.yaml up to date.

```bash
pre-commit run --hook-stage pre-commit # runs format and syntax checks
pre-commit run --hook-stage pre-push   # runs test
pre-commit autoupdate                  # update hooks to latests versions
```

Be aware that the tests may take a long time to run.
If you want to skip the tests or formatting,
you can use the `--no-verify` flag
on `git commit` or `git push`. Please use this
option with care.

There is a script to download all the docker containers
used in the project. You can download them using

```bash
bash script/docker.sh
```

:warning: The docker images are large and are likely to consume
about 5GB of bandwidth and 15GB of space.
You will have to download the docker images on a really good network.

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
1. Install git-hooks for the project.
1. Use
   [Fork, Branch, PR](https://gun.io/news/2017/01/how-to-github-fork-branch-and-pull-request/)
   workflow.
1. Work in your fork and open a PR from your working
   branch to your `feature/distributed-demo` branch.
   The PR will run all the github actions, code climate and codecov checks.
1. Resolve all the issues identified in the previous step.
1. If you have access to the
   [integration server](https://github.com/INTO-CPS-Association/DTaaS/wiki/DTaaS-Integration-Server),
   try your working branch on the integration server.
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
