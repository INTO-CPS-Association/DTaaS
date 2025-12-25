"""Utility functions for DTaaS services CLI"""
from pathlib import Path
import sys
import os
import platform
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


def execute_docker_command(container_name: str,
    exec_cmd: list[str], verbose: bool = True) -> tuple[bool, str]:
    """
    Execute a command in a Docker container.

    Args:
        container_name: Name of the Docker container
        exec_cmd: Command to execute as a list of arguments
        verbose: Whether to print output
    Returns:
        Tuple of (success, output/error message)
    """
    try:
        docker = DockerClient()
        result = docker.execute(container_name, exec_cmd)
        if verbose:
            print("Output:", result)
        return True, result
    except DockerException as e:
        error_msg = f"Docker error: {str(e)}"
        if verbose:
            print(error_msg)
        return False, error_msg


def check_root_unix() -> None:
    """Check if script is run as root on Unix systems.

    Skips the root check in CI environments (GitHub Actions, GitLab CI, etc.)
    to allow tests to run without requiring elevated privileges.
    """
    # Skip root check in CI environments
    if os.getenv('CI') or os.getenv('GITHUB_ACTIONS') or os.getenv('GITLAB_CI'):
        return

    if platform.system().lower() not in ['linux', 'darwin']:
        return
    try:
        is_root = os.geteuid() == 0
    except AttributeError:
        is_root = False
    if not is_root:
        print(
            "This script must be run as root (Linux/MacOS). "
            "Try: sudo -E env PATH=\"$PATH\" dtaas-services setup"
        )
        sys.exit(1)

