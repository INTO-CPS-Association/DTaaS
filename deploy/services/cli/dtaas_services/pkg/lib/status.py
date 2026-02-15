"""Service status & inspection"""

from typing import Tuple, Optional, Set
from .utils import check_compose_file, DOCKER_OPERATION_EXCEPTIONS
from ..formatter import RemovedServiceEntry
from .docker_executor import DockerExecutor, handle_docker_not_running


class Status(DockerExecutor):
    """Service status operations."""

    def _add_service_to_state_set(
        self, service_name: str, status: str, state_sets: dict
    ) -> None:
        """Add service to appropriate state set based on status."""
        if status == "running":
            state_sets["running"].add(service_name)
        elif status == "restarting":
            state_sets["restarting"].add(service_name)

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

    def _get_services_to_check(
        self, all_services: set, service_list: Optional[list] = None
    ) -> set:
        """Determine which services to check based on filter."""
        if service_list:
            return set(service_list) & all_services
        return all_services

    def _is_container_running(self, container) -> bool:
        """Check if a container is running."""
        return hasattr(container, "state") and container.state.status == "running"

    def _match_container_by_label(
        self, container: object, container_map: dict, all_services: set
    ) -> None:
        """Try to match container by service label and add to map if matched."""
        service_label = self._container_compose_service_label(container)
        if service_label and service_label in all_services:
            container_map[service_label] = container

    def get_all_service_names(self) -> Tuple[Optional[Exception], Set[str]]:
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
            err_exc, _ = self.handle_docker_error("get service names", e)
            return err_exc, set()

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
        err, exists = check_compose_file(self.compose_file)
        if not exists:
            return err, []
        try:
            return self._fetch_status_data(service_list)
        except DOCKER_OPERATION_EXCEPTIONS as e:
            err_exc, _ = self.handle_docker_error("get service status", e)
            return err_exc, []

    def get_running_services(self) -> Set[str]:
        """Get set of currently running service names.

        Returns:
            Set of service names that are currently running
        """
        try:
            err, container_map = self.get_all_containers()
            if err:
                return set()

            running_services = {
                service_name
                for service_name, container in container_map.items()
                if self._is_container_running(container)
            }
            return running_services
        except DOCKER_OPERATION_EXCEPTIONS:
            return set()

    def get_running_or_restarting_services(self) -> Tuple[Set[str], Set[str]]:
        """Get sets of running and restarting service names.

        Returns:
            Tuple of (running services set, restarting services set)
        """
        try:
            err, container_map = self.get_all_containers()
            if err:
                return set(), set()

            state_sets = {"running": set(), "restarting": set()}
            for service_name, container in container_map.items():
                self._categorize_container_state(service_name, container, state_sets)
            return state_sets["running"], state_sets["restarting"]
        except DOCKER_OPERATION_EXCEPTIONS:
            return set(), set()

    def _fetch_status_data(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], list]:
        """Fetch service names and container data for status.
        Returns:
            Tuple of (Exception or None, result list)
        """
        err, all_services = self.get_all_service_names()
        if err:
            return err, []
        err, container_map = self.get_all_containers()
        if err:
            return err, []
        result = self._build_status_result(all_services, container_map, service_list)
        return None, result

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

    def _process_single_container(
        self, container: object, container_map: dict, all_services: set
    ) -> None:
        """Process a single container and add to map if it matches a service."""
        if not self._match_container_by_name(container, container_map, all_services):
            self._match_container_by_label(container, container_map, all_services)

    @handle_docker_not_running
    def get_all_containers(self) -> Tuple[Optional[Exception], dict]:
        """
        Get all containers belonging to this compose project and create a mapping by name.
        Returns:
            Tuple of (Exception or None, dict mapping container name to container object)
        """
        try:
            all_containers = self.docker.container.list(all=True)
            err, all_services = self.get_all_service_names()
            if err is not None:
                return err, {}
            container_map = self._filter_containers_by_service(
                all_containers, all_services
            )
            return None, container_map
        except DOCKER_OPERATION_EXCEPTIONS as e:
            err_exc, _ = self.handle_docker_error("get containers", e)
            return err_exc, {}
