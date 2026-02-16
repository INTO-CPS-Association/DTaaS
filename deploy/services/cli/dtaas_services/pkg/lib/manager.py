"""High-level service operations (manage_services, _start_services, _stop_services logic)"""

from typing import Tuple, Optional, Set
from dataclasses import dataclass
from ..formatter import normalize_service_name
from ..services.thingsboard.checker import _is_thingsboard_container_running
from .utils import check_compose_file
from .utils import DOCKER_OPERATION_EXCEPTIONS
from .docker_executor import handle_docker_not_running
from .status import Status


@dataclass
class ServiceActionResult:
    """Result of a service action."""

    skipped: Optional[list] = None
    affected: Optional[list] = None
    restarting: Optional[list] = None


class Manager(Status):
    """Mixin for high-level service management operations."""

    def prepare_services_to_start(
        self, service_list: Optional[list], skip_services: Set[str]
    ) -> Tuple[list, list, list]:
        """Prepare lists of services to start, skip, and those restarting."""
        running_services, restarting_services = (
            self.get_running_or_restarting_services()
        )
        services_to_start = [s for s in service_list if s not in skip_services]
        skipped_services = [s for s in service_list if s in running_services]
        restarting_list = [s for s in service_list if s in restarting_services]
        return services_to_start, skipped_services, restarting_list

    def prepare_all_services_to_start(
        self, skip_services: Set[str]
    ) -> Tuple[list, list, list]:
        """Prepare all services to start."""
        err, all_services = self.get_all_service_names()
        if err:
            return [], [], []

        services_to_start = [s for s in all_services if s not in skip_services]
        running_services, restarting_services = (
            self.get_running_or_restarting_services()
        )
        skipped_services = list(running_services & set(all_services))
        restarting_list = list(restarting_services & set(all_services))
        return services_to_start, skipped_services, restarting_list

    def _filter_postgres_if_needed(
        self, action: str, service_list: Optional[list]
    ) -> Tuple[Optional[list], Optional[Exception], Optional[str]]:
        """
        Check for postgres dependency issues when stopping services.
        Returns (filtered_service_list, Exception or None, error_message or None).
        """
        if action != "stop":
            return service_list, None, None

        err, msg = self._check_postgres_stop_dependency(service_list)
        if err:
            return service_list, err, msg

        return service_list, None, None

    def _check_postgres_stop_dependency(
        self, service_list: Optional[list]
    ) -> Tuple[Optional[Exception], Optional[str]]:
        """
        Check if postgres stop should be blocked due to thingsboard running.
        Returns (Exception, message) if blocked, (None, None) otherwise.
        """
        if not self._should_check_postgres_thingsboard_dependency(service_list):
            return None, None

        if _is_thingsboard_container_running(self.docker):
            err = ValueError(
                "Cannot stop PostgreSQL while ThingsBoard is running. "
                "Stop or remove ThingsBoard first with: dtaas-services stop -s thingsboard"
            )
            return err, str(err)

        return None, None

    def _get_success_message(
        self,
        action: str,
        result: ServiceActionResult,
    ) -> str:
        """Get success message for an action.

        Args:
            action: The action performed
            result: ServiceActionResult containing skipped, affected, and restarting lists
        """
        if action == "start":
            return self._format_start_success_message(
                result.skipped or [], result.affected or [], result.restarting or []
            )

        messages_map = {
            "stop": "Services stopped successfully",
            "restart": "Services restarted successfully",
        }
        return messages_map.get(action, "Operation completed successfully")

    # Message builders
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

    def _handle_service_action_error(
        self, action: str, exc: Exception
    ) -> Tuple[Optional[Exception], str]:
        """Handle errors from service action execution."""
        if isinstance(exc, ValueError):
            return exc, str(exc)
        return self.handle_docker_error(f"{action} services", exc)

    def _should_check_postgres_thingsboard_dependency(
        self, service_list: Optional[list]
    ) -> bool:
        """Check if postgres-thingsboard dependency check is needed.
        Only check when postgres is explicitly in the service list.
        """
        return service_list is not None and "postgres" in service_list

    def _perform_action(
        self, action: str, service_list: Optional[list]
    ) -> Tuple[Optional[Exception], str]:
        """Execute the service action and return result message.

        Args:
            action: The action to perform ('start', 'stop', 'restart')
            service_list: Services to manage (None for all)

        Returns:
            Tuple of (Exception or None, message)
        """
        try:
            skipped, affected, restarting = self._execute_compose_action(
                action, service_list
            )
            result = ServiceActionResult(
                skipped=skipped, affected=affected, restarting=restarting
            )
            success_msg = self._get_success_message(action, result)
            return None, success_msg
        except (ValueError, *DOCKER_OPERATION_EXCEPTIONS) as e:
            return self._handle_service_action_error(action, e)

    @handle_docker_not_running
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
        # Validate compose file exists
        err, exists = check_compose_file(self.compose_file)
        if not exists:
            return err, str(err)

        # Normalize service names if provided
        if service_list:
            service_list = [normalize_service_name(s) for s in service_list]

        # Check for postgres dependency issues when stopping
        service_list, pg_err, pg_msg = self._filter_postgres_if_needed(
            action, service_list
        )
        if pg_err:
            return pg_err, pg_msg

        # Execute action and return result
        return self._perform_action(action, service_list)
