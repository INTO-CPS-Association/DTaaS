"""This file has functions that handle the generate-project cli command"""

import shutil
from pathlib import Path

import click

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

TEMPLATE_FILES = [
    "dtaas.toml",
    "users.server.yml",
    "users.server.secure.yml",
]


def _copy_template(template_name, dest_dir, force=False):
    """Copy a template file to the destination directory.

    Returns True if the file was skipped (already exists and force is False).
    Raises OSError on copy failure.
    """
    dest = Path(dest_dir) / template_name
    if dest.exists() and not force:
        return True
    shutil.copy2(TEMPLATES_DIR / template_name, dest)
    return False


def _create_workspace_dirs(dest_dir):
    """Create the workspace directory structure needed by user add command.

    Raises OSError on failure.
    """
    files_template = Path(dest_dir) / "files" / "template"
    files_template.mkdir(parents=True, exist_ok=True)


def generate_project(dest_dir=".", force=False):
    """Copy project template files to the destination directory.

    Creates dtaas.toml, users.server.yml, and users.server.secure.yml,
    and initializes the workspace directory structure (files/template).
    Existing config files are skipped unless force is True.
    Raises RuntimeError if the templates directory is missing.
    Raises FileNotFoundError if dest_dir does not exist.
    Raises OSError (with all failures listed) if any template copy fails.

    Args:
        dest_dir: Destination directory path (default: current directory)
        force: Overwrite existing files if True (default: False)
    """
    if not TEMPLATES_DIR.is_dir():
        raise RuntimeError(
            f"Package data missing: templates directory not found at {TEMPLATES_DIR}. "
            "The package may have been installed incorrectly."
        )

    dest = Path(dest_dir)
    if not dest.is_dir():
        raise FileNotFoundError(f"Destination directory does not exist: {dest_dir}")

    errors = []
    for template_name in TEMPLATE_FILES:
        try:
            skipped = _copy_template(template_name, dest_dir, force)
            if skipped:
                click.echo(f"'{template_name}' already exists, skipping")
        except OSError as exc:
            errors.append(str(exc))

    if errors:
        raise OSError("\n".join(errors))

    _create_workspace_dirs(dest_dir)
