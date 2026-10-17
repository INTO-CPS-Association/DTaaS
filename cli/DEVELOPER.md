# DTaaS Command Line Interface Developer Notes

This document outlines the development strategy and contribution guidelines.
The source code for the CLI is located in the _cli/src_ directory.

## Dependencies

A ready-made container with Python, Poetry and the rest of the toolchain
is available; see
[developer/devenv/README.md](../developer/devenv/README.md). It saves
installing these on your host.

The CLI is written in Python and uses the following libraries:

- [Click](https://click.palletsprojects.com/en/8.1.x/) : Used for
  development of the CLI commands.

- [PyYaml](https://pyyaml.org/wiki/PyYAMLDocumentation) : Used for
  handling yaml files across CLI functions. Usage of this to read
  from and write to Yaml files has been wrapped by functions in the
  _cli/src/pkg/utils.py_ file. These functions should be used directly
  to handle Yaml files.

- [TomlKit](https://readthedocs.org/projects/tomlkit/) : Used for
  handling toml files across the CLI. Usage of reading toml files
  has been wrapped in a function in _cli/src/pkg/utils.py_ file.
  This function should be used directly to read toml files.

- [python-on-whales](https://gabrieldemarmiesse.github.io/python-on-whales/) :
  Used by the `platform install` / `platform uninstall` commands
  (_cli/src/pkg/deploy.py_) to drive `docker compose up`/`down`. It wraps the
  docker CLI (which must be installed on the host) and raises a
  `python_on_whales.exceptions.DockerException` carrying the real command
  output (return code and stderr) when a compose operation fails. It is also
  used by _cli/src/pkg/state.py_ to read best-effort container id/status when
  writing the `.dtaas.state.json` runtime cache.

- [Poetry Package](https://python-poetry.org/docs/) to manage
  dependencies and build the CLI. The configuration file for this is
  _cli/pyproject.toml_. New source packages and dependencies need to be
  added here.

- [Pyright](https://github.com/microsoft/pyright) : Used for static type checking.

- [python-gitlab](https://python-gitlab.readthedocs.io/) : GitLab API client,
  used via the shared `gitlab_common` module for GitLab user provisioning.

## Setup

```bash
pip install poetry               # install poetry to the system
cd cli                           # switch to the cli directory
poetry install                   # install all required python packages
```

Two things are generated and not committed to the repository. Before running
tests or building the package, copy them from their sources:

```bash
poetry run python -m src.pkg.build
```

This populates `src/templates/deploy/` from `deploy/dtaas` and
`deploy/workspace`, and `src/gitlab_common/` from `lib/gitlab_common` (see
[lib/gitlab_common/README.md](../lib/gitlab_common/README.md)). Re-run it
whenever either source changes. Without it, `import src.cmd` fails with
`ModuleNotFoundError: No module named 'src.gitlab_common'`.

## Development

Make changes to _cli/src_.
To test changes locally:

```bash
poetry run python -m src.pkg.build  # required before build/tests, see Setup
poetry run dtaas --help              # run the CLI from source
poetry build                         # build the python package
```

## Linting

From the _cli_ directory, run:

```bash
poetry run pylint src tests --rcfile=../.pylintrc
```

## Type Checking

From the _cli_ directory, run:

```bash
poetry run pyright src
```

Pyright is configured in `pyproject.toml` under `[tool.pyright]`.
Pyright errors should be resolved before submitting a pull request.

## Testing

Test files are placed in the _cli/tests_ directory and must follow the
_test_*.py_ naming convention.
To run all tests with coverage:

```bash
poetry run pytest --cov=src --cov-report=xml --cov-report=term-missing
```

### Caveat

The tests need no local _dtaas.toml_. The `test_import_toml` function in
_test_utils.py_ reads the committed fixture _tests/dtaas.test.toml_.

## Security Check

To scan for known security vulnerabilities in dependencies, use the `safety` tool.

```bash
safety scan --detailed-output # detailed security report
safety scan                   # summary security report
```

This command checks all installed packages against a database of
known vulnerabilities and provides detailed information about any
security issues found.

## Publishing

The CLI is published to [PyPI](https://pypi.org/).
Once new changes are merged into the DTaaS
repository, the CLI is published to the official DTaaS PyPI account.

To test changes as they would appear in a published package,
create a personal PyPI account, generate an
[API token](https://pypi.org/help/#apitoken), and publish using Poetry:

```bash
poetry publish
```

## Future Work

The long-term objective for the CLI is to serve as the standard tool for
administrators to set up, manage, and interact with a DTaaS instance.
The following are the planned next steps:

- Incorporating the AuthMS _conf_ file rules
  in the user management commands.

- [Bug fix] Currently users with usernames containing
  a '.' in it aren't handled well by the CLI and result in errors.
  This is because '.' is a special character for labels in docker compose.
  We need to include such usernames, simply by internally replacing
  '.' instances in usernames by '-' or '_'.

## User Management Files: Design Rationale

This section explains _why_ user management is split across three files.

### The problem this design solves

Earlier, `dtaas.toml` had a single `[users]` table with `add`/`delete` lists.
That file was expected to do two incompatible jobs at once: be a
human-edited setting, and be a machine-processed to-do list. Nothing ever
cleared the list once it was processed, so after successfully adding
`alice`, `dtaas.toml` still said `add = ["alice"]`. Running `user add` again say,
to also add `bob` had no way to tell "alice is already done, only provision
bob," which could lead to duplicate or conflicting containers.
There was no persistent record, separate from the config file, of _who had
actually already been provisioned_.

### Three files, three owners

The fix is to stop making one file do two jobs. Each file below has exactly
one owner and one responsibility:

| File | Owner | Responsibility |
|---|---|---|
| `dtaas.toml` `[[users]]` | Human, once, at install time | The `starting` users the instance is installed with |
| `dtaas.users.registry.json` | The CLI, exclusively | Every `additional` user, added at any point after install |
| `.dtaas.state.json` | The CLI, exclusively | A disposable snapshot of what is actually running right now |

### Why each file behaves the way it does

- **`dtaas.toml` is never rewritten by the CLI, ever.** Once a human commits
  `starting` users at install time, the CLI only _reads_ that list (for
  `platform install` and `deployment generate`). A comment-bearing, reviewed
  config file should never be silently mutated by a tool that risk is
  exactly what made the old `add`/`delete` design fragile.
- **`dtaas.users.registry.json` is a merge, not a replace.** `user add`
  unions new users into the existing store and skips (with a warning, not an
  overwrite) anyone already present either already registered, or already
  a `starting` user in `dtaas.toml`. This is what actually fixes the
  duplicate-container bug: there is now one unambiguous, persistent answer to
  "has this user already been added," instead of an unprocessed to-do list.
- **`.dtaas.state.json` is disposable by design.** It is gitignored, and each
  write fully replaces its contents with a fresh snapshot (it is _not_ an
  append-only log). If you delete it, nothing is lost the CLI rebuilds it
  on the next `add`/`delete`. Its only job is to remember, per user, a hash
  of the config it was last provisioned with, so a later run can tell
  whether that config has since changed underneath it.
- **`dtaas config reconcile` treats the registry as the desired
  state, not the state cache.** An earlier version of `reconcile` compared
  `.dtaas.state.json` against the live compose services but since the
  state cache is written from that same compose data at the end of every
  `add`/`delete`, the two would almost always agree by construction, so that
  comparison rarely caught anything meaningful. Comparing the _registry_
  (who should exist) against the _live services_ (who does exist) is the
  comparison that actually matters, and is what lets `reconcile` catch a
  registered user who never got provisioned (e.g. an interrupted `add`).
  `.dtaas.state.json` is kept for exactly one narrower job it's suited for:
  detecting whether a provisioned user's config has since drifted.
- **`starting` and `additional` users are provisioned through genuinely
  different mechanisms, on purpose.** `starting` users are baked into the
  main `docker-compose.yml` at `deployment generate` time, in a fixed number
  of slots per deploy type. `additional` (registry) users get a dynamically
  managed, separate `compose.users.yml`. This means `.dtaas.state.json`
  only tracks `additional` users. `dtaas.users.registry.json` keeps them
  under `users`; its separate `starting_users` section holds only the
  GitLab markers (`gitlab_user_id`, `gitlab_pat_issued`) of `starting`
  users that `user add` has provisioned on GitLab.
