"""This file is for initializing the compose files and Docker client."""

from pathlib import Path
import os
from typing import cast, List
from python_on_whales import DockerClient
from ..config import Config
# pylint: disable=too-few-public-methods


class ServiceInitializer:
    """Class for initializing Docker client and compose file paths."""

    def __init__(self) -> None:
        """
        Initialize service setup.
        """
        self.compose_file = self._resolve_compose_file()
        self.thingsboard_compose_file = self._resolve_thingsboard_compose_file()
        self.gitlab_compose_file = self._resolve_gitlab_compose_file()
        self._setup_environment_variables()
        self._setup_project_name()

        # Use all available compose files
        compose_files: list[Path] = [self.compose_file]
        if self.thingsboard_compose_file.exists():
            compose_files.append(self.thingsboard_compose_file)
        if self.gitlab_compose_file.exists():
            compose_files.append(self.gitlab_compose_file)

        self.docker = DockerClient(compose_files=cast(List, compose_files))

    def _resolve_compose_file(self) -> Path:
        """Resolve compose file path with fallback to package location."""
        base_dir = Config.get_base_dir()
        compose_file = base_dir / "compose.services.yml"
        if not compose_file.exists():
            package_dir = Path(__file__).parent.parent
            compose_file = package_dir / "compose.services.yml"
        return compose_file

    def _resolve_thingsboard_compose_file(self) -> Path:
        """Resolve ThingsBoard compose file path with fallback to package location."""
        base_dir = Config.get_base_dir()
        compose_file = base_dir / "compose.thingsboard.yml"
        if not compose_file.exists():
            package_dir = Path(__file__).parent.parent
            compose_file = package_dir / "compose.thingsboard.yml"
        return compose_file

    def _resolve_gitlab_compose_file(self) -> Path:
        """Resolve GitLab compose file path with fallback to package location."""
        base_dir = Config.get_base_dir()
        compose_file = base_dir / "compose.gitlab.yml"
        if not compose_file.exists():
            package_dir = Path(__file__).parent.parent
            compose_file = package_dir / "compose.gitlab.yml"
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
