"""Host directories the containers bind-mount, prepared before they start.

The workspaces and the logger run as uid 1000, and Docker creates a missing
bind-mount directory as root, so 'deployment generate' and 'platform
install' create these directories and hand them over first. Changing the
owner needs sudo and is best-effort: when it fails, a warning names the
commands to run by hand, and the command carries on.
"""

import os
import shlex
import shutil
import subprocess
from pathlib import Path
from .messages import echo_hint

IS_POSIX = os.name == "posix"
LOGGER_LOGS_DIR = Path("logs") / "logger"
LOGGER_DEPLOY_TYPES = {
    "localhost",
    "insecure-server",
    "secure-server",
    "secure-server-gitlab",
}


def create_user_dirs(dest_dir, usernames):
    """Create files/<username>/ dirs from files/template/."""
    template = Path(dest_dir) / "files" / "template"
    if not template.is_dir():
        return
    for username in usernames:
        user_dir = Path(dest_dir) / "files" / username
        if not user_dir.exists():
            shutil.copytree(template, user_dir)


def _sudo(commands):
    """Run each command under sudo; False when sudo is missing or one fails."""
    try:
        for command in commands:
            subprocess.run(["sudo", *command], check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False
    return True


def _warn_not_owned(name, commands):
    """Warn that *name* kept its owner, naming the commands to run by hand."""
    manual = " && ".join(shlex.join(["sudo", *command]) for command in commands)
    echo_hint(f"Warning: could not set the owner of {name}", f"Run: {manual}")


def _set_owner(name, commands):
    """Run *commands* under sudo, warning when they do not all succeed."""
    if not _sudo(commands):
        _warn_not_owned(name, commands)


def set_files_permissions(dest_dir):
    """Set ownership/permissions on files/ dir (requires sudo, POSIX only)."""
    files_dir = Path(dest_dir) / "files"
    if not IS_POSIX or not files_dir.is_dir():
        return
    _set_owner(
        "files/",
        [
            ["chown", "-R", "1000:100", str(files_dir)],
            ["chmod", "-R", "u+rwX,go+rwX", str(files_dir)],
        ],
    )


def set_logs_permissions(dest_dir, deploy_type):
    """Create logs/logger and give it to the logger's uid 1000 (sudo, POSIX only).

    Only logs/logger changes owner: secure-server-gitlab also mounts logs/
    into GitLab, whose own directories there must stay GitLab's.
    """
    if deploy_type not in LOGGER_DEPLOY_TYPES:
        return
    logs_dir = Path(dest_dir) / LOGGER_LOGS_DIR
    commands = [
        ["mkdir", "-p", str(logs_dir)],
        ["chown", "-R", "1000:1000", str(logs_dir)],
    ]
    try:
        logs_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        _warn_not_owned("logs/logger/", commands)
        return
    if IS_POSIX:
        _set_owner("logs/logger/", commands[1:])
