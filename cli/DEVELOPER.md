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
  the Package layer functions.

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

The base configuration file used by the CLI is
the _dtaas.toml_ file.

This is divided into 3 sections:

- The Global variables:

```toml
name = "Digital Twin as a Service (DTaaS)"
version = "0.2.2"
owner = "The INTO-CPS-Association"
git-repo = "https://github.com/into-cps-association/DTaaS.git"
```

These define the name, version, owner and git-repo of the DTaaS instance.
Currently, these aren't directly used in the CLI and serve the purpose
of documentation and reference.

- Common Instance Variables

```toml
[common]
# absolute path to the DTaaS application directory
# TODO : Update, we are now reusing hostname for this
server-dns = "intocps.org"
# Specify the directory of DTaaS installation
# Linux example
path = "/Users/username/DTaaS"
# Windows example
#path = "C:\\Users\\XXX\\DTaaS"
# Note: You have to either use / or \\ when specifying path, else you would get
# "Error while getting toml file: dtaas.toml, Invalid unicode value"
```

The _path_ variable is used globally by the CLI.
It is required while creating new workspace files,
to run bash commands and create new docker services.

The _server-dns_ variable is used to decide if
the DTaaS instance is a localhost instance or a server
deploy instance. In the case of server deploy,
it is used to define the routes of the server type
docker compose services appropriately.

- Tls

Set the tls flag to false to use the insecure user.server.yml, it is True by default
so the 'user.server.secure.yml' will be used

```toml
[common.security]
# Enable HTTPS/TLS for secure server deployment
tls = true
```

- Users variables

```toml
[users]
# matching user info must present in this config file
add = ["username1","username2", "username3"]
delete = ["username2", "username3"]

[users.username1]
email = "username1@gitlab.intocps.org"
```

This section firstly has two important lists, add and delete.
The new users to be created, or current users to be removed
from the instance using the CLI are fetched from here in the code.

Additionally, each unique _user_ identified by their _username_
has an _email_ variable, which should have the email of the user
as registered on the Gitlab instance. This is currently NOT IN USE.
It is aimed to be incorporated in future versions.

- Website Client variables

```toml
[client.web]
config = "/Users/username/DTaaS/env.local.js"
```

These variables are currently not in use, and will be incorporated
in future work.

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
