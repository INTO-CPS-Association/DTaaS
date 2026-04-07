"""Utility functions for DTaaS services CLI"""

from pathlib import Path
import sys
import os
import csv
import platform
from typing import Callable, Tuple
from .config import Config


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


def write_secret_file(path: Path, content: str, encoding: str = "utf-8") -> None:
    """Write *content* to *path* with mode 0o600 (owner read/write only).

    Creates parent directories as needed. Uses a temporary file and an
    atomic rename so the destination is never visible with world-readable
    permissions.

    Args:
        path: Destination file path.
        content: Text content to write.
        encoding: Text encoding (default UTF-8).

    Raises:
        OSError: If the write or rename fails.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(content, encoding=encoding)
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise
