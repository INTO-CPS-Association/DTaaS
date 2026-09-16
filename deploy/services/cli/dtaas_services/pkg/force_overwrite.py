"""Overwrite policy for 'project generate --force'.

Holds what a forced run may replace, what it must never replace, and the
copying that keeps the destination's own permissions.
"""

import os
import shutil
import stat
from pathlib import Path

# Items that --force may overwrite.
OVERWRITABLE_ITEMS = {
    "config",
    "compose.services.yml",
    "compose.thingsboard.yml",
    "compose.gitlab.yml",
}

# File names that --force never overwrites, wherever they sit under config/.
# They hold live credentials (services.env and the other generated files) or
# service configuration an operator may have hardened locally. The rule is
# enforced here, not left to the package happening to ship other names.
PROTECTED_CONFIG_NAMES = {
    "services.env",
    "credentials.csv",
    "gitlab_oauth.json",
    "gitlab_tokens.json",
    "gitlab_user_tokens.json",
    "current.passwords.env",
    "mongod.conf.secure",
    "rabbitmq.conf",
    "rabbitmq.enabled_plugins",
}

FORCE_REVIEW_HINT = (
    "\nOverwritten files were refreshed from the package. Review them before "
    "starting services, and re-run 'dtaas-services host setup' if certificate "
    "or service file permissions were affected."
)

PROTECTED_KEPT_NOTE = (
    "\nProtected files were left untouched. To adopt the packaged version of "
    "one, copy it aside, delete it and run the command again."
)


class ProtectedFilter:  # pylint: disable=too-few-public-methods
    """copytree ignore callable keeping protected files and recording them."""

    def __init__(self, src_root: Path, item_name: str) -> None:
        self.src_root = src_root
        self.item_name = item_name
        self.kept: list[str] = []

    def _display_path(self, directory: str, name: str) -> str:
        """Build the destination path of a kept file for display.

        os.path.relpath is used rather than Path.relative_to: it never raises,
        so a package root spelled differently cannot turn a kept file into a
        traceback.
        """
        relative = os.path.relpath(directory, self.src_root)
        return str(Path(self.item_name) / relative / name).replace("\\", "/")

    def __call__(self, directory: str, names: list[str]) -> set[str]:
        protected = {name for name in names if name in PROTECTED_CONFIG_NAMES}
        self.kept.extend(
            self._display_path(directory, name) for name in sorted(protected)
        )
        return protected


def _copy_preserving_mode(src: str, dst: str) -> None:
    """Copy src onto dst, keeping the permissions dst already had.

    Overwriting truncates the existing file, so its owner is kept; only the
    mode would otherwise be replaced by the one packaged in the wheel.
    """
    destination = Path(dst)
    existing = destination.stat().st_mode if destination.exists() else None
    shutil.copy2(src, dst)
    if existing is not None:
        os.chmod(dst, stat.S_IMODE(existing))


def _existing_directory_modes(root: Path) -> dict[Path, int]:
    """Map the destination directory and its subdirectories to their modes."""
    if not root.is_dir():
        return {}
    directories = [root] + [path for path in root.rglob("*") if path.is_dir()]
    return {path: stat.S_IMODE(path.stat().st_mode) for path in directories}


def _restore_directory_modes(modes: dict[Path, int]) -> None:
    """Re-apply directory modes that copytree replaced with the package ones.

    copytree copies directory metadata itself, once per level, without going
    through copy_function, so a locally tightened config/ would otherwise be
    widened to the mode shipped in the wheel.
    """
    for path, mode in modes.items():
        os.chmod(path, mode)


def overwrite_directory_or_file(
    src_path: Path, dest_path: Path, item_name: str
) -> list[str]:
    """
    Copy a package directory or file over an existing destination.
    Protected config files, and files that exist only in the destination,
    are kept.
    Returns:
        Status messages, one per overwritten item and per protected file
    """
    if not src_path.is_dir():
        _copy_preserving_mode(str(src_path), str(dest_path))
        return [f"  Overwrote {item_name}"]
    protected = ProtectedFilter(src_path, item_name)
    directory_modes = _existing_directory_modes(dest_path)
    shutil.copytree(
        src_path,
        dest_path,
        dirs_exist_ok=True,
        ignore=protected,
        copy_function=_copy_preserving_mode,
    )
    _restore_directory_modes(directory_modes)
    messages = [f"  Overwrote {item_name}/"]
    messages.extend(f"  Kept {kept} (protected)" for kept in protected.kept)
    return messages


def force_notes(messages: list) -> list:
    """Return the notes that follow a forced overwrite."""
    notes = []
    if any(msg.startswith("  Overwrote") for msg in messages):
        notes.append(FORCE_REVIEW_HINT)
    if any(msg.startswith("  Kept") for msg in messages):
        notes.append(PROTECTED_KEPT_NOTE)
    return notes
