"""Host directories the containers bind-mount, prepared before they start.

The workspaces and the logger run as uid 1000, and Docker creates a missing
bind-mount directory as root, so 'deployment generate' and 'platform
install' create these directories and hand them over first. Changing the
owner needs sudo and is best-effort: when it fails, a warning names the
commands to run by hand, and the command carries on. Unlike the rest of
src/pkg, these helpers therefore warn instead of raising.
"""

import os
import shlex
import shutil
import subprocess
from pathlib import Path
import click
from .messages import echo_hint
from .constants import DEPLOY_TYPES, WORKSPACE_DEPLOY_TYPES

IS_POSIX = os.name == "posix"
LOGGER_LOGS_DIR = Path("logs") / "logger"
LOGGER_DEPLOY_TYPES = DEPLOY_TYPES - WORKSPACE_DEPLOY_TYPES
LOGGER_OWNER = "1000:1000"
WORKSPACE_OWNER = "1000:100"


def create_user_dirs(dest_dir, usernames):
    """Create files/<username>/ dirs from files/template/."""
    template = Path(dest_dir) / "files" / "template"
    if not template.is_dir():
        return
    for username in usernames:
        user_dir = Path(dest_dir) / "files" / username
        if not user_dir.exists():
            shutil.copytree(template, user_dir)


def _chown(owner, path):
    """The chown -R command giving *path* to *owner*."""
    return ["chown", "-R", owner, "--", str(path)]


def _sudo(commands):
    """Run each command under sudo; False when sudo is missing or one fails."""
    try:
        for command in commands:
            subprocess.run(["sudo", *command], check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False
    return True


def _warn_with_commands(problem, commands):
    """Warn about *problem*, naming the sudo commands that fix it by hand."""
    manual = " && ".join(shlex.join(["sudo", *command]) for command in commands)
    echo_hint(f"Warning: {problem}", f"Run: {manual}")


def _set_owner(name, owner, commands):
    """Run *commands* under sudo, warning when they do not all succeed."""
    click.echo(
        f"Setting the owner of {name} to {owner} with sudo "
        "(it may ask for your password)"
    )
    if not _sudo(commands):
        _warn_with_commands(f"could not set the owner of {name}", commands)


def set_files_permissions(dest_dir):
    """Set ownership/permissions on files/ dir (requires sudo, POSIX only)."""
    files_dir = Path(dest_dir).resolve() / "files"
    if not IS_POSIX or not files_dir.is_dir():
        return
    _set_owner(
        "files/",
        WORKSPACE_OWNER,
        [
            _chown(WORKSPACE_OWNER, files_dir),
            ["chmod", "-R", "u+rwX,go+rwX", "--", str(files_dir)],
        ],
    )


def _warn_not_created(logs_dir, exc):
    """Warn that logs/logger could not be created; on POSIX, name the sudo fix."""
    if not IS_POSIX:
        echo_hint("Warning: could not create logs/logger/", str(exc))
        return
    manual = [["mkdir", "-p", "--", str(logs_dir)], _chown(LOGGER_OWNER, logs_dir)]
    _warn_with_commands("could not create logs/logger/", manual)


def _create_logs_dir(logs_dir):
    """Create logs/logger as the invoking user; False, after a warning, if not.

    mkdir and chown -R both follow a symlinked logs/, so a symlink in either
    place is refused rather than followed.
    """
    if logs_dir.parent.is_symlink() or logs_dir.is_symlink():
        echo_hint(
            "Warning: logs/ or logs/logger/ is a symlink",
            f"Not changing its owner. Make {logs_dir} a directory "
            f"owned by {LOGGER_OWNER}.",
        )
        return False
    try:
        logs_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        _warn_not_created(logs_dir, exc)
        return False
    return True


def _owner_of(path):
    """The uid:gid of *path* itself, not of a symlink's target."""
    stat = path.lstat()
    return f"{stat.st_uid}:{stat.st_gid}"


def _already_owned(directory, owner):
    """True when *directory* and its direct entries all belong to *owner*."""
    try:
        paths = [directory, *directory.iterdir()]
        return all(_owner_of(path) == owner for path in paths)
    except OSError:
        return False


def set_logs_permissions(dest_dir, deploy_type):
    """Create logs/logger and give it to the logger's uid 1000 (sudo, POSIX only).

    Only logs/logger changes owner: secure-server-gitlab also mounts logs/
    into GitLab, whose own directories there must stay GitLab's. No sudo
    runs when logs/logger already belongs to the logger, as it does when
    the invoking user is uid 1000.
    """
    if deploy_type not in LOGGER_DEPLOY_TYPES:
        return
    logs_dir = Path(dest_dir).resolve() / LOGGER_LOGS_DIR
    if not _create_logs_dir(logs_dir) or not IS_POSIX:
        return
    if not _already_owned(logs_dir, LOGGER_OWNER):
        _set_owner("logs/logger/", LOGGER_OWNER, [_chown(LOGGER_OWNER, logs_dir)])
