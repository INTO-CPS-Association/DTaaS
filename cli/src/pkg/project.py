"""This file has functions that handle the generate-project cli command"""

import shutil
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

TEMPLATE_FILES = [
    "dtaas.toml",
    "users.server.yml",
    "users.server.secure.yml",
]


def _copy_template(template_name, dest_dir):
    """Copy a template file to the destination directory.

    Skips the file with a message if it already exists.

    Returns:
        None on success or if skipped, Exception on copy failure
    """
    dest = Path(dest_dir) / template_name
    if dest.exists():
        print(f"'{template_name}' already exists, skipping")
        return None
    try:
        shutil.copy2(str(TEMPLATES_DIR / template_name), str(dest))
    except Exception as e:  # pylint: disable=broad-except
        return Exception(f"Failed to copy {template_name}: {e}")
    return None


def _create_workspace_dirs(dest_dir):
    """Create the workspace directory structure needed by user add command.

    Returns:
        None on success, Exception on failure
    """
    try:
        files_template = Path(dest_dir) / "files" / "template"
        files_template.mkdir(parents=True, exist_ok=True)
    except Exception as e:  # pylint: disable=broad-except
        return Exception(f"Failed to create workspace directories: {e}")
    return None


def generate_project(dest_dir="."):
    """Copy project template files to the destination directory.

    Creates dtaas.toml, users.server.yml, and users.server.secure.yml,
    and initializes the workspace directory structure (files/template).
    Existing config files are skipped with a message.

    Args:
        dest_dir: Destination directory path (default: current directory)

    Returns:
        None on success, Exception on first failure
    """
    for template_name in TEMPLATE_FILES:
        err = _copy_template(template_name, dest_dir)
        if err is not None:
            return err

    err = _create_workspace_dirs(dest_dir)
    if err is not None:
        return err
    return None
