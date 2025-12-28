"""DTaaS platform services setup module"""
import os
import shutil
import subprocess
from typing import Tuple, Optional
from pathlib import Path
from python_on_whales import DockerClient
from .config import Config


class Service:
    """
    Docker Compose service management utility for DTaaS platform services.

    This class handles starting, stopping, restarting, and checking the status
    of platform services using Docker Compose.
    """

    def __init__(self) -> None:
        """
        Initialize service setup.
        """
        base_dir = Config.get_base_dir()
        compose_file = base_dir / "compose.services.secure.yml"
        # If compose file not in base_dir, look in package location
        if not compose_file.exists():
            package_dir = Path(__file__).parent.parent
            compose_file = package_dir / "compose.services.secure.yml"
        self.compose_file = compose_file
        # Load environment variables from config and set them in os.environ
        config = Config()
        for key, value in config.env.items():
            if value is not None:
                os.environ[key] = str(value)
        self.docker = DockerClient(compose_files=[self.compose_file])

    def _check_compose_file(self) -> Tuple[Optional[Exception], bool]:
        """Check if compose file exists.
        Returns:
            Tuple of (Exception or None, exists)
        """
        if not self.compose_file.exists():
            err = FileNotFoundError(
                f"Docker Compose file not found: {self.compose_file}"
            )
            return err, False
        return None, True

    def _handle_docker_error(self, operation: str, exc: Exception) -> Tuple[Optional[Exception], str]:
        """Handle Docker operation errors consistently.
        Args:
            operation: Name of the operation that failed
            exc: The exception that was raised
        Returns:
            Tuple of (Exception, error message)
        """
        # Map specific exceptions to more meaningful messages
        if isinstance(exc, (subprocess.CalledProcessError, OSError)):
            return exc, f"Failed to {operation}: {str(exc)}"
        if isinstance(exc, (KeyError, ValueError, TypeError)):
            return exc, f"Invalid configuration for {operation}: {str(exc)}"
        # For other exceptions, include type information
        return exc, f"Failed to {operation} - {type(exc).__name__}: {str(exc)}"

    def start_services(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Start the platform services using docker compose.
        Args:
            service_list: Optional list of specific services to start

        Returns:
            Tuple of (Exception or None, message)
        """
        err, exists = self._check_compose_file()
        if not exists:
            return err, str(err)
        try:
            if service_list:
                self.docker.compose.up(service_list, detach=True)
            else:
                self.docker.compose.up(detach=True)
            return None, "Docker Compose started successfully"
        except (subprocess.CalledProcessError, OSError, KeyError, ValueError, TypeError) as e:
            return self._handle_docker_error("start Docker Compose", e)


    def stop_services(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Stop platform services using Docker Compose.
        Args:
            service_list: Optional list of specific services to stop

        Returns:
            Tuple of (Exception or None, message)
        """
        err, exists = self._check_compose_file()
        if not exists:
            return err, str(err)
        try:
            if service_list:
                self.docker.compose.stop(service_list)
            else:
                self.docker.compose.down()
            return None, "Services stopped successfully"
        except (subprocess.CalledProcessError, OSError, KeyError, ValueError, TypeError) as e:
            return self._handle_docker_error("stop services", e)


    def restart_services(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Restart platform services using Docker Compose.
        Args:
            service_list: Optional list of specific services to restart

        Returns:
            Tuple of (Exception or None, message)
        """
        err, exists = self._check_compose_file()
        if not exists:
            return err, str(err)
        try:
            if service_list:
                self.docker.compose.restart(service_list)
            else:
                self.docker.compose.restart()
            return None, "Services restarted successfully"
        except (subprocess.CalledProcessError, OSError, KeyError, ValueError, TypeError) as e:
            return self._handle_docker_error("restart services", e)


    def get_status(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], list]:
        """
        Get status of platform services.
        Args:
            service_list: Optional list of specific services to check

        Returns:
            Tuple of (Exception or None, list of Container objects)
        """
        err, exists = self._check_compose_file()
        if not exists:
            return err, []
        try:
            if service_list:
                result = self.docker.compose.ps(service_list, all=True)
            else:
                result = self.docker.compose.ps(all=True)
            return None, result
        except (subprocess.CalledProcessError, OSError, KeyError, ValueError, TypeError) as e:
            err_exc, _ = self._handle_docker_error("get service status", e)
            return err_exc, []


    def remove_services(
        self, service_list: Optional[list] = None,
        remove_volumes: bool = False
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
        err, exists = self._check_compose_file()
        if not exists:
            return err, str(err)
        try:
            if service_list:
                # Remove specific services
                self.docker.compose.rm(service_list, stop=True, volumes=remove_volumes)
            else:
                # Remove all services using down
                self.docker.compose.down(volumes=remove_volumes)

            # If volumes were requested to be removed, delete and recreate data directories
            if remove_volumes:
                base_dir = Config.get_base_dir()
                data_dir = base_dir / "data"

                # Determine which subdirectories to clean based on service_list
                if service_list:
                    # Only clean data for specified services
                    data_subdirs = service_list
                else:
                    # Clean all data directories
                    data_subdirs = [
                        'grafana', 'influxdb', 'mongodb',
                        'rabbitmq']

                for subdir in data_subdirs:
                    subdir_path = data_dir / subdir
                    # Remove the directory and all its contents
                    if subdir_path.exists():
                        shutil.rmtree(subdir_path, ignore_errors=True)
                    # Recreate empty directory
                    subdir_path.mkdir(parents=True, exist_ok=True)
                return None, "Services and data removed successfully"

            return None, "Services removed successfully"
        except (subprocess.CalledProcessError, OSError, KeyError, ValueError, TypeError) as e:
            return self._handle_docker_error("remove services", e)
