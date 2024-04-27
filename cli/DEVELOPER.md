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

- Package layer: This is the _cli/src/pkg_ directory. It contains the
  singleton Config class, which is used throughout the CLI. Additionally,
  it contains the handling functions for each CLI. These functions perform
  the actual operations that the CLI command is responsible for. It also
  has helper functions that can be used across the CLI.

## Setup

Switch to the cli directory:

```bash
cd cli
```

Install all required python packages:

```bash
pip install -r requirements.txt
```

## Development

Work on the development by making changes to _cli/src_.
To test these changes:

- Install relevant dependencies

```bash
poetry install
```

- Build the python package

```bash
poetry build
```

## Linting checks

To perform linting checks on the code:

```bash
pylint cli/src
```

## Testing

Write automation tests for the new code written in the
_cli/tests_ directory. Be sure to name any new files as
_test_*_.py_. To run all tests, with coverage:

```bash
pytest --cov
```

## Publishing

The CLI is published to [PyPI](https://pypi.org/).
Once new changes to the CLI are merged to the DTaaS
repository, the CLI is also published to the official
DTaaS PyPI account. 

Additionally, to test your changes as they would be
in a published package, you can create your own PyPI
account, create and add an [API token](https://pypi.org/help/#apitoken), and publish your package to PyPI using poetry:

```bash
poetry publish
```