
# Project Documentation

This file contains instructions for creation, compilation and publication of project documentation.

The documentation system is based on [Material for Mkdocs](https://squidfunk.github.io/mkdocs-material/). The documentation is generated based on the configuration files:

* **mkdocs.yml**: used for generating online documentation which is hosted on the web
* **mkdocs_offline.yml**: used for generating offline documentation that can be downloaded and used on user computer.

Install Mkdocs using the following command.

```bash
pip install -r docs/requirements.txt
```

## Create documentation

You can add, and edit the markdown files in `docs/` directory to update the documentation. There is a facility to check the status of your documentation by using:

```bash
mkdocs serve --config-file mkdocs.yml
```

## Publish documentation

You can compile and place the html version of documentation on the `webpage-docs` branch of the codebase.

```bash
source script/docs.sh [version]
```

The command takes an optional version parameter. This version parameter is needed for making a release. Otherwise, the documentation gets published with the latest version tag. This command makes a new commit on `webpage-docs` branch. You need to push the branch to upstream.

```bash
manual step: git push -f prasad-public
```

The github pages system serves the [project documentation](https://into-cps-association.github.io/DTaaS/) from this branch.
