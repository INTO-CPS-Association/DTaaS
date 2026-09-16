# Agent Contract

Guidance for coding agents working on DTaaS. Claude Code reads
`CLAUDE.md`, which points here. Both describe the same contract.

## Autonomy

Work through the full cycle for routine changes without pausing at each
step. Pause only for irreversible actions (force-push, history rewrite,
deletion, publishing) or requirements with two defensible readings that
lead to materially different work.

## Behaviour

**Think before coding.** State assumptions. Where several readings
exist, present them rather than choosing silently.

**Simplicity first.** Write the minimum that solves the stated problem.
No speculative abstraction, unrequested configurability, or defensive
handling for impossible states.

**Surgical changes.** Every changed line traces to the task. Match local
style. Remove imports your change orphans; report pre-existing dead code
instead of deleting it in the same diff.

**Goal-driven execution.** Turn the task into a check you can run.
"Fix the bug" becomes "write a failing test, then make it pass."

## Build and test commands

Non-obvious. Use these rather than guessing a script name.

| Project | Command |
| :--- | :--- |
| `client` | `yarn build && yarn config:test && yarn test:unit && yarn test:int` |
| `servers/lib` | `yarn build && yarn test:all` |
| `servers/logger` | `yarn test` |
| `lib/dt-automation` | `yarn test:unit` |
| `cli` | `poetry run python src/pkg/build.py && poetry run pytest` |
| `lib/gitlab_common` | `poetry run pytest` |
| `deploy/services/cli` | `poetry run python -m dtaas_services.pkg.build && CI=true poetry run pytest --ignore=tests/system_tests` |

Why each is written that way:

- The client scripts pass `--setupFilesAfterEnv`, which installs the
  `react-redux` mock. Bare `jest` omits it and roughly 150 tests fail
  for that reason alone.
- `servers/lib`'s `test:nocov` adds `test/cloudcmd`, which needs a
  configured `.env` and a running libms under pm2.
- `lib/dt-automation` has no `test` script.
- `cli` and `deploy/services/cli` vendor shared code before their tests
  can be collected.
- `dtaas-services` checks for root before validating arguments, so
  non-root runs need `CI=true`. Its `system_tests` shell out to
  `docker`.

`developer/devenv/` provides a container with every one of these
toolchains. Docker-driven work runs on the host; see its README.

## Verifying a change

Run the commands above for the projects you touched. Compare against the
merge base before reporting a regression: run the same command there and
compare counts. Report pre-existing failures; do not fix them in the
same diff.

Claim something passes only after seeing it pass.

## Shipping

1. Branch from the default branch. Never commit to it directly.
1. Commit with a concise imperative subject and a body listing concrete
   changes.
1. Sweep documentation your change made stale. Search the repository for
   paths, names and numbers you moved.
1. Open a pull request.
1. Wait for CI. Read the failures rather than re-running blindly.
1. Address review, then merge.

## Code standards

Enforced by tooling, not prose: `.pylintrc`, eslint, prettier,
`.markdownlint.yaml`, `.mdl_style.rb` and `.yamllint.yml`. Run them
rather than reasoning about style.

`pre-commit run --hook-stage pre-commit` is safe and fast; it covers
formatting, markdown and shell checks.

Do not rely on the pre-push hooks. Two of them invoke commands that fail
on a clean checkout: `yarn-jest-client` runs bare `jest`, which omits the
setup file and fails ~150 client tests, and `yarn-test-lib` runs
`test:nocov`, which needs a running libms. Use the command table above
instead.

Beyond those: prefer clarity to cleverness, keep functions focused, name
symbols meaningfully, comment only non-obvious logic, and handle errors
deliberately. Add a dependency only when the task requires it.
