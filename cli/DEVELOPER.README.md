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

## Poetry

We use [Poetry Package](https://python-poetry.org/docs/) to manage dependencies and build the CLI. The configuration file for this is
_cli/pyproject.toml_. New source packages and dependencies need to be
added here.

## Usage

To test new changes, or the existing working CLI:

- Install relevant dependencies

```bash
poetry install
```

- Build the python package

```bash
poetry build
```