"""DTaaS platform services setup module"""

import subprocess
from functools import wraps
from typing import Tuple, Optional, Set
from pathlib import Path
import os
import shutil
import click
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


def _is_service_not_found_error(error_msg: str) -> bool:
    """Check if error is a service not found error."""
    return "no such service" in error_msg


def _is_docker_daemon_error(error_msg: str) -> bool:
    """Check if error is a Docker daemon connection issue."""
    daemon_keywords = [
        "cannot connect",
        "connection refused",
        "daemon",
        "not running",
    ]
    if any(keyword in error_msg for keyword in daemon_keywords):
        return True
    return "returned with code" in error_msg and "no such service" not in error_msg


def _process_docker_exception(exc: DockerException) -> Tuple[Exception, str]:
    """Process DockerException and return appropriate error tuple."""
    error_msg = str(exc).lower()

    if _is_service_not_found_error(error_msg):
        err = ValueError(f"Service not found: {str(exc)}")
        return err, str(exc)

    if _is_docker_daemon_error(error_msg):
        err = RuntimeError(
            "\nDocker is not running. Please start Docker Desktop and try again."
        )
        return err, str(err)

    err = RuntimeError(f"Docker error: {str(exc)}")
    return err, str(exc)


def _handle_docker_not_running(func):
    """Decorator to catch DockerException and return error response.

    Returns (error, message) when Docker is not running.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except DockerException as e:
            return _process_docker_exception(e)

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

    def _is_container_running(self, container) -> bool:
        """Check if a container is running."""
        return hasattr(container, "state") and container.state.status == "running"

    def get_running_services(self) -> Set[str]:
        """Get set of currently running service names.

        Returns:
            Set of service names that are currently running
        """
        try:
            err, container_map = self._get_all_containers()
            if err:
                return set()

            running_services = {
                service_name
                for service_name, container in container_map.items()
                if self._is_container_running(container)
            }
            return running_services
        except Exception:
            return set()

    def _add_service_to_state_set(
        self, service_name: str, status: str, state_sets: dict
    ) -> None:
        """Add service to appropriate state set based on status."""
        if status == "running":
            state_sets["running"].add(service_name)
        elif status == "restarting":
            state_sets["restarting"].add(service_name)

    def _categorize_container_state(
        self, service_name: str, container, state_sets: dict
    ) -> None:
        """Categorize a container into running or restarting state.

        Args:
            service_name: Name of the service
            container: Container object
            state_sets: Dict with 'running' and 'restarting' sets
        """
        if hasattr(container, "state"):
            self._add_service_to_state_set(
                service_name, container.state.status, state_sets
            )

    def _get_running_or_restarting_services(self) -> Tuple[Set[str], Set[str]]:
        """Get sets of running and restarting service names.

        Returns:
            Tuple of (running services set, restarting services set)
        """
        try:
            err, container_map = self._get_all_containers()
            if err:
                return set(), set()

            state_sets = {"running": set(), "restarting": set()}
            for service_name, container in container_map.items():
                self._categorize_container_state(service_name, container, state_sets)
            return state_sets["running"], state_sets["restarting"]
        except Exception:
            return set(), set()

    def _prepare_services_to_start(
        self, service_list: Optional[list], skip_services: Set[str]
    ) -> Tuple[list, list, list]:
        """Prepare lists of services to start, skip, and those restarting."""
        running_services, restarting_services = (
            self._get_running_or_restarting_services()
        )
        services_to_start = [s for s in service_list if s not in skip_services]
        skipped_services = [s for s in service_list if s in running_services]
        restarting_list = [s for s in service_list if s in restarting_services]
        return services_to_start, skipped_services, restarting_list

    def _prepare_all_services_to_start(
        self, skip_services: Set[str]
    ) -> Tuple[list, list, list]:
        """Prepare all services to start."""
        err, all_services = self._get_all_service_names()
        if err:
            return [], [], []

        services_to_start = [s for s in all_services if s not in skip_services]
        running_services, restarting_services = (
            self._get_running_or_restarting_services()
        )
        skipped_services = list(running_services & set(all_services))
        restarting_list = list(restarting_services & set(all_services))
        return services_to_start, skipped_services, restarting_list

    def _start_services(self, service_list: Optional[list]) -> Tuple[list, list, list]:
        """Start services or all if service_list is None.

        Returns:
            Tuple of (skipped running services, started services, restarting services)
        """
        running_services, restarting_services = (
            self._get_running_or_restarting_services()
        )
        skip_services = running_services | restarting_services

        if service_list is not None:
            services_to_start, skipped_services, restarting_list = (
                self._prepare_services_to_start(service_list, skip_services)
            )
        else:
            services_to_start, skipped_services, restarting_list = (
                self._prepare_all_services_to_start(skip_services)
            )

        if services_to_start:
            self.docker.compose.up(services_to_start, detach=True)

        return skipped_services, services_to_start, restarting_list

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
    ) -> Tuple[list, list, list]:
        """Execute a compose action with appropriate arguments.
        Args:
            action: The action name ('start', 'stop', 'restart')
            service_list: Optional list of services to target

        Returns:
            Tuple of (skipped services, affected services, restarting services)
            Only applicable for 'start' action, returns ([], [], []) for others
        """
        action_handlers = {
            "start": self._start_services,
            "stop": self._stop_services,
            "restart": self._restart_services,
        }
        if action not in action_handlers:
            raise ValueError(f"Invalid action: {action}")

        result = action_handlers[action](service_list)

        # _start_services returns (skipped, started, restarting), others return None
        if action == "start" and result is not None:
            return result
        return [], [], []

    def _build_skipped_message(self, skipped: list) -> Optional[str]:
        """Build message for skipped services."""
        if skipped:
            return f"Skipped {len(skipped)} already running service(s): {', '.join(skipped)}"
        return None

    def _build_restarting_message(self, restarting: list) -> Optional[str]:
        """Build message for restarting services."""
        if restarting:
            return (
                f"⚠️  {len(restarting)} service(s) are restarting: {', '.join(restarting)}\n"
                "   If a service keeps restarting, there may be a configuration error.\n"
                "   Check logs with: docker logs <container_name>"
            )
        return None

    def _build_started_message(
        self, affected: list, skipped: list, restarting: list
    ) -> Optional[str]:
        """Build message for started services."""
        if affected:
            return f"Started {len(affected)} service(s): {', '.join(affected)}"
        if not skipped and not restarting:
            return "No services to start"
        return None

    def _build_start_messages(
        self, skipped: list, affected: list, restarting: list
    ) -> list:
        """Build all messages for start action."""
        messages = []
        if skipped_msg := self._build_skipped_message(skipped):
            messages.append(skipped_msg)
        if restarting_msg := self._build_restarting_message(restarting):
            messages.append(restarting_msg)
        if started_msg := self._build_started_message(affected, skipped, restarting):
            messages.append(started_msg)
        return messages

    def _format_start_success_message(
        self, skipped: list, affected: list, restarting: list
    ) -> str:
        """Format success message for start action."""
        messages = self._build_start_messages(skipped, affected, restarting)
        if not messages:
            return "All services are already running"
        return "\n".join(messages)

    def _get_success_message(
        self,
        action: str,
        skipped: list = None,
        affected: list = None,
        restarting: list = None,
    ) -> str:
        """Get success message for an action.

        Args:
            action: The action performed
            skipped: List of services that were skipped (for start action)
            affected: List of services that were affected
            restarting: List of services that are in restarting state
        """
        if action == "start":
            return self._format_start_success_message(
                skipped or [], affected or [], restarting or []
            )

        messages_map = {
            "stop": "Services stopped successfully",
            "restart": "Services restarted successfully",
        }
        return messages_map.get(action, "Operation completed successfully")

    def _handle_service_action_error(
        self, action: str, exc: Exception
    ) -> Tuple[Optional[Exception], str]:
        """Handle errors from service action execution."""
        if isinstance(exc, ValueError):
            return exc, str(exc)
        return self._handle_docker_error(f"{action} services", exc)

    def _get_postgres_stop_warning(self) -> str:
        """Get warning message for blocked PostgreSQL stop."""
        return (
            "  Skipping PostgreSQL stop: ThingsBoard container is still present. "
            "Remove ThingsBoard first with: dtaas-services remove -s thingsboard"
        )

    def _should_check_postgres_thingsboard_dependency(
        self, service_list: Optional[list]
    ) -> bool:
        """Check if postgres-thingsboard dependency check is needed."""
        return service_list is None or "postgres" in service_list

    def _check_postgres_stop_dependency(
        self, service_list: Optional[list]
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if postgres stop should be blocked due to thingsboard.
        Returns (should_warn, warning_message).
        """
        if not self._should_check_postgres_thingsboard_dependency(service_list):
            return False, None

        if self._is_thingsboard_container_present():
            return True, self._get_postgres_stop_warning()

        return False, None

    def _filter_out_postgres(self, service_list: Optional[list]) -> Optional[list]:
        """Filter postgres from service list."""
        if service_list is None:
            err, all_services = self._get_all_service_names()
            if err:
                return None
            return [s for s in all_services if s != "postgres"]
        return [s for s in service_list if s != "postgres"]

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

        filtered = self._filter_out_postgres(service_list)
        return filtered if filtered is not None else service_list, warning

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
            skipped, affected, restarting = self._execute_compose_action(
                action, service_list
            )
            success_msg = self._get_success_message(
                action, skipped, affected, restarting
            )
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

    def _try_remove_file(self, path: Path) -> None:
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

    def _remove_influx_cli_config_if_needed(self, service_list: Optional[list]) -> None:
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

        self._try_remove_file(influx_cfg)

    def _get_remove_message(self, remove_volumes: bool) -> str:
        """Get message for remove_services based on whether volumes were removed."""
        if remove_volumes:
            return " Services and volumes removed successfully"
        return " Services removed successfully"

    def _handle_file_removal(self, item: Path) -> None:
        """Handle removal of a file with permission and error handling."""
        try:
            item.chmod(0o777)
        except PermissionError:
            # Ignore permission errors
            pass
        try:
            item.unlink()
        except OSError as e:
            click.echo(f"Warning: Could not remove {item}: {e}", err=True)

    def _handle_directory_removal(self, item: Path) -> None:
        """Handle recursive removal of directory contents."""
        self._remove_all_files_in_directory(item)
        try:
            item.rmdir()
        except OSError:
            # Ignore errors when removing directory
            pass

    def _process_item_for_removal(self, item: Path) -> None:
        """Process a single item for removal (file or directory)."""
        if item.is_file():
            self._handle_file_removal(item)
        elif item.is_dir():
            self._handle_directory_removal(item)

    def _remove_all_files_in_directory(self, directory: Path) -> None:
        """Recursively remove all files and subdirectories in a directory.

        Removes all files at all levels including .gitkeep files in nested subdirectories.
        This is used by clean_services to ensure complete cleanup of all service data.
        """
        if not directory.exists():
            return

        try:
            for item in directory.iterdir():
                self._process_item_for_removal(item)
        except OSError as e:
            click.echo(f"Warning: Error accessing directory {directory}: {e}", err=True)

    def _handle_gitkeep_file(self, item: Path) -> None:
        """Handle removal of a .gitkeep file."""
        try:
            item.chmod(0o777)
        except PermissionError:
            # Ignore permission errors
            pass
        try:
            item.unlink()
        except OSError as e:
            click.echo(f"Warning: Could not remove {item}: {e}", err=True)

    def _process_item_for_gitkeep_removal(self, item: Path) -> None:
        """Process a single item for gitkeep removal."""
        if item.is_file() and item.name == ".gitkeep":
            self._handle_gitkeep_file(item)
        elif item.is_dir():
            self._remove_gitkeep_files(item)

    def _remove_gitkeep_files(self, directory: Path) -> None:
        """Recursively remove all .gitkeep files in a directory and subdirectories.

        Keeps all other files intact. Useful for cleaning placeholder files
        while preserving actual configuration and data.
        """
        if not directory.exists():
            return

        try:
            for item in directory.iterdir():
                self._process_item_for_gitkeep_removal(item)
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

    def _validate_postgres_for_thingsboard_check(self, container_map: dict) -> bool:
        """Validate PostgreSQL container is available and running for TB check."""
        if "postgres" not in container_map:
            return False

        postgres_container = container_map["postgres"]
        return (
            hasattr(postgres_container, "state")
            and postgres_container.state.status == "running"
        )

    def _query_thingsboard_schema(self) -> bool:
        """Query PostgreSQL for ThingsBoard schema existence."""
        try:
            result = self.docker.execute(
                "postgres",
                [
                    "sh",
                    "-c",
                    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc '
                    + '"SELECT EXISTS (SELECT 1 FROM '
                    + "information_schema.tables WHERE table_name = 'admin_settings');\"",
                ],
            )
            return result.strip() == "t"
        except Exception:
            return False

    def is_thingsboard_installed(self) -> bool:
        """Check if ThingsBoard database schema is installed in PostgreSQL.

        This is used to determine if the user needs to run the install command
        when starting services. The schema persists even if the container is removed.
        """
        try:
            err, container_map = self._get_all_containers()
            if err or not self._validate_postgres_for_thingsboard_check(container_map):
                return False
            return self._query_thingsboard_schema()
        except Exception:
            return False

    def _check_postgres_dependency(
        self, service_list: Optional[list]
    ) -> Tuple[Optional[Exception], Optional[str]]:
        """
        Check if postgres can be removed only if thingsboard is removed.
        Returns (Exception, message) if postgres can't be removed, (None, None) otherwise.
        """
        should_check = (
            service_list
            and "postgres" in service_list
            and "thingsboard-ce" not in service_list
        )

        if not should_check:
            return None, None

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
            # Also remove generated config artifacts that conflict with fresh init
            self._remove_influx_cli_config_if_needed(service_list)

    def _check_remove_prerequisites(
        self, service_list: Optional[list]
    ) -> Tuple[Optional[Exception], Optional[str]]:
        """Check prerequisites for removal (compose file exists and postgres dependency)."""
        err, exists = self._check_compose_file()
        if not exists:
            return err, str(err)

        err, msg = self._check_postgres_dependency(service_list)
        if err:
            return err, msg

        return None, None

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
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        err, msg = self._check_remove_prerequisites(service_list)
        if err:
            return err, msg

        try:
            self._remove_docker_services(service_list, remove_volumes)
            return None, self._get_remove_message(remove_volumes)
        except DOCKER_OPERATION_EXCEPTIONS as e:
            return self._handle_docker_error("remove services", e)

    def _get_root_data_directories(self) -> list:
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

    def _get_service_directory_name(self, service: str) -> str:
        """Map service name to directory name."""
        return "thingsboard" if service == "thingsboard-ce" else service

    def _add_service_directories(
        self, base_dir: Path, service: str, directories: list
    ) -> None:
        """Add data and log directories for a service if they exist."""
        dir_name = self._get_service_directory_name(service)
        for subdir_type in ["data", "log"]:
            dir_path = base_dir / subdir_type / dir_name
            if dir_path.exists():
                directories.append(dir_path)

    def _get_service_subdirectories(self, service_list: list) -> list:
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
            self._add_service_directories(base_dir, service, directories)
        return directories

    def _get_service_data_directories(self, service_list: Optional[list]) -> list:
        """
        Get data and log directories for services.

        Args:
            service_list: Optional list of specific services. If None, returns root data/log dirs.

        Returns:
            List of Path objects for service data directories
        """
        if not service_list:
            return self._get_root_data_directories()
        return self._get_service_subdirectories(service_list)

    def _get_certs_directory(self) -> Optional[Path]:
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
        directories = self._get_service_data_directories(service_list)

        # Optionally add certificate directory
        if include_certs:
            certs_dir = self._get_certs_directory()
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
        for directory in directories:
            self._remove_all_files_in_directory(directory)

        # If we wiped InfluxDB data, also remove the generated CLI config file
        self._remove_influx_cli_config_if_needed(service_list)

        # Also remove .gitkeep files from config directories
        config_dir = Config.get_base_dir() / "config"
        if config_dir.exists():
            self._remove_gitkeep_files(config_dir)

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

    def _execute_clean_operation(
        self, directories: list, service_list: Optional[list]
    ) -> None:
        """Execute the cleanup operation."""
        self._perform_cleanup(directories, service_list)

    def clean_services(
        self, service_list: Optional[list] = None, include_certs: bool = False
    ) -> Tuple[Optional[Exception], str]:
        """
        Clean service data directories.

        By default, this removes all files from data and log directories for the specified
        services (including .gitkeep files) and removes .gitkeep files from config
        subdirectories.

        Certificates under certs/<HOSTNAME> are NOT deleted unless include_certs=True.

        Args:
            service_list: Optional list of specific services to clean
            include_certs: Whether to also remove copied TLS cert files under certs/<HOSTNAME>

        Returns:
            Tuple of (Exception or None, message)
        """
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        try:
            directories = self._get_directories_to_clean(service_list, include_certs)
            err, msg = self._validate_clean_directories(directories, service_list)
            if err or msg:
                return err, msg

            self._execute_clean_operation(directories, service_list)
            message = self._build_cleanup_message(service_list, include_certs)
            return None, message
        except OSError as e:
            err = RuntimeError(f"Failed to clean service data: {str(e)}")
            return err, str(err)
