# :technologist: Developers Guide

This guide is to help developers get familiar with the project. Please see
developer-specific
[Slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/DTaaS-overview.pdf),
[Video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/DTaaS-overview.mkv),
and [Research paper](https://arxiv.org/abs/2305.07244).

## Development Environment

Ideally, developers should work on Ubuntu/Linux.Other operating systems
are not supported inherently and may require additional steps.

To start with, install the required software and git-hooks.

```bash
bash script/env.sh
bash script/configure-git-hooks.sh
```

The git-hooks will ensure that your commits are formatted
correctly and that the tests pass before you
push your changes.

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

## Development Workflow

To manage collaboration by multiple developers on the software,
a development workflow is in place. Each developer should follow these steps:

1. Fork of the main repository on into your github account.
1. Setup codeclimate and codecov for your fork.
1. Install git-hooks for the project.
1. Use
[Fork, Branch, PR](https://gun.io/news/2017/01/how-to-github-fork-branch-and-pull-request/)
workflow.
1. Work in your fork and open a PR from your working branch to your main branch.
The PR will run all the github actions, code climate and codecov checks.
1. Resolve all the issues identified in the previous step.
1. If you have access to the
[integration server](https://github.com/INTO-CPS-Association/DTaaS/wiki/DTaaS-Integration-Server)
try your working branch on the integration server.
1. Once changes are verified, a PR should be made to the main branch of the upstream DTaaS repository.
1. The PR will be merged after checks by either the project administrators or the maintainers.

Remember that every PR should be meaningful and satisfies a well-defined user story or improve
the code quality.

## Code Quality

Quality checks are performed by CodeClimate to ensure the best possible quality of code to add to our project.

While any new issues introduced in your code would be shown in the PR page itself, to address any specific issue, you can visit the Issues or Code section of the CodeClimate page.

It is highly recommended that any code you add does not introduce new quality issues. If they are introduced, they should be fixed immediately using the appropriate suggestions from CodeClimate, or in worst case, adding a ignore flag (To be used with caution).

## Testing

For information about testing and workflow related to that, please see the [testing page](testing/intro.md).

## Live Demo Server

A demo server is up and running at [https://sandbox.cps.digit.au.dk/](https://sandbox.cps.digit.au.dk/). Developers will need credentials to log in.
