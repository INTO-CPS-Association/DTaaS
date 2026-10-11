# 📚 Documentation Workflow

How to build, check and publish the project documentation.

The documentation is built with
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).
There are two MkDocs configuration files:

- **mkdocs.yml**: the main configuration, which also declares the PDF
  export plugin.
- **mkdocs-github.yml**: the same configuration without the PDF plugin,
  which builds on any platform.

Run all commands below from the repository root.

## 📦 Install Documentation Dependencies

Install the documentation dependencies in a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r script/docs/mkdocs-requirements.txt
# On Windows pdf converter is not available, use
pip install -r script/docs/mkdocs-requirements-github.txt
```

GitHub Actions installs the same packages from hash-locked files,
`script/docs/mkdocs-requirements.lock` and
`script/docs/mkdocs-requirements-github.lock`, which also pins `pytest`
from `script/docs/test-requirements.txt`. After changing a requirements
file, regenerate its lock on Linux with the `uv pip compile` command in
the lock's header, moving `--exclude-newer` to ten days before the
current date.

The documentation images and videos are stored in Git LFS. The
`script/docs/docs.py` commands below fetch them before building; if they
are missing, MkDocs aborts the build rather than copy pointer files into
`site/`.

## 🔍 Run Markdown Linting

Markdown linting keeps the formatting consistent.

```bash
npx markdownlint-cli docs/**/*.md
```

Fix any lint findings before committing documentation changes.

## 📊 Format Markdown Tables

Unevenly formatted tables can fail the quality gates. To format them, run:

```bash
python script/docs/format_tables.py
```

## 🏗️ Build and Preview Documentation

`script/docs/docs.py` builds and previews the documentation on Linux,
macOS and Windows:

```bash
# Preview with live reload
python script/docs/docs.py serve

# Build the HTML site into site/development
python script/docs/docs.py build

# Also build the PDF (Linux only)
python script/docs/docs.py build --pdf
```

Without `--pdf`, the commands use `mkdocs-github.yml`. With `--pdf`, they
use `mkdocs.yml`, whose PDF plugin needs the Pango libraries
(`libpango-1.0-0` and `libpangoft2-1.0-0` on Debian and Ubuntu).

## 🚀 Publish Documentation

The `Publish documentation` workflow
(`.github/workflows/docs-publish.yml`) publishes the site at
[https://into-cps-association.github.io/DTaaS/](https://into-cps-association.github.io/DTaaS/)
through GitHub Pages. No one publishes by hand.

- Every push to `feature/distributed-demo` that changes the documentation
  rebuilds the **development** version and its PDF, and deploys it.
- A release tag such as `v1.0` or `v0.9.0` also publishes
  **version1.0** or **version0.9**. The workflow commits that version and
  its PDF to the `webpage-docs` branch, which stores every released
  version, and deploys the site.

Before tagging a release, add its row to the table in
`docs/redirect-page.html`, which becomes the landing page. The workflow
refuses a release that the landing page does not list.

To publish a release tagged before the workflow existed, run the workflow
from the **Actions** tab on `feature/distributed-demo` and enter the tag.

The development version is deployed without being committed, and
`webpage-docs` must not route files through Git LFS: GitHub Pages serves
the pointer file instead of the image it names, and the workflow refuses
to publish either.

The workflow needs two repository settings:

- **Settings > Pages > Build and deployment > Source**: GitHub Actions.
- **Settings > Environments > github-pages > Deployment branches and
  tags**: `feature/distributed-demo` and the tag pattern `v*`.
