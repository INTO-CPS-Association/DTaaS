"""DTaaS platform services setup module"""

import os
import shutil
import click
import subprocess
from functools import wraps
from typing import Tuple, Optional, Set
from pathlib import Path
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException
from .config import Config
from .formatter import RemovedServiceEntry, normalize_service_name

DOCKER_OPERATION_EXCEPTIONS = (
    subprocess.CalledProcessError,
    OSError,
    KeyError,
    ValueError,
    TypeError,
)


def _handle_docker_not_running(func):
    """Decorator to catch DockerException and return error response.

    Returns (error, message) when Docker is not running.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except DockerException as e:
            error_msg = str(e).lower()
            # Check if it's actually a service not found error
            if "no such service" in error_msg:
                err = ValueError(f"Service not found: {str(e)}")
                return err, str(e)
            # Check if it's a Docker daemon connection issue
            if (
                "cannot connect" in error_msg
                or "connection refused" in error_msg
                or "daemon" in error_msg
                or "not running" in error_msg
                or (
                    "returned with code" in error_msg
                    and "no such service" not in error_msg
                )
            ):
                err = RuntimeError(
                    "Docker is not running. Please start Docker Desktop and try again."
                )
                return err, str(err)
            # For other Docker exceptions, return the actual error
            err = RuntimeError(f"Docker error: {str(e)}")
            return err, str(e)

    return wrapper


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

    def _resolve_thingsboard_compose_file(self) -> Path:
        """Resolve ThingsBoard compose file path with fallback to package location."""
        base_dir = Config.get_base_dir()
        compose_file = base_dir / "compose.thingsboard.secure.yml"
        if not compose_file.exists():
            package_dir = Path(__file__).parent.parent
            compose_file = package_dir / "compose.thingsboard.secure.yml"
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
            raise RuntimeError(
                "HOSTNAME environment variable must be set in services.env"
            )
        project_name = hostname.lower().replace(".", "-").replace("_", "-")
        os.environ["COMPOSE_PROJECT_NAME"] = project_name

    def __init__(self) -> None:
        """
        Initialize service setup.
        """
        self.compose_file = self._resolve_compose_file()
        self.thingsboard_compose_file = self._resolve_thingsboard_compose_file()
        self._setup_environment_variables()
        self._setup_project_name()

        # Use both compose files
        compose_files = [self.compose_file]
        if self.thingsboard_compose_file.exists():
            compose_files.append(self.thingsboard_compose_file)

        self.docker = DockerClient(compose_files=compose_files)

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

    def _get_running_services(self) -> Set[str]:
        """Get set of currently running service names.

        Returns:
            Set of service names that are currently running
        """
        try:
            err, container_map = self._get_all_containers()
            if err:
                return set()

            running_services = set()
            for service_name, container in container_map.items():
                if hasattr(container, "state") and container.state.status == "running":
                    running_services.add(service_name)
            return running_services
        except Exception:
            return set()

    def _start_services(self, service_list: Optional[list]) -> Tuple[list, list]:
        """Start services or all if service_list is None.

        Returns:
            Tuple of (list of skipped services, list of started services)
        """
        # Get currently running services
        running_services = self._get_running_services()

        # Determine which services to start
        if service_list is not None:
            # Filter out already running services
            services_to_start = [s for s in service_list if s not in running_services]
            skipped_services = [s for s in service_list if s in running_services]

            if services_to_start:
                self.docker.compose.up(services_to_start, detach=True)

            return skipped_services, services_to_start
        else:
            # Starting all services
            err, all_services = self._get_all_service_names()
            if err:
                self.docker.compose.up(detach=True)
                return [], []

            services_to_start = [s for s in all_services if s not in running_services]
            skipped_services = list(running_services & all_services)

            if services_to_start:
                self.docker.compose.up(services_to_start, detach=True)

            return skipped_services, services_to_start

    def _stop_services(self, service_list: Optional[list]) -> None:
        """Stop services or all if service_list is None."""
        if service_list is not None:
            self.docker.compose.stop(service_list)
        else:
            self.docker.compose.stop()

    def _restart_services(self, service_list: Optional[list]) -> None:
        """Restart services or all if service_list is None."""
        if service_list is not None:
            self.docker.compose.restart(service_list)
        else:
            self.docker.compose.restart()

    def _execute_compose_action(
        self, action: str, service_list: Optional[list]
    ) -> Tuple[list, list]:
        """Execute a compose action with appropriate arguments.
        Args:
            action: The action name ('start', 'stop', 'restart')
            service_list: Optional list of services to target

        Returns:
            Tuple of (list of skipped services, list of affected services)
            Only applicable for 'start' action, returns ([], []) for others
        """
        action_handlers = {
            "start": self._start_services,
            "stop": self._stop_services,
            "restart": self._restart_services,
        }
        if action not in action_handlers:
            raise ValueError(f"Invalid action: {action}")

        result = action_handlers[action](service_list)

        # _start_services returns (skipped, started), others return None
        if action == "start" and result is not None:
            return result
        return [], []

    def _get_success_message(
        self, action: str, skipped: list = None, affected: list = None
    ) -> str:
        """Get success message for an action.

        Args:
            action: The action performed
            skipped: List of services that were skipped (for start action)
            affected: List of services that were affected
        """
        if action == "start":
            parts = []
            if skipped:
                parts.append(
                    f"Skipped {len(skipped)} already running service(s): "
                    f"{', '.join(skipped)}"
                )
            if affected:
                parts.append(
                    f"Started {len(affected)} service(s): {', '.join(affected)}"
                )
            elif not skipped:
                parts.append("No services to start")

            if not parts:
                return "All services are already running"
            return "\n".join(parts)

        messages = {
            "stop": "Services stopped successfully",
            "restart": "Services restarted successfully",
        }
        return messages.get(action, "Operation completed successfully")

    def _handle_service_action_error(
        self, action: str, exc: Exception
    ) -> Tuple[Optional[Exception], str]:
        """Handle errors from service action execution."""
        if isinstance(exc, ValueError):
            return exc, str(exc)
        return self._handle_docker_error(f"{action} services", exc)

    def _check_postgres_stop_dependency(
        self, service_list: Optional[list]
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if postgres stop should be blocked due to thingsboard.
        Returns (should_warn, warning_message).
        """
        if not service_list:
            # Stopping all services, check if thingsboard container exists
            if self._is_thingsboard_container_present():
                return True, (
                    " Skipping PostgreSQL stop: ThingsBoard container is still present. "
                    "Remove ThingsBoard first with: dtaas-services remove -s thingsboard"
                )
            return False, None

        if "postgres" not in service_list:
            return False, None

        if self._is_thingsboard_container_present():
            return True, (
                "  Skipping PostgreSQL stop: ThingsBoard container is still present. "
                "Remove ThingsBoard first with: dtaas-services remove -s thingsboard"
            )

        return False, None

    def _filter_postgres_if_needed(
        self, action: str, service_list: Optional[list]
    ) -> Tuple[Optional[list], Optional[str]]:
        """
        Filter out postgres from service list if thingsboard is installed and action is stop.
        Returns (filtered_service_list, warning_message).
        """
        if action != "stop":
            return service_list, None

        should_warn, warning = self._check_postgres_stop_dependency(service_list)
        if not should_warn:
            return service_list, None

        # Filter out postgres
        if service_list is None:
            # Get all services except postgres
            err, all_services = self._get_all_service_names()
            if err:
                return service_list, warning
            filtered = [s for s in all_services if s != "postgres"]
            return filtered, warning

        # Remove postgres from the list
        filtered = [s for s in service_list if s != "postgres"]
        return filtered, warning

    @_handle_docker_not_running
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

        # Normalize service names if provided
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        # Filter postgres if needed for stop operation
        service_list, warning = self._filter_postgres_if_needed(action, service_list)

        try:
            skipped, affected = self._execute_compose_action(action, service_list)
            success_msg = self._get_success_message(action, skipped, affected)
            if warning:
                success_msg = f"{warning}\n{success_msg}"
            return None, success_msg
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

    def _match_container_by_name(
        self, container: object, container_map: dict, all_services: set
    ) -> bool:
        """Try to match container by name. Returns True if matched."""
        if container.name in all_services:
            container_map[container.name] = container
            return True
        return False

    def _container_compose_service_label(self, container) -> Optional[str]:
        """Get the compose service label from a container if it exists."""
        if hasattr(container, "config") and container.config.labels:
            return container.config.labels.get("com.docker.compose.service")
        return None

    def _match_container_by_label(
        self, container: object, container_map: dict, all_services: set
    ) -> None:
        """Try to match container by service label and add to map if matched."""
        service_label = self._container_compose_service_label(container)
        if service_label and service_label in all_services:
            container_map[service_label] = container

    def _process_single_container(
        self, container: object, container_map: dict, all_services: set
    ) -> None:
        """Process a single container and add to map if it matches a service."""
        if not self._match_container_by_name(container, container_map, all_services):
            self._match_container_by_label(container, container_map, all_services)

    def _filter_containers_by_service(self, all_containers, all_services: set) -> dict:
        """Filter containers to only include those matching service names.

        Matches containers by either:
        1. Container name matches service name
        2. Container has a com.docker.compose.service label matching the service name
        """
        container_map = {}
        for container in all_containers:
            self._process_single_container(container, container_map, all_services)
        return container_map

    @_handle_docker_not_running
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
            container_map = self._filter_containers_by_service(
                all_containers, all_services
            )
            return None, container_map
        except DOCKER_OPERATION_EXCEPTIONS as e:
            err_exc, _ = self._handle_docker_error("get containers", e)
            return err_exc, {}

    def _get_services_to_check(
        self, all_services: set, service_list: Optional[list] = None
    ) -> set:
        """Determine which services to check based on filter."""
        if service_list:
            return set(service_list) & all_services
        return all_services

    def _build_status_result(
        self,
        all_services: set,
        container_map: dict,
        service_list: Optional[list] = None,
    ) -> list:
        """
        Build the status result list for services.
        Args:
            all_services: Set of all service names from compose file
            container_map: Dict mapping container names to container objects
            service_list: Optional list of specific services to check
        Returns:
            List of container objects and RemovedServiceEntry objects
        """
        services_to_check = self._get_services_to_check(all_services, service_list)
        return [
            container_map.get(service_name) or RemovedServiceEntry(service_name)
            for service_name in services_to_check
        ]

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
                list of Container objects and RemovedServiceEntry objects)
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
        return ["grafana", "influxdb", "mongodb", "postgres", "rabbitmq", "thingsboard"]

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

    def _get_remove_message(self, remove_volumes: bool) -> str:
        """Get message for remove_services based on whether volumes were removed."""
        if remove_volumes:
            return " Services and volumes removed successfully"
        return " Services removed successfully"

    def _remove_all_files_in_directory(self, directory: Path) -> None:
        """Recursively remove all files and subdirectories in a directory.

        Removes all files at all levels including .gitkeep files in nested subdirectories.
        This is used by clean_services to ensure complete cleanup of all service data.
        """
        if not directory.exists():
            return

        try:
            for item in directory.iterdir():
                if item.is_file():
                    # Try to change permissions before deleting (Windows compatibility)
                    try:
                        item.chmod(0o777)
                    except PermissionError:
                        pass
                    try:
                        item.unlink()
                    except OSError as e:
                        click.echo(f"Warning: Could not remove {item}: {e}", err=True)
                elif item.is_dir():
                    # Recursively remove files in subdirectories
                    self._remove_all_files_in_directory(item)
                    # After removing all contents, try to remove the directory itself
                    try:
                        item.rmdir()
                    except OSError:
                        # Directory might not be empty or have permission issues, skip
                        pass
        except OSError as e:
            click.echo(f"Warning: Error accessing directory {directory}: {e}", err=True)

    def _remove_gitkeep_files(self, directory: Path) -> None:
        """Recursively remove all .gitkeep files in a directory and subdirectories.

        Keeps all other files intact. Useful for cleaning placeholder files
        while preserving actual configuration and data.
        """
        if not directory.exists():
            return

        try:
            for item in directory.iterdir():
                if item.is_file() and item.name == ".gitkeep":
                    try:
                        item.chmod(0o777)
                    except PermissionError:
                        pass
                    try:
                        item.unlink()
                    except OSError as e:
                        click.echo(f"Warning: Could not remove {item}: {e}", err=True)
                elif item.is_dir():
                    # Recursively search subdirectories
                    self._remove_gitkeep_files(item)
        except OSError as e:
            click.echo(f"Warning: Error accessing directory {directory}: {e}", err=True)

    def _is_thingsboard_container_present(self) -> bool:
        """Check if ThingsBoard container exists (not removed).
        This is used for dependency checking. Stopping or removing postgres
        is allowed only if ThingsBoard does not exist.
        """
        try:
            err, container_map = self._get_all_containers()
            if err:
                return False
            return "thingsboard-ce" in container_map
        except Exception:
            return False

    def _is_thingsboard_installed(self) -> bool:
        """Check if ThingsBoard database schema is installed in PostgreSQL.

        This is used to determine if the user needs to run the install command
        when starting services. The schema persists even if the container is removed.
        """
        try:
            # Check if PostgreSQL container exists and is running
            err, container_map = self._get_all_containers()
            if err or "postgres" not in container_map:
                return False

            postgres_container = container_map["postgres"]
            if (
                not hasattr(postgres_container, "state")
                or postgres_container.state.status != "running"
            ):
                return False

            # Check if ThingsBoard schema exists by querying PostgreSQL
            # Use the postgres container's default configured user
            result = self.docker.execute(
                "postgres",
                [
                    "sh",
                    "-c",
                    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc '
                    + "\"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings');\"",
                ],
            )
            # t -> table exists, f -> does not exist
            return result.strip() == "t"
        except Exception:
            return False

    def _check_postgres_dependency(
        self, service_list: Optional[list]
    ) -> Tuple[Optional[Exception], Optional[str]]:
        """
        Check if postgres can be removed only if thingsboard is removed.
        Returns (Exception, message) if postgres can't be removed, (None, None) otherwise.
        """
        if (
            not service_list
            or "postgres" not in service_list
            or "thingsboard-ce" in service_list
        ):
            return None, None

        # Check if thingsboard container exists
        if self._is_thingsboard_container_present():
            err = ValueError(
                "Cannot remove PostgreSQL while ThingsBoard container exists. "
                "Remove ThingsBoard first with: dtaas-services remove -s thingsboard"
            )
            return err, str(err)

        return None, None

    def _remove_docker_services(
        self, service_list: Optional[list] = None, remove_volumes: bool = False
    ) -> None:
        """Remove Docker services using docker compose.

        Args:
            service_list: Optional list of specific services to remove.
                         If None, removes all services.
            remove_volumes: Whether to remove associated volumes
        """
        if service_list:
            # Remove specific services
            self.docker.compose.rm(service_list, stop=True, volumes=remove_volumes)
        else:
            # Remove all services
            self.docker.compose.down(volumes=remove_volumes)

        # If volumes were removed, recreate data directory structure
        if remove_volumes:
            self._clean_data_directories(service_list)

    @_handle_docker_not_running
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

        # Normalize service names if provided
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        # Check postgres dependency
        err, msg = self._check_postgres_dependency(service_list)
        if err:
            return err, msg

        try:
            self._remove_docker_services(service_list, remove_volumes)
            return None, self._get_remove_message(remove_volumes)
        except DOCKER_OPERATION_EXCEPTIONS as e:
            return self._handle_docker_error("remove services", e)

    def clean_services(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Clean all temporary files and data for services.
        This removes all files from data and log directories for the specified services,
        including .gitkeep files. Also removes .gitkeep files from config subdirectories.
        Useful for preparing to reinstall services.

        Args:
            service_list: Optional list of specific services to clean

        Returns:
            Tuple of (Exception or None, message)
        """
        # Normalize service names if provided
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        try:
            base_dir = Config.get_base_dir()
            directories = []

            # When cleaning all services, clean root directories
            if not service_list:
                for dir_name in ["data", "log", "certs"]:
                    dir_path = base_dir / dir_name
                    if dir_path.exists():
                        directories.append(dir_path)
            else:
                # When cleaning specific services, clean their subdirectories
                for service in service_list:
                    # Map normalized names to directory names
                    dir_name = "thingsboard" if service == "thingsboard-ce" else service

                    for subdir_type in ["data", "log"]:
                        dir_path = base_dir / subdir_type / dir_name
                        if dir_path.exists():
                            directories.append(dir_path)

            if not directories:
                if service_list:
                    return (
                        None,
                        f"No data directories found for services: {', '.join(service_list)}",
                    )
                return None, "No data directories found"

            for directory in directories:
                self._remove_all_files_in_directory(directory)

            # Also remove .gitkeep files from config directories
            config_dir = base_dir / "config"
            if config_dir.exists():
                self._remove_gitkeep_files(config_dir)

            if service_list:
                return None, f"Cleaned data for services: {', '.join(service_list)}"
            return None, "Cleaned all service data"
        except OSError as e:
            err = RuntimeError(f"Failed to clean service data: {str(e)}")
            return err, str(err)
