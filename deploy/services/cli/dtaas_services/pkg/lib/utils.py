"""Shared utilities and helper functions for file and directory manipulation."""

import subprocess
import os
from pathlib import Path
from typing import Optional, Tuple
import click
from ..config import Config


DOCKER_OPERATION_EXCEPTIONS = (
    subprocess.CalledProcessError,
    OSError,
    KeyError,
    ValueError,
    TypeError,
)


def try_remove_file(path: Path) -> None:
    """Try to remove a file with permission handling."""
    try:
        path.chmod(0o777)
    except OSError:
        # Ignore errors when changing permissions
        pass
    try:
        path.unlink()
    except OSError:
        # Ignore errors when deleting file
        pass


def _remove_directory_item(item: Path) -> None:
    """Remove a single file or directory item.

    Args:
        item: File or directory to remove
    """
    if item.is_file():
        try_remove_file(item)
    elif item.is_dir():
        remove_all_files_in_directory(item)
        try:
            item.rmdir()
        except OSError:
            pass


def _process_directory_contents(directory: Path) -> None:
    """Process all items in a directory.

    Args:
        directory: Directory to process
    """
    try:
        for item in directory.iterdir():
            _remove_directory_item(item)
    except OSError as e:
        click.echo(f"Warning: Error accessing directory {directory}: {e}", err=True)


def remove_all_files_in_directory(directory: Path) -> None:
    """Recursively remove all files and subdirectories in a directory.

    Removes all files at all levels including .gitkeep files in nested subdirectories.
    """
    if not directory.exists():
        return

    _process_directory_contents(directory)


def _is_gitkeep_file(item: Path) -> bool:
    """Check if item is a .gitkeep file.

    Args:
        item: Path to check

    Returns:
        True if item is a .gitkeep file
    """
    return item.is_file() and item.name == ".gitkeep"


def _process_gitkeep_item(item: Path) -> None:
    """Process a single item for gitkeep removal.

    Args:
        item: File or directory to process
    """
    if _is_gitkeep_file(item):
        try_remove_file(item)
    elif item.is_dir():
        remove_gitkeep_files(item)


def _process_gitkeep_directory(directory: Path) -> None:
    """Process all items in a directory for gitkeep removal.

    Args:
        directory: Directory to process
    """
    try:
        for item in directory.iterdir():
            _process_gitkeep_item(item)
    except OSError as e:
        click.echo(f"Warning: Error accessing directory {directory}: {e}", err=True)


def remove_gitkeep_files(directory: Path) -> None:
    """Recursively remove all .gitkeep files in a directory and subdirectories.

    Keeps all other files intact. Useful for cleaning placeholder files
    while preserving actual configuration and data.
    """
    if not directory.exists():
        return

    _process_gitkeep_directory(directory)


def check_compose_file(compose_file: Path) -> Tuple[Optional[Exception], bool]:
    """Check if compose file exists.
    Args:
        compose_file: Path to the compose file to check
    Returns:
        Tuple of (Exception or None, exists)
    """
    if not compose_file.exists():
        err = FileNotFoundError(f"Docker Compose file not found: {compose_file}")
        return err, False
    return None, True


def get_root_data_directories() -> list:
    """
    Get root data and log directories.

    Returns:
        List of Path objects for root data/log directories that exist
    """
    base_dir = Config.get_base_dir()
    directories = []
    for dir_name in ["data", "log"]:
        dir_path = base_dir / dir_name
        if dir_path.exists():
            directories.append(dir_path)
    return directories


def get_service_directory_name(service: str) -> str:
    """Map service name to directory name."""
    return "thingsboard" if service == "thingsboard-ce" else service


def add_service_directories(base_dir: Path, service: str, directories: list) -> None:
    """Add data and log directories for a service if they exist."""
    dir_name = get_service_directory_name(service)
    for subdir_type in ["data", "log"]:
        dir_path = base_dir / subdir_type / dir_name
        if dir_path.exists():
            directories.append(dir_path)


def get_service_subdirectories(service_list: list) -> list:
    """
    Get data and log subdirectories for specific services.

    Args:
        service_list: Non-empty list of services to get directories for

    Returns:
        List of Path objects for service subdirectories that exist
    """
    base_dir = Config.get_base_dir()
    directories = []
    for service in service_list:
        add_service_directories(base_dir, service, directories)
    return directories


def get_service_data_directories(service_list: Optional[list]) -> list:
    """
    Get data and log directories for services.

    Args:
        service_list: Optional list of specific services. If None, returns root data/log dirs.

    Returns:
        List of Path objects for service data directories
    """
    if not service_list:
        return get_root_data_directories()
    return get_service_subdirectories(service_list)


def get_certs_directory() -> Optional[Path]:
    """
    Get the certificate directory path for the current hostname.

    Returns:
        Path to certs directory if it exists, None otherwise
    """
    base_dir = Config.get_base_dir()
    host_name = os.environ.get("HOSTNAME")
    certs_host_dir = (
        (base_dir / "certs" / host_name) if host_name else (base_dir / "certs")
    )
    if certs_host_dir.exists():
        return certs_host_dir
    return None


def get_data_subdirectories(service_list: Optional[list] = None) -> list:
    """Get list of data subdirectories to clean."""
    if service_list:
        return service_list
    return ["grafana", "influxdb", "mongodb", "postgres", "rabbitmq", "thingsboard"]
