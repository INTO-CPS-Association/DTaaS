"""clean_services, remove_services, directory removal, file cleanup, gitkeep removal"""

from typing import Tuple, Optional
from pathlib import Path
import shutil
from ..config import Config
from ..formatter import normalize_service_name
from .utils import (
    get_service_data_directories,
    get_certs_directory,
    get_data_subdirectories,
    try_remove_file,
    remove_all_files_in_directory,
    remove_gitkeep_files,
    check_compose_file,
)
from ..services.thingsboard.checker import check_postgres_dependency
from .utils import DOCKER_OPERATION_EXCEPTIONS
from .docker_executor import DockerExecutor, handle_docker_not_running


class Cleanup(DockerExecutor):
    """Mixin for service cleanup and removal operations."""

    def _remove_and_recreate_directory(self, path: Path) -> None:
        """Remove directory and recreate it empty."""
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
        path.mkdir(parents=True, exist_ok=True)

    def clean_data_directories(self, service_list: Optional[list] = None) -> None:
        """Clean and recreate data directories for services.

        Args:
            service_list: Optional list of specific services to clean
        """
        base_dir = Config.get_base_dir()
        data_dir = base_dir / "data"
        data_subdirs = get_data_subdirectories(service_list)
        for subdir in data_subdirs:
            self._remove_and_recreate_directory(data_dir / subdir)

    def remove_influx_config(self, service_list: Optional[list]) -> None:
        """Remove generated InfluxDB CLI config file if InfluxDB data was wiped.

        InfluxDB's Docker init script can fail with:
        "Error: config name 'default' already exists"
        if the CLI config file persists while the data directory has been wiped.

        The CLI config file is generated at config/influxdb/influx-configs and is safe
        to delete when resetting InfluxDB.
        """
        if service_list and "influxdb" not in service_list:
            return

        base_dir = Config.get_base_dir()
        influx_cfg = base_dir / "config" / "influxdb" / "influx-configs"
        if not influx_cfg.exists():
            return

        try_remove_file(influx_cfg)

    def _get_remove_message(self, remove_volumes: bool) -> str:
        """Get message for remove_services based on whether volumes were removed."""
        if remove_volumes:
            return " Services and volumes removed successfully"
        return " Services removed successfully"

    def _check_remove_prerequisites(
        self, service_list: Optional[list]
    ) -> Tuple[Optional[Exception], Optional[str]]:
        """Check prerequisites for removal (compose file exists and postgres dependency)."""
        err, exists = check_compose_file(self.compose_file)
        if not exists:
            return err, str(err)
        err, msg = check_postgres_dependency(self, service_list)
        if err:
            return err, msg
        return None, None

    @handle_docker_not_running
    def remove_services(
        self, service_list: Optional[list] = None, remove_volumes: bool = False
    ) -> Tuple[Optional[Exception], str]:
        """
        Remove platform services and optionally their data.
        When remove_volumes is True, all data directories are deleted and recreated empty.
        This ensures a completely fresh start on next service startup.
        Args:
            service_list: Optional list of specific services to remove
            remove_volumes: Whether to remove data directories as well

        Returns:
            Tuple of (Exception or None, message)
        """
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        err, msg = self._check_remove_prerequisites(service_list)
        if err:
            return err, msg or str(err)

        try:
            self.remove_docker_services(service_list, remove_volumes)
            return None, self._get_remove_message(remove_volumes)
        except DOCKER_OPERATION_EXCEPTIONS as e:
            return self.handle_docker_error("remove services", e)

    def _get_directories_to_clean(
        self, service_list: Optional[list], include_certs: bool
    ) -> list:
        """
        Determine which directories need to be cleaned.

        Args:
            service_list: Optional list of specific services to clean
            include_certs: Whether to include certificate directories

        Returns:
            List of Path objects to clean
        """
        directories = get_service_data_directories(service_list)

        # Optionally add certificate directory
        if include_certs:
            certs_dir = get_certs_directory()
            if certs_dir:
                directories.append(certs_dir)

        return directories

    def _perform_cleanup(self, directories: list, service_list: Optional[list]) -> None:
        """
        Perform the actual cleanup of directories and configuration.

        Args:
            directories: List of directories to remove files from
            service_list: Optional list of services being cleaned
        """
        base_dir = Config.get_base_dir()

        for directory in directories:
            remove_all_files_in_directory(directory)

        # If we wiped InfluxDB data, also remove the generated CLI config file
        self.remove_influx_config(service_list)

        # Remove .gitkeep files from all base managed directories
        for base_dir_name in ["data", "log", "certs", "config"]:
            dir_path = base_dir / base_dir_name
            if dir_path.exists():
                remove_gitkeep_files(dir_path)

    def _build_cleanup_message(
        self, service_list: Optional[list], include_certs: bool
    ) -> str:
        """
        Build the success message for cleanup operation.

        Args:
            service_list: Optional list of services that were cleaned
            include_certs: Whether certificates were included in cleanup

        Returns:
            Success message string
        """
        certs_note = " (including certificates)" if include_certs else ""
        if service_list:
            return f"Cleaned data for services: {', '.join(service_list)}{certs_note}"
        return f"Cleaned all service data{certs_note}"

    def _validate_clean_directories(
        self, directories: list, service_list: Optional[list]
    ) -> Tuple[Optional[Exception], Optional[str]]:
        """Validate that directories exist for cleanup."""
        if not directories:
            if service_list:
                msg = (
                    f"No data directories found for services: {', '.join(service_list)}"
                )
            else:
                msg = "No data directories found"
            return None, msg
        return None, None

    def clean_services(
        self, service_list: Optional[list] = None, include_certs: bool = False
    ) -> Tuple[Optional[Exception], str]:
        """
        Clean service data directories.

        By default, this removes all files from data and log directories for the specified
        services (including .gitkeep files) and removes .gitkeep files from config
        subdirectories.

        Certificates under certs/ are NOT deleted unless include_certs=True.

        Args:
            service_list: Optional list of specific services to clean
            include_certs: Whether to also remove copied TLS cert files under certs/

        Returns:
            Tuple of (Exception or None, message)
        """
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        try:
            directories = self._get_directories_to_clean(service_list, include_certs)
            err, msg = self._validate_clean_directories(directories, service_list)
            if err or msg:
                return err, msg or ""

            self._perform_cleanup(directories, service_list)
            message = self._build_cleanup_message(service_list, include_certs)
            return None, message
        except OSError as e:
            err = RuntimeError(f"Failed to clean service data: {str(e)}")
            return err, str(err)
