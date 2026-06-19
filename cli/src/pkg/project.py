"""This file has functions that handle the generate-project cli command"""

import shutil
import subprocess
from pathlib import Path

import click

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
DEPLOY_TEMPLATES_DIR = TEMPLATES_DIR / "deploy"

TEMPLATE_FILES = [
    "dtaas.toml",
    "users.server.yml",
    "users.server.secure.yml",
]

DEPLOY_TYPES = {
    "localhost",
    "insecure-server",
    "secure-server",
    "secure-server-gitlab",
    "workspace-localhost",
    "workspace-secure-server",
}


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


def _validate_project_inputs(dest_dir):
    """Raise if templates dir is missing; create dest_dir if needed."""
    if not TEMPLATES_DIR.is_dir():
        raise RuntimeError(
            f"Package data missing: templates directory not found at {TEMPLATES_DIR}. "
            "The package may have been installed incorrectly."
        )
    Path(dest_dir).mkdir(parents=True, exist_ok=True)


def _try_copy_template(template_name, dest_dir, force):
    """Copy one template, echoing if skipped. Returns error string or None."""
    try:
        if _copy_template(template_name, dest_dir, force):
            click.echo(f"'{template_name}' already exists, skipping")
    except OSError as exc:
        return str(exc)
    return None


def generate_project(dest_dir=".", force=False):
    """Copy project template files and initialize workspace structure."""
    _validate_project_inputs(dest_dir)
    errors = list(
        filter(None, (_try_copy_template(n, dest_dir, force) for n in TEMPLATE_FILES))
    )
    if errors:
        raise OSError("\n".join(errors))
    _create_workspace_dirs(dest_dir)


def _copy_file(item, target, force):
    """Copy item to target, returning an error string or None."""
    if target.exists() and not force:
        click.echo(f"'{target}' already exists, skipping")
        return None
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, target)
    except OSError as exc:
        return str(exc)
    return None


def _check_no_symlinks(src, entries):
    """Raise OSError if any entry in *entries* is a symlink.

    Symlinks are not permitted in template trees to prevent unintended
    path traversal during deployment generation.
    """
    symlinks = [str(e.relative_to(src)) for e in entries if e.is_symlink()]
    if symlinks:
        raise OSError(
            "Template contains symlinks, which are not permitted: "
            + ", ".join(symlinks)
        )


def _copy_tree(src_dir, dest_dir, force=False):
    """Recursively copy *src_dir* contents into *dest_dir*.

    Existing files are skipped unless *force* is True.
    Raises OSError if symlinks are found or any copy fails.
    """
    src, dest = Path(src_dir), Path(dest_dir)
    entries = sorted(src.rglob("*"))
    _check_no_symlinks(src, entries)
    errors = list(
        filter(
            None,
            (
                _copy_file(item, dest / item.relative_to(src), force)
                for item in entries
                if item.is_file()
            ),
        )
    )
    if errors:
        raise OSError("\n".join(errors))


def _validate_deploy_inputs(deploy_type, src, dest):
    """Validate inputs for generate_deploy_project.

    Raises ValueError if deploy_type is not recognised.
    Raises RuntimeError if the template directory is missing.
    Creates dest if it does not exist.
    """
    if deploy_type not in DEPLOY_TYPES:
        raise ValueError(
            f"Unknown deploy type '{deploy_type}'. "
            f"Choose from: {', '.join(sorted(DEPLOY_TYPES))}"
        )
    if not src.is_dir():
        raise RuntimeError(
            f"Template directory not found at {src}. "
            "The package may have been installed incorrectly."
        )
    dest.mkdir(parents=True, exist_ok=True)


def _copy_example(example, force):
    """Copy one *.example file to its non-example counterpart. Returns error or None."""
    target = example.with_suffix("")
    if not force and target.exists():
        return None
    try:
        shutil.copy2(example, target)
    except OSError as exc:
        return str(exc)
    return None


def _copy_example_files(dest_dir, force=False):
    """Copy *.example files to their non-example counterparts."""
    errors = list(
        filter(
            None,
            (
                _copy_example(ex, force)
                for ex in sorted(Path(dest_dir).rglob("*.example"))
            ),
        )
    )
    if errors:
        raise OSError("\n".join(errors))


def create_user_dirs(dest_dir, usernames):
    """Create files/<username>/ by copying files/template/ for each username.

    Skips silently when files/template/ does not exist (e.g. workspace deploy
    types) or when a user directory already exists.
    """
    template = Path(dest_dir) / "files" / "template"
    if not template.is_dir():
        return
    for username in usernames:
        user_dir = Path(dest_dir) / "files" / username
        if not user_dir.exists():
            shutil.copytree(template, user_dir)


def set_files_permissions(dest_dir):
    """Grant read/write/execute on files/."""
    files_dir = Path(dest_dir) / "files"
    if not files_dir.is_dir():
        return
    try:
        subprocess.run(
            ["sudo", "chmod", "-R", "u+rwX,go+rwX", str(files_dir)],
            check=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass


def generate_deploy_project(deploy_type, dest_dir=".", force=False):
    """Copy a deploy template directory tree to the destination."""
    src = DEPLOY_TEMPLATES_DIR / deploy_type
    dest = Path(dest_dir)
    _validate_deploy_inputs(deploy_type, src, dest)
    _copy_tree(src, dest, force)
    _copy_example_files(dest, force)
