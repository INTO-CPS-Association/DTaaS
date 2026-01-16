# Project Documentation

This file contains instructions for creation, compilation and publication of
project documentation.

The documentation system is based on
[Material for Mkdocs](https://squidfunk.github.io/mkdocs-material/).
The documentation is generated based on the configuration files:

* **mkdocs.yml**: used for generating online
  documentation which is hosted on the web
* **mkdocs-github.yml**: used for generating documentation in github actions

🗒️Execute the following commands from `DTaaS/docs` directory.

Install Mkdocs using the following command.

```bash
pip install -r script/docs/mkdocs-requirements.txt
```

## Fix Linting Errors

This project uses **markdownlint** linter tool for identifying the formatting
issues in markdown files. Run

```sh
mdl docs
```

from top-directory of the project and fix any identified issues. This needs
to be done before committing changes to the documentation.

## Format Tables

The column widths in markdown tables are supposed to be equal. If they are not,
`qlty` throws up errors. To format the tables correctly, run from top-directory
of the project

```sh
python script/docs/format_tables.py
```

## Create documentation

The `mkdocs` utility is used for converting the markdown documentation
placed in `docs/` directory into static html documentation.

You can add, and edit the markdown files in `docs/` directory to update
the documentation. The _mkdocs_ pip utility can be used to
(i) check the status of your documentation (ii) perform live preview of
ongoing documentation edits using hot reloading.

The command to run the utility on Windows OS is

```bash
mkdocs serve --config-file mkdocs-github.yml
```

The command to run the utility on Ubuntu OS is

```bash
mkdocs serve --config-file mkdocs.yml
```

Create and edit the documentation on your local machine and check the results
in the web browser.

## Prepare Documentation for Release

When preparing documentation for a release, you need to replace cloning
instructions with versioned download links. This ensures users of a specific
release version get the correct installation files.

First, update the configuration in `docs.ini`:

```ini
[docs.substitute]
VERSION=DTaaS-vX.Y.Z
URL=https://github.com/INTO-CPS-Association/DTaaS/releases/download/vX.Y.Z/DTaaS-vX.Y.Z.zip
FILES=docs/admin/localhost.md,
    docs/admin/localhost-secure.md,
    docs/admin/server.md,
    docs/admin/services.md,
    docs/admin/gitlab/index.md,
    docs/admin/guides/localhost_portainer.md
```

Then run the content replacement script:

```bash
pip install -r script/docs/requirements.txt
python script/docs/main.py
```

This script:

* Reads the markdown template from `docs/publish/clone.md` (cloning instructions)
* Reads the release template from `docs/publish/release.md` (download instructions)
* Substitutes `VERSION` and `URL` placeholders in the release template
* Replaces matching content in all files listed in `FILES`
* Uses markdown-aware parsing to avoid modifying code blocks

After running this script, review the changes and commit them before publishing
the documentation.

## Publish documentation

The mkdocs utility can generate both **html** and **pdf**
versions of documentation.

The generation of **pdf** version of documentation is controlled via
a shell variable.

```bash
export MKDOCS_ENABLE_PDF_EXPORT=0 #disables generation of pdf document
export MKDOCS_ENABLE_PDF_EXPORT=1 #enables generation of pdf document
```

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
