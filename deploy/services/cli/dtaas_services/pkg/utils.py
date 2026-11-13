"""Utility functions for DTaaS services CLI"""

from contextlib import contextmanager
from pathlib import Path
import sys
import os
import csv
import platform
import shlex
import tempfile
from typing import Callable, Iterator, Tuple
from .config import Config

# Why a file or folder under config/ is probably root's.
_ROOT_CAUSE = (
    "'dtaas-services service install' runs as root, and so does any command "
    "run with sudo."
)


def get_credentials_path() -> Path:
    """
    Get the path to credentials.csv file.

    Returns:
        Path to credentials.csv file
    """
    base_dir = Config.get_base_dir()
    return base_dir / "config" / "credentials.csv"


def is_container_running(container) -> bool:
    """Check if a container has a running state."""
    return hasattr(container, "state") and container.state.status == "running"


def has_running_container(containers: list) -> bool:
    """Check if any container in a list is running."""
    return any(is_container_running(container) for container in containers)


def get_container_health_status(container) -> str:
    """Get a container health status when Docker exposes one."""
    try:
        if hasattr(container.state, "health") and container.state.health:
            return container.state.health.status
    except (AttributeError, TypeError):
        return "unknown state"
    return "unknown state"


def _is_running_unix_system() -> bool:
    """Check if running on Unix system (Linux or macOS)."""
    return platform.system().lower() in ["linux", "darwin"]


def _is_current_user_root() -> bool:
    """Check if current user is root."""
    try:
        return os.geteuid() == 0  # type: ignore[attr-defined]
    except AttributeError:
        return False


def _should_skip_root_check() -> bool:
    """Check if root check should be skipped (CI environment)."""
    return bool(
        os.getenv("CI") or os.getenv("GITHUB_ACTIONS") or os.getenv("GITLAB_CI")
    )


def check_root_unix() -> None:
    """Check if script is run as root on Unix systems.

    Skips the root check in CI environments (GitHub Actions, GitLab CI, etc.)
    to allow tests to run without requiring elevated privileges.
    """
    # Skip root check in CI environments
    if _should_skip_root_check():
        return

    if not _is_running_unix_system():
        return

    if not _is_current_user_root():
        print(
            "This script must be run as root (Linux/MacOS). "
            'Try: sudo -E env PATH="$PATH" dtaas-services <command>'
        )
        sys.exit(1)


def is_ci() -> bool:
    """Check if running in CI environment.
    Returns:
        True if CI environment variables are set
    """
    return _should_skip_root_check()


def process_credentials_file(
    process_func: Callable, service_name: str, success_msg: str
) -> Tuple[bool, str]:
    """
    Common pattern for processing credentials file for a service.

    Args:
        process_func: Function to call with opened credentials file
        service_name: Name of the service (for error messages)
        success_msg: Success message to return

    Returns:
        Tuple of (success, message)
    """
    credentials_file = get_credentials_path()
    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        with credentials_file.open(
            mode="r", newline="", encoding="utf-8"
        ) as creds_file:
            success, error_msg = process_func(creds_file)
            return (True, success_msg) if success else (False, error_msg)
    except (OSError, ValueError, KeyError) as e:
        return False, f"Error adding {service_name} users: {e}"


def create_users_from_credentials(
    credentials_file, user_creation_func: Callable[[str, str], Tuple[bool, str]]
) -> Tuple[bool, str]:
    """
    Generic function to create users from a credentials CSV file.

    Args:
        credentials_file: Opened CSV file with username,password columns
        user_creation_func: Function(username, password) -> (success, error_msg)

    Returns:
        Tuple of (success, error message if any)
    """
    credentials = csv.DictReader(credentials_file, delimiter=",")
    for credential in credentials:
        username = credential["username"]
        password = credential["password"]
        success, error_msg = user_creation_func(username, password)
        if not success:
            return False, error_msg
    return True, ""


def _replace_through_temp_file(path: Path, content: str, encoding: str) -> None:
    """Write *content* to a new temporary file next to *path*, made 0o600
    from the start by tempfile.mkstemp, then rename it over *path*. The
    temporary file is removed on any failure, an interruption included."""
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding=encoding) as handle:
            handle.write(content)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def write_secret_file(path: Path, content: str, encoding: str = "utf-8") -> None:
    """Write *content* to *path* with mode 0o600 (owner read/write only).

    Creates parent directories as needed. Neither *path* nor its temporary
    file is ever readable by others, and each temporary file has a new name,
    so one left behind by a killed run never gets in the way.

    Raises:
        OSError: If the write or rename fails. On Linux and macOS a denied
            access is a PermissionError that names the folder and the fix:
            the rename needs the folder writable, whoever owns the file it
            replaces.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with explain_permission_error(path):
        _replace_through_temp_file(path, content, encoding)


def _hints_apply() -> bool:
    """True where a file under config/ can be root's: on Linux and macOS,
    where 'service install' must run as root. Windows has no root."""
    return os.name == "posix"


def permission_hint(*paths: str | os.PathLike) -> str:
    """Say why *paths* cannot be opened and the one chown that fixes them.

    'service install' must run as root, and so does a command run with sudo,
    so the files they write under config/ belong to root, and a later
    command run as the admin cannot open them.
    """
    names = ", ".join(str(path) for path in paths)
    owner = "It probably belongs" if len(paths) == 1 else "They probably belong"
    quoted = " ".join(shlex.quote(str(path)) for path in paths)
    return (
        f"Permission denied: {names}. {owner} to root: {_ROOT_CAUSE} "
        f'Run: sudo chown "$USER": {quoted}'
    )


def folder_permission_hint(folder: str | os.PathLike) -> str:
    """Say why no file can be created in *folder* and how to fix it: a
    chown of the folder alone, so the files in it keep their owners."""
    return (
        f"Permission denied: files cannot be created in {folder}. It probably "
        f"belongs to root: {_ROOT_CAUSE} "
        f'Run: sudo chown "$USER": {shlex.quote(str(folder))}'
    )


def _could_not_create(exc: PermissionError, files: tuple[Path, ...]) -> bool:
    """True when *exc* names a file that does not exist (a lock file not
    made yet) or one other than *files* (a temporary file next to them):
    that file could not be created, so the folder is at fault."""
    if exc.filename is None:
        return False
    named = Path(exc.filename)
    ours = {file.resolve() for file in files}
    return not os.path.exists(named) or named.resolve() not in ours


def _hint_for(exc: PermissionError, path: Path, related: tuple[Path, ...]) -> str:
    """The fix for *exc*, met while using *path*: a chown of the folder when
    a file could not be created in it, else one chown of *path* and of
    *related*, those that exist (*path* alone when none does)."""
    files = (path, *related)
    if _could_not_create(exc, files):
        return folder_permission_hint(path.parent)
    existing = [file for file in files if os.path.exists(file)]
    return permission_hint(*(existing or [path]))


@contextmanager
def explain_permission_error(path: Path, *related: Path) -> Iterator[None]:
    """Raise a PermissionError met inside the block again with the fix as
    its message, so every caller that prints the error tells the admin what
    to do (see _hint_for). *related* are files changed with *path*, such as
    its lock file, so one chown fixes them all. On Windows, which has no
    root, the error passes unchanged."""
    try:
        yield
    except PermissionError as exc:
        if not _hints_apply():
            raise
        raise PermissionError(_hint_for(exc, path, related)) from exc
