# Local Server Script

This page describes the code of the local server script, which runs the
integrated GitLab installation package on one machine under the
hostname `intocps.test` and tests its container registry. How to use
the script is in [Local Server Testing](../contributions/local-server-testing.md)
and [Local Registry Testing](../contributions/local-registry-testing.md).

## Location and Purpose

Source directory:

- `developer/local-server`

The script:

- prepares the host: hosts entry, port limit for Rancher Desktop,
  mkcert root CA, and the CA for the Docker daemon,
- copies and configures the
  `deploy/dtaas/docker/secure-server_with_integrated-gitlab` package,
- starts the package with a compose override and waits for GitLab,
- creates the GitLab users and OAuth 2.0 applications,
- tests the registry by hand and from a pipeline on a GitLab runner.

## Design Choices

- **Test what ships.** The script runs the package's own
  `docker-compose.yml`, copied from `deploy/` on every run, and adds only
  `compose.local.yml`. It never changes files in `deploy/`.
- **Standard library only.** The script needs Python 3.10 or later and
  no packages. `requirements.txt` lists only the checking tools.
- **Repeatable steps.** Every command can run again. Each step checks
  the current state first: an existing hosts entry, an existing
  certificate, existing users. Whether to register the OAuth 2.0
  applications depends on what GitLab has, not on `config/.env`,
  because `clean` deletes GitLab's data but not the configuration.
- **Generated state outside the repository.** The package copy,
  certificates, tokens and passwords live in the working directory,
  `~/dtaas-local-test` by default. Secrets are files that only the owner
  can read.
- **Templates as files.** The compose override, Dockerfile, runner
  configuration and test pipeline are files next to the code, so that
  they can be read, linted and changed without editing Python.

## Layout

| Path                          | Purpose                                                |
| :---------------------------- | :----------------------------------------------------- |
| `src/local_server.py`         | Command line and the order of the steps                |
| `src/settings.py`             | Hostname, port, working directory and derived paths    |
| `src/shell.py`                | Runs commands, with or without `sudo`                  |
| `src/host.py`                 | Hosts entry, port limit, mkcert, registry CA           |
| `src/package.py`              | Package copy, configuration, certificate, image        |
| `src/stack.py`                | `docker compose` with the override, readiness wait     |
| `src/gitlab.py`               | GitLab REST API client and the root token              |
| `src/configure.py`            | Users, OAuth 2.0 applications, secrets                 |
| `src/runner.py`               | Runner registration and its compose project            |
| `src/registry_check.py`       | Push and pull, pipeline run                            |
| `compose.local.yml`           | Override copied next to the package's compose file     |
| `forward-auth/Dockerfile`     | traefik-forward-auth image that trusts the mkcert CA   |
| `runner/`                     | Compose file and configuration template of the runner  |
| `registry-test.gitlab-ci.yml` | Pipeline that publishes an image and runs a job in it  |
| `tests/`                      | Unit tests                                             |
| `pytest.ini`                  | Puts `src/` and `tests/` on the import path            |
| `requirements.txt`            | Pinned checking tools: flake8, pylint and pytest       |

## Control Flow

`local_server.py` maps each command to one function that takes a
`Settings` object:

| Command     | Function                             | Module              |
| :---------- | :----------------------------------- | :------------------ |
| `host`      | `prepare_host`                       | `host.py`           |
| `package`   | `prepare_package`                    | `package.py`        |
| `up`        | `start`                              | `stack.py`          |
| `configure` | `configure_gitlab`                   | `configure.py`      |
| `check`     | `check_registry`                     | `registry_check.py` |
| `all`       | `run_all`: the five functions above  | `local_server.py`   |
| `down`      | `stop_all`                           | `local_server.py`   |
| `clean`     | `clean`                              | `local_server.py`   |

`main` turns failed commands, HTTP errors, `RuntimeError` and
`TimeoutError` into an error message and exit code 1. A check that runs
but fails also exits with 1.

The runtime of the active Docker context decides where the registry CA
goes: `rancher-desktop` and `desktop-*` contexts use
`~/.docker/certs.d`, any other context uses `/etc/docker/certs.d`
through `sudo`.

## Development

The unit tests replace `subprocess`, `sudo` and the GitLab API with test
doubles, so they need neither Docker nor GitLab. From
`developer/local-server`:

```bash
pip install -r requirements.txt
flake8 src tests --max-complexity=10 --max-line-length=127
pylint src tests --rcfile=../../.pylintrc --recursive=y
python -m pytest
```

The unit tests do not start containers. After changing the script, the
compose override or the integrated package, run the script end to end:

```bash
python3 developer/local-server/src/local_server.py all
```

## Continuous Integration

The `Local Server Script` workflow,
`.github/workflows/developer-local-server.yml`, runs flake8, pylint with
the repository's `.pylintrc` and pytest on Python 3.10 and 3.14. It runs
for changes under `developer/local-server/`, to `.pylintrc` and to the
workflow itself. A finding fails the job. The end-to-end run needs
Docker and `sudo`, so it does not run in CI.

## Adding a Command

1. Write a function that takes `Settings` in the module it belongs to.
1. Add it to `COMMANDS` in `local_server.py` with a one-line summary.
1. Add unit tests in `tests/` that replace commands and API calls with
   test doubles.
1. Document the command in `developer/local-server/README.md` and in
   [Local Server Testing](../contributions/local-server-testing.md).
