# 📚 Documentation Workflow

How to build, check and publish the project documentation.

The documentation is built with
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).
There are two MkDocs configuration files:

- **mkdocs.yml**: the main configuration, which also declares the PDF
  export plugin.
- **mkdocs-github.yml**: the configuration that GitHub Actions builds.

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

Fetch the documentation images and videos, which are stored in Git LFS,
before previewing or building the site:

```bash
git lfs install
git lfs pull --include="docs/**"
```

If the LFS files have not been fetched, MkDocs aborts the build rather than
copy pointer files into `site/`.

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

### Local Preview

```bash
# On Linux
mkdocs serve -f mkdocs.yml
# On Windows
mkdocs serve -f mkdocs-github.yml
```

### Static Build Validation

```bash
mkdocs build -f mkdocs-github.yml
```

To check the full configuration, including the optional PDF plugin, run:

```bash
# On Linux
export MKDOCS_ENABLE_PDF_EXPORT=0
mkdocs build -f mkdocs.yml

# On Windows
set MKDOCS_ENABLE_PDF_EXPORT=0
mkdocs build -f mkdocs-github.yml
```

## 🚀 Publish Documentation

MkDocs produces HTML and, when enabled, PDF output. PDF generation works
only on Linux.

The `MKDOCS_ENABLE_PDF_EXPORT` environment variable turns PDF generation
off (`0`) or on (`1`):

```bash
export MKDOCS_ENABLE_PDF_EXPORT=0
export MKDOCS_ENABLE_PDF_EXPORT=1
```

To publish the documentation to the `webpage-docs` branch:

```bash
export MKDOCS_ENABLE_PDF_EXPORT=1
script/docs.sh [version]
git push origin webpage-docs
```

GitHub Pages serves the published site at
[https://into-cps-association.github.io/DTaaS/](https://into-cps-association.github.io/DTaaS/).
