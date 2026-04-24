# Documentation Workflow

This file defines the process for building, validating, and publishing project
documentation.

The documentation stack is based on
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).
Two MkDocs configuration files are maintained:

- **mkdocs.yml**: primary project configuration.
- **mkdocs-github.yml**: CI-oriented configuration used by GitHub Actions.

All commands below are intended to be executed from the repository root.

## Install Documentation Dependencies

Install documentation dependencies in the project virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r script/docs/mkdocs-requirements.txt
# On Windows pdf converter is not available, use
pip install -r script/docs/mkdocs-requirements-github.txt
```

## Run Markdown Linting

The repository uses markdown linting to enforce formatting consistency.

```bash
npx markdownlint-cli docs/**/*.md
```

Any lint findings should be resolved prior to committing documentation changes.

## Format Markdown Tables

Uneven table formatting can cause quality gate failures. The table formatter can
be run as follows:

```bash
python script/docs/format_tables.py
```

## Build and Preview Documentation

### Local Preview

```bash
#On Linux
mkdocs serve -f mkdocs.yml
# On Windows
mkdocs serve -f mkdocs-github.yml
```

### Static Build Validation

```bash
mkdocs build -f mkdocs-github.yml
```

For full configuration validation (including optional PDF plugin wiring), run:

```bash
# Works only on Linux
export MKDOCS_ENABLE_PDF_EXPORT=0
mkdocs build -f mkdocs.yml
```

## Prepare Documentation for a Release

When a release is prepared, clone instructions should be replaced with
versioned download links for release artefacts.

Update `docs.ini` in the `docs.substitute` section, for example:

```ini
[docs.substitute]
VERSION=DTaaS-vX.Y.Z
URL=https://github.com/INTO-CPS-Association/DTaaS/releases/download/vX.Y.Z/DTaaS-vX.Y.Z.zip
FILES=docs/admin/dtaas/localhost/install.md,
    docs/admin/dtaas/secure-localhost-github/install.md,
    docs/admin/dtaas/server/install.md,
    docs/admin/services/cli.md,
    docs/admin/gitlab/index.md,
    docs/admin/guides/localhost_portainer.md
```

Run the substitution pipeline:

```bash
pip install -r script/docs/requirements.txt
python script/docs/main.py
```

The substitution script performs the following actions:

- Reads `docs/publish/clone.md` as the cloning-content template.
- Reads `docs/publish/release.md` as the release-content template.
- Replaces `VERSION` and `URL` placeholders.
- Applies replacements to files listed in `FILES`.
- Preserves fenced code blocks via markdown-aware parsing.

All resulting changes should be reviewed before publication.

## Publish Documentation

MkDocs can produce HTML and, where enabled, PDF output. The PDF output
generation is supported only on Linux.

PDF generation is controlled by the `MKDOCS_ENABLE_PDF_EXPORT` environment
variable:

```bash
export MKDOCS_ENABLE_PDF_EXPORT=0
export MKDOCS_ENABLE_PDF_EXPORT=1
```

To publish documentation content to the `webpage-docs` branch:

```bash
export MKDOCS_ENABLE_PDF_EXPORT=1
script\docs.sh [version]
git push webpage-docs
```

The published site is served via GitHub Pages at
[https://into-cps-association.github.io/DTaaS/](https://into-cps-association.github.io/DTaaS/).
