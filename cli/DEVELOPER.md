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
  it contains the handling functions for each CLI.
  These functions perform
  the actual operations that the CLI command
  is responsible for. It also
  has helper functions that can be used across the CLI.

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
pytest --cov
```

### Caveat

Before running all tests, remember to set the appropriate
_path_ in _dtaas.toml_. Also set this same path in the
dictionary in test_utils.py, in the test_import_toml
function.

This is to be done because the integration tests in test_cli.py
directly run cli commands for add, delete which will fail
if the DTaaS path directly isn't set correctly.

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