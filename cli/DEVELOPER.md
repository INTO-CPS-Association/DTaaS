# DTaaS Command Line Interface — Developer Notes

This document outlines the development strategy and contribution guidelines.
The source code for the CLI is located in the _cli/src_ directory.

## 📦 Dependencies

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
  Used by the `admin install` / `admin uninstall` commands
  (_cli/src/pkg/deploy.py_) to drive `docker compose up`/`down`. It wraps the
  docker CLI (which must be installed on the host) and raises a
  `python_on_whales.exceptions.DockerException` carrying the real command
  output (return code and stderr) when a compose operation fails.

- [Poetry Package](https://python-poetry.org/docs/) to manage
  dependencies and build the CLI. The configuration file for this is
  _cli/pyproject.toml_. New source packages and dependencies need to be
  added here.

- [Pyright](https://github.com/microsoft/pyright) : Used for static type checking.

## 🏗️ Code Structure

The CLI has two layers of code:

- Command line definition layer: This is the _src/cmd.py_ file. It
  deals with defining the structure of the CLI, and the specific
  CLI commands itself. The CLI functions in this file call
  the Package layer functions. Non-command helpers shared by the
  command definitions live alongside it in _src/cmd_utils.py_.

- Package layer: This is the _cli/src/pkg_ directory.
  It contains the
  singleton Config class, which is used throughout the CLI.
  Additionally,
  it contains the handling functions for each CLI subcommand.
  These functions perform
  the actual operations that the CLI command
  is responsible for. It also
  has helper functions that can be used across the CLI.

### TOML File

The base configuration file used by the CLI is the _dtaas.toml_ file.
It has the following sections:

#### Global variables

```toml
name="Digital Twin as a Service (DTaaS)"
version="0.8.0"
owner="The INTO-CPS-Association"
git-repo="https://github.com/into-cps-association/DTaaS.git"
```

These define metadata about the DTaaS instance and are not directly used
by the CLI.

#### [common]

```toml
[common]
server-dns="intocps.org"
path="/Users/username/DTaaS"

[common.security]
tls=true
certs-src="/etc/letsencrypt/archive/intocps.org"

[common.resources]
cpus=4
mem_limit="4G"
pids_limit=4960
shm_size="512m"
```

- _server-dns_: determines localhost vs. server deploy; sets routes in docker
  compose files.
- _path_: absolute path to the DTaaS installation; required for workspace
  creation and docker services.
- _tls_: `false` uses `user.server.yml`; `true` (default) uses `user.server.secure.yml`.
- _certs-src_: source directory of the TLS certificates. For TLS deploy types,
  `generate-deployment` copies the latest `fullchain.pem`/`privkey.pem` from
  here into the deployment's `certs/` directory (see `src/pkg/certs.py`).
- Resource fields set default container limits for user workspaces.

#### [users]

```toml
[users]
add=["username1","username2"]
delete=["username2"]

[users.username1]
email="username1@intocps.org"
```

- _add_: list of usernames to create.
- _delete_: list of usernames to remove.
- Per-user sub-tables provide the _email_ field, written to
  `config/conf.server` on `dtaas admin user add`.

#### [frontend]

```toml
[frontend]
react-app-client-id="your_client_id_here"
react-app-oauth-url="https://gitlab.com"
```

OAuth credentials for the DTaaS React client website. This is a separate OAuth application
from the server-side one (traefik-forward-auth). Values are substituted into `config/client.js`
by `generate-deployment`.

#### Deployment sections

Each deploy type has its own section (`[localhost]`, `[insecure-server]`,
`[secure-server]`, `[secure-server-gitlab]`, `[workspace-localhost]`,
`[workspace-secure-server]`). These hold server-side OAuth credentials
substituted into `.env` and `conf.server` by `generate-deployment`.

## ⚙️ Setup

```bash
pip install poetry               # install poetry to the system
poetry shell                     # activate the poetry virtual environment
cd cli                           # switch to the cli directory
poetry install                   # install all required python packages
```

The deploy templates are not committed to the repository.
Before running tests or building the package, copy them from their sources:

```bash
python src/pkg/build.py
```

This populates `src/templates/deploy/` from `deploy/dtaas` and
`deploy/workspace`. Re-run it whenever those source directories change.

## 🔧 Development

Make changes to _cli/src_.
To test changes locally:

```bash
poetry shell   # activate the poetry virtual environment
poetry build   # build the python package
```

## 🔍 Linting

From the _cli_ directory, run:

```bash
pylint src --rcfile=../.pylintrc
```

## 🔬 Type Checking

From the _cli_ directory, run:

```bash
pyright src
```

Pyright is configured in `pyproject.toml` under `[tool.pyright]`.
Pyright errors should be resolved before submitting a pull request.

## 🧪 Testing

Test files are placed in the _cli/tests_ directory and must follow the
_test_*.py_ naming convention.
To run all tests with coverage:

```bash
pytest --cov=src --cov-report=xml --cov-report=term-missing
```

### Caveat

Before running all tests, set the appropriate _path_ in _dtaas.toml_
and the same path in the `test_import_toml` function in _test_utils.py_.
The integration tests in _test_cli.py_ run CLI commands directly and will
fail if the DTaaS path is not set correctly.

## 🔒 Security Check

To scan for known security vulnerabilities in dependencies, use the `safety` tool.

```bash
safety scan --detailed-output # detailed security report
safety scan                   # summary security report
```

This command checks all installed packages against a database of
known vulnerabilities and provides detailed information about any
security issues found.

## 📤 Publishing

The CLI is published to [PyPI](https://pypi.org/).
Once new changes are merged into the DTaaS
repository, the CLI is published to the official DTaaS PyPI account.

To test changes as they would appear in a published package,
create a personal PyPI account, generate an
[API token](https://pypi.org/help/#apitoken), and publish using Poetry:

```bash
poetry publish
```

## 🗺️ Future Work

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
