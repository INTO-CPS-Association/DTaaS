"""Low-level docker compose execution (start, stop, restart, remove), action handlers"""

import subprocess
from functools import wraps
from typing import Callable, Tuple, Optional
from python_on_whales.exceptions import DockerException
from .initialization import ServiceInitializer
# pylint: disable=E1101


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


def handle_docker_not_running(func) -> Callable:
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


class DockerExecutor(ServiceInitializer):
    """Mixin for low-level Docker Compose execution operations."""

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

    def _start_services(self, service_list: Optional[list]) -> Tuple[list, list, list]:
        """Start services or all if service_list is None.

        Returns:
            Tuple of (skipped running services, started services, restarting services)
        """
        running_services, restarting_services = (
            self.get_running_or_restarting_services()  # type: ignore[attr-defined]
        )
        skip_services = running_services | restarting_services

        if service_list is not None:
            services_to_start, skipped_services, restarting_list = (
                self.prepare_services_to_start(  # type: ignore[attr-defined]
                    service_list, skip_services
                )
            )
        else:
            services_to_start, skipped_services, restarting_list = (
                self.prepare_all_services_to_start(skip_services)  # type: ignore[attr-defined]
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

    def handle_docker_error(
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

    def _get_services_to_remove(self, service_list: Optional[list]) -> list:
        """Get list of services to remove, using all services if none specified.

        Args:
            service_list: Optional list of specific services

        Returns:
            List of services to remove
        """
        if service_list is not None:
            return service_list

        _, all_services = self.get_all_service_names()  # type: ignore[attr-defined]
        return list(all_services) if all_services else []

    def _perform_post_removal_cleanup(
        self, service_list: list, remove_volumes: bool
    ) -> None:
        """Perform cleanup operations after removing services.

        Args:
            service_list: List of removed services
            remove_volumes: Whether volumes were removed
        """
        if remove_volumes:
            self.clean_data_directories(service_list)  # type: ignore[attr-defined]
            self.remove_influx_config(service_list)  # type: ignore[attr-defined]

    def remove_docker_services(
        self, service_list: Optional[list] = None, remove_volumes: bool = False
    ) -> None:
        """Remove Docker services using docker compose.

        Args:
            service_list: Optional list of specific services to remove.
                            If None, removes all services.
            remove_volumes: Whether to remove associated volumes
        """
        services = self._get_services_to_remove(service_list)

        if services:
            self.docker.compose.rm(services, stop=True, volumes=remove_volumes)
            self._perform_post_removal_cleanup(services, remove_volumes)
