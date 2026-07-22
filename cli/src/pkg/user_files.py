"""Local file cleanup for 'dtaas admin uninstall --remove-user-files'.

Split out of deploy.py (which drives docker compose) because this concern is
pure local filesystem work: deleting the generated per-user workspace
directories and the CLI-owned registry/state files, while keeping the
deployment-provided scaffolding so a later install can repopulate user dirs.
"""

import shutil
from pathlib import Path
from .constants import REGISTRY_FILE, STATE_FILE

USER_FILES_DIR = "files"
# files/ entries provided by the deployment template (shared workspace and the
# per-user skeleton), as opposed to generated per-user directories. These are
# kept by --remove-user-files so a later install can repopulate user dirs.
SCAFFOLDING_ENTRIES = frozenset({"common", "template"})


def _check_within_base(files_dir, base):
    """Reject a symlinked or escaping per-user files directory."""
    if files_dir.is_symlink() or not files_dir.resolve().is_relative_to(base):
        raise OSError(
            f"Refusing to delete '{USER_FILES_DIR}': it is a symlink or "
            "resolves outside the installation directory."
        )


def _user_files_dir(directory):
    """Return the per-user files directory inside *directory*, or None if absent.

    Raises OSError if the directory would escape the installation directory.
    """
    base = Path(directory).resolve()
    files_dir = base / USER_FILES_DIR
    if not files_dir.exists():
        return None
    _check_within_base(files_dir, base)
    return files_dir


def _is_generated_user_dir(child):
    """True if *child* is a generated per-user directory safe to delete.

    Excludes the 'common' and 'template' scaffolding, any non-directory entry,
    and symlinks (which could point outside the installation).
    """
    if child.name in SCAFFOLDING_ENTRIES:
        return False
    return child.is_dir() and not child.is_symlink()


def _remove_user_dirs(files_dir):
    """Delete generated per-user directories, keeping template scaffolding.

    Returns the names removed. The shared 'common' workspace and the per-user
    'template' skeleton are preserved so a subsequent install can recreate the
    user directories from them.
    """
    removed = []
    for child in files_dir.iterdir():
        if not _is_generated_user_dir(child):
            continue
        shutil.rmtree(child)
        removed.append(child.name)
    return removed


def _remove_registry_files(directory):
    """Delete the CLI-owned user registry and runtime state cache, if present.

    Returns the names removed. Part of --remove-user-files: those two files are
    additional-user data, so wiping user data drops them too. A plain uninstall
    keeps them, so a later reinstall restores the same additional users.
    """
    removed = []
    for name in (REGISTRY_FILE, STATE_FILE):
        path = Path(directory) / name
        if path.is_file():
            path.unlink()
            removed.append(name)
    return removed


def delete_user_files(directory):
    """Delete per-user workspace directories plus the registry/state files.

    The deployment-provided scaffolding (files/common and files/template) is
    kept so 'dtaas admin install' can repopulate the per-user directories, but
    dtaas.users.registry.json and .dtaas.state.json are removed so a reinstall
    starts from a clean additional-user list. Returns a status message.
    """
    files_dir = _user_files_dir(directory)
    removed = _remove_user_dirs(files_dir) if files_dir is not None else []
    parts = []
    if removed:
        parts.append(f"user files at '{files_dir}'")
    parts.extend(f"'{name}'" for name in _remove_registry_files(directory))
    if not parts:
        return f"No '{USER_FILES_DIR}' directory or registry files found; nothing to remove."
    return f"Removed {', '.join(parts)}."
