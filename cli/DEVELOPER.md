# DTaaS Command Line Interface - Developer Notes

This document outlines the development progress, strategy
and methods to contribute for developers.
The source code for the CLI is present in _cli/src_ directory.

## Dependencies

The CLI is coded in python, and uses the following important modules:

- [Click](https://click.palletsprojects.com/en/8.1.x/) : Used for
  development of the CLI commands.

- [PyYaml](https://pyyaml.org/wiki/PyYAMLDocumentation) : Used for
  handling yaml files across CLI functions. Usage of this to read
  from and write to Yaml files has been wrapped by functions in the
  _cli/src/pkg/utils.py_ file. These functions should be used directly
  to handle Yaml files.

- [TomlKit](https://readthedocs.org/projects/tomlkit/) : Used for
  handling toml files across the CLI. Usage of reading toml files
  has been wrapped in a funciton in _cli/src/pkg/utils.py_ file.
  This function should be used directly to read toml files.

- [Poetry Package](https://python-poetry.org/docs/) to manage
  dependencies and build the CLI. The configuration file for this is
  _cli/pyproject.toml_. New source packages and dependencies need to be
  added here.

## Code Structure

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
version = "0.1.1"
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
server-dns = "foo.com"
# Specify the directory of DTaaS installation
# Linux example
path = "/home/Desktop/DTaaS"
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

- Users variables

```toml
[users]
# matching user info must present in this config file
add = ["username1","username2", "username3"]
delete = ["username2", "username3"]

[users.username1]
email = "username1@gitlab.foo.com"
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
config = "/home/Desktop/DTaaS/env.local.js"
```

These variables are currently not in use, and will be incorporated
in future work.

## Setup

```bash
pip install poetry               #Specifically install poetry to your system
poetry shell                     #Switch to the poetry virtual environment
cd cli                           #Switch to the cli directory
poetry install                   #Install all required python packages
```

## Development

.
Work on the development by making changes to _cli/src_.
To test these changes:

```bash
poetry shell   #Make sure you are in the poetry virtual environment
poetry build   #Build the python package
```

You can now run the dtaas cli commands.

## Linting checks

Make sure you are in the _cli_ directory.
To perform linting checks on the code:

```bash
pylint src --rcfile=../.pylintrc
```

## Testing

Write automation tests for the new code written in the
_cli/tests_ directory. Be sure to name any new files as
_test_*_.py_. To run all tests, with coverage:

```bash
pytest --cov=src --cov-report=xml --cov-report=term-missing
```

### Caveat

Before running all tests, remember to set the appropriate
_path_ in _dtaas.toml_. Also set this same path in the
dictionary in test_utils.py, in the test_import_toml
function.

This is to be done because the integration tests in test_cli.py
directly run cli commands for add, delete which will fail
if the DTaaS path directly isn't set correctly.

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
Once new changes to the CLI are merged to the DTaaS
repository, the CLI is also published to the official
DTaaS PyPI account.

Additionally, to test your changes as they would be
in a published package, you can create your own PyPI
account, create and add an [API token](https://pypi.org/help/#apitoken),
and publish your package to PyPI using poetry:

```bash
poetry publish
```

## Future work

The final aim for the CLI is to be the standard way that
admins setup, manage, and interact with the DTaaS instance.
Although the base structure for the CLI is set up and
the commands to manage users have been incorporated, we are
a long way from our final aim.

The following are the next steps for the CLI:

- Incorporating the AuthMS _conf_ file rules
  in the user management commands.

- [Bug fix] Currently users with usernames containing
  a '.' in it aren't handled well by the CLI and result in errors.
  This is because '.' is a special character for labels in docker compose.
  We need to include such usernames, simply by internally replacing
  '.' instances in usernames by '-' or '_'.
