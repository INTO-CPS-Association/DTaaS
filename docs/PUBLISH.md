# Project Documentation

This file contains instructions for creation, compilation and publication of
project documentation.

The documentation system is based on
[Material for Mkdocs](https://squidfunk.github.io/mkdocs-material/).
The documentation is generated based on the configuration files:

* **mkdocs.yml**: used for generating online
  documentation which is hosted on the web
* **mkdocs-github.yml**: used for generating documentation in github actions

Install Mkdocs using the following command.

```bash
pip install -r docs/requirements.txt
```

## Fix Linting Errors

This project uses **markdownlint** linter tool for identifying the formatting
issues in markdown files. Run

```sh
mdl docs
```

from top-directory of the project and fix any identified issues. This needs
to be done before committing changes to the documentation.

## Create documentation

The document generation pipeline can generate both **html** and **pdf**
versions of documentation.

The generation of **pdf** version of documentation is controlled via
a shell variable.

```bash
export MKDOCS_ENABLE_PDF_EXPORT=0 #disables generation of pdf document
export MKDOCS_ENABLE_PDF_EXPORT=1 #enables generation of pdf document
```

The `mkdocs` utility allows for live editing of documentation
on the developer computer.

You can add, and edit the markdown files in `docs/` directory to update
the documentation. There is a facility to check the status of your
documentation by using:

```bash
mkdocs serve --config-file mkdocs.yml
```

## Publish documentation

You can compile and place the html version of documentation on
the `webpage-docs` branch of the codebase.

```bash
export MKDOCS_ENABLE_PDF_EXPORT=1 #enable generation of pdf document
source script/docs.sh [version]
```

The command takes an optional version parameter. This version parameter is needed
for making a release. Otherwise, the documentation gets published with
the latest version tag. This command makes a new commit on `webpage-docs` branch.
You need to push the branch to upstream.

```bash
git push webpage-docs
```

The github pages system serves the
[project documentation](https://into-cps-association.github.io/DTaaS/) from
this branch.
