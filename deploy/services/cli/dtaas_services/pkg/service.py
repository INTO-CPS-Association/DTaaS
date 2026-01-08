"""DTaaS platform services setup module"""

import os
import shutil
import subprocess
from typing import Tuple, Optional, Set
from pathlib import Path
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException
from .config import Config
from .formatter import RemovedService

DOCKER_OPERATION_EXCEPTIONS = (
    subprocess.CalledProcessError,
    OSError, KeyError,
    ValueError, TypeError,)

class Service:
    """
    Docker Compose service management utility for DTaaS platform services.

    This class handles starting, stopping, restarting, and checking the status
    of platform services using Docker Compose.
    """

    def _resolve_compose_file(self) -> Path:
        """Resolve compose file path with fallback to package location."""
        base_dir = Config.get_base_dir()
        compose_file = base_dir / "compose.services.secure.yml"
        if not compose_file.exists():
            package_dir = Path(__file__).parent.parent
            compose_file = package_dir / "compose.services.secure.yml"
        return compose_file


    def _setup_environment_variables(self) -> None:
        """Load environment variables from config and set them in os.environ."""
        config = Config()
        for key, value in config.env.items():
            if value is not None:
                os.environ[key] = str(value)


    def _setup_project_name(self) -> None:
        """Set explicit project name from hostname for docker compose."""
        hostname = os.environ.get("HOSTNAME")
        if not hostname:
            raise RuntimeError("HOSTNAME environment variable must be set in services.env")
        project_name = hostname.lower().replace(".", "-").replace("_", "-")
        os.environ["COMPOSE_PROJECT_NAME"] = project_name


    def __init__(self) -> None:
        """
        Initialize service setup.
        """
        self.compose_file = self._resolve_compose_file()
        self._setup_environment_variables()
        self._setup_project_name()
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


    def _handle_docker_error(
        self, operation: str, exc: Exception
    ) -> Tuple[Optional[Exception], str]:
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


    def _start_services(self, service_list: Optional[list]) -> None:
        """Start services or all if service_list is None."""
        if service_list:
            self.docker.compose.up(service_list, detach=True)
        else:
            self.docker.compose.up(detach=True)


    def _stop_services(self, service_list: Optional[list]) -> None:
        """Stop services or all if service_list is None."""
        if service_list:
            self.docker.compose.stop(service_list)
        else:
            self.docker.compose.stop()


    def _restart_services(self, service_list: Optional[list]) -> None:
        """Restart services or all if service_list is None."""
        if service_list:
            self.docker.compose.restart(service_list)
        else:
            self.docker.compose.restart()


    def _execute_compose_action(
        self, action: str, service_list: Optional[list]
    ) -> None:
        """Execute a compose action with appropriate arguments.
        Args:
            action: The action name ('start', 'stop', 'restart')
            service_list: Optional list of services to target
        """
        action_handlers = {
            "start": self._start_services,
            "stop": self._stop_services,
            "restart": self._restart_services,
        }
        if action not in action_handlers:
            raise ValueError(f"Invalid action: {action}")
        action_handlers[action](service_list)


    def _get_success_message(self, action: str) -> str:
        """Get success message for an action."""
        messages = {
            "start": "Docker Compose started successfully",
            "stop": "Services stopped successfully",
            "restart": "Services restarted successfully",
        }
        return messages.get(action, "Operation completed successfully")


    def _handle_service_action_error(self, action: str, exc: Exception) -> Tuple[Optional[Exception], str]:
        """Handle errors from service action execution."""
        if isinstance(exc, ValueError):
            return exc, str(exc)
        return self._handle_docker_error(f"{action} services", exc)


    def manage_services(
        self, action: str, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Manage platform services using Docker Compose.
        Args:
            action: Action to perform ('start', 'stop', 'restart')
            service_list: Optional list of specific services to manage

        Returns:
            Tuple of (Exception or None, message)
        """
        err, exists = self._check_compose_file()
        if not exists:
            return err, str(err)
        try:
            self._execute_compose_action(action, service_list)
            return None, self._get_success_message(action)
        except (ValueError, *DOCKER_OPERATION_EXCEPTIONS) as e:
            return self._handle_service_action_error(action, e)


    def _get_all_service_names(self) -> Tuple[Optional[Exception], Set[str]]:
        """
        Get all service names defined in the compose file.

        Returns:
            Tuple of (Exception or None, set of service names)
        """
        try:
            services = self.docker.compose.config().services
            if services:
                return None, set(services.keys())
            return None, set()
        except DOCKER_OPERATION_EXCEPTIONS as e:
            err_exc, _ = self._handle_docker_error("get service names", e)
            return err_exc, set()


    def _filter_containers_by_service(self, all_containers, all_services: set) -> dict:
        """Filter containers to only include those matching service names."""
        return {
            container.name: container
            for container in all_containers
            if container.name in all_services
        }


    def _get_all_containers(self) -> Tuple[Optional[Exception], dict]:
        """
        Get all containers belonging to this compose project and create a mapping by name.
        Returns:
            Tuple of (Exception or None, dict mapping container name to container object)
        """
        try:
            all_containers = self.docker.container.list(all=True)
            err, all_services = self._get_all_service_names()
            if err is not None:
                return err, {}
            container_map = self._filter_containers_by_service(all_containers, all_services)
            return None, container_map
        except DockerException:
            err = RuntimeError(
                "Docker is not running. Please start Docker Desktop and try again."
            )
            return err, {}
        except DOCKER_OPERATION_EXCEPTIONS as e:
            err_exc, _ = self._handle_docker_error("get containers", e)
            return err_exc, {}


    def _get_services_to_check(self, all_services: set,
                               service_list: Optional[list] = None) -> set:
        """Determine which services to check based on filter."""
        if service_list:
            return set(service_list) & all_services
        return all_services


    def _build_status_result(
        self, all_services: set, container_map: dict, service_list: Optional[list] = None
    ) -> list:
        """
        Build the status result list for services.
        Args:
            all_services: Set of all service names from compose file
            container_map: Dict mapping container names to container objects
            service_list: Optional list of specific services to check
        Returns:
            List of container objects and RemovedService objects
        """
        services_to_check = self._get_services_to_check(all_services, service_list)
        return [
            container_map.get(service_name) or RemovedService(service_name)
            for service_name in services_to_check]


    def _fetch_status_data(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], list]:
        """Fetch service names and container data for status.
        Returns:
            Tuple of (Exception or None, result list)
        """
        err, all_services = self._get_all_service_names()
        if err:
            return err, []
        err, container_map = self._get_all_containers()
        if err:
            return err, []
        result = self._build_status_result(all_services, container_map, service_list)
        return None, result


    def get_status(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], list]:
        """
        Get status of platform services.
        Args:
            service_list: Optional list of specific services to check

        Returns:
            Tuple of (Exception or None,
                list of Container objects and RemovedService objects)
        """
        err, exists = self._check_compose_file()
        if not exists:
            return err, []
        try:
            return self._fetch_status_data(service_list)
        except DOCKER_OPERATION_EXCEPTIONS as e:
            err_exc, _ = self._handle_docker_error("get service status", e)
            return err_exc, []


    def _get_data_subdirectories(self, service_list: Optional[list] = None) -> list:
        """Get list of data subdirectories to clean."""
        if service_list:
            return service_list
        return ["grafana", "influxdb", "mongodb", "rabbitmq"]


    def _remove_and_recreate_directory(self, path: Path) -> None:
        """Remove directory and recreate it empty."""
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
        path.mkdir(parents=True, exist_ok=True)


    def _clean_data_directories(self, service_list: Optional[list] = None) -> None:
        """Clean and recreate data directories for services.
        Args:
            service_list: Optional list of specific services to clean
        """
        base_dir = Config.get_base_dir()
        data_dir = base_dir / "data"
        data_subdirs = self._get_data_subdirectories(service_list)
        for subdir in data_subdirs:
            self._remove_and_recreate_directory(data_dir / subdir)


    def _remove_docker_services(self, service_list: Optional[list] = None,
                                remove_volumes: bool = False) -> None:
        """Execute docker compose remove/down command."""
        if service_list:
            self.docker.compose.rm(service_list, stop=True, volumes=remove_volumes)
        else:
            self.docker.compose.down(volumes=remove_volumes)


    def _get_remove_message(self, remove_volumes: bool) -> str:
        """Get success message for remove operation."""
        if remove_volumes:
            return "Services and data removed successfully"
        return "Services removed successfully"


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
        err, exists = self._check_compose_file()
        if not exists:
            return err, str(err)

        try:
            self._remove_docker_services(service_list, remove_volumes)
            if remove_volumes:
                self._clean_data_directories(service_list)
            return None, self._get_remove_message(remove_volumes)
        except DOCKER_OPERATION_EXCEPTIONS as e:
            return self._handle_docker_error("remove services", e)
