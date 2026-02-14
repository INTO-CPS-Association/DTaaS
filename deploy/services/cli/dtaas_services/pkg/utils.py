"""Utility functions for DTaaS services CLI"""

from pathlib import Path
import sys
import os
import csv
import platform
from typing import Callable, Tuple
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException
from .config import Config


def get_credentials_path() -> Path:
    """
    Get the path to credentials.csv file.

    Returns:
        Path to credentials.csv file
    """
    base_dir = Config.get_base_dir()
    return base_dir / "config" / "credentials.csv"


def _get_stderr_content(error_str: str) -> str:
    """Extract stderr content from Docker error string.

    Args:
        error_str: Full error string from DockerException

    Returns:
        Stderr content or empty string if not found
    """
    if "stderr is '" not in error_str:
        return ""
    parts = error_str.split("stderr is '", 1)
    if len(parts) <= 1:
        return ""
    return parts[1].split("'")[0]


def _process_stderr_lines(stderr_content: str) -> str:
    """Process stderr content to extract meaningful error message.

    Args:
        stderr_content: Raw stderr content

    Returns:
        Processed error message
    """
    lines = [
        line.strip() for line in stderr_content.strip().split("\n") if line.strip()
    ]
    if not lines:
        return "Unknown error"
    if len(lines) > 1 and lines[0] == "Error:":
        return ": ".join(lines[:2])
    return lines[0]


def _extract_stderr_line(error_str: str) -> str:
    """Extract just the stderr line from Docker error for cleaner display.
    Args:
        error_str: Full error string from DockerException
    Returns:
        Clean error message (stderr line or first line if not found)
    """
    stderr_content = _get_stderr_content(error_str)
    if stderr_content:
        return _process_stderr_lines(stderr_content)
    return error_str.split("\n")[0]


def _format_docker_error(container: str, error_str: str) -> str:
    if "No such container" in error_str:
        return (
            f"Container '{container}' is not running. "
            f"Please start services first with: dtaas-services start"
        )
    clean_error = _extract_stderr_line(error_str)
    return f"Docker error: {clean_error}"


def execute_docker_command(
    container_name: str, exec_cmd: list[str], verbose: bool = True
) -> tuple[bool, str]:
    """
    Execute a command in a Docker container.

    Args:
        container_name: Name of the Docker container
        exec_cmd: Command to execute as a list of arguments
        verbose: Whether to print output
    Returns:
        Tuple of (success, output/error message)
    """
    docker = DockerClient()
    try:
        result = docker.execute(container_name, exec_cmd)
    except DockerException as e:
        error_str = str(e)
        error_msg = _format_docker_error(container_name, error_str)
        if verbose:
            print(error_msg)
        return False, error_msg
    if verbose:
        print("Output:", result)
    return True, result


def _is_running_unix_system() -> bool:
    """Check if running on Unix system (Linux or macOS)."""
    return platform.system().lower() in ["linux", "darwin"]


def _is_current_user_root() -> bool:
    """Check if current user is root."""
    try:
        return os.geteuid() == 0
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
