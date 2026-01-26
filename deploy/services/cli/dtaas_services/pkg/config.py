"""Configuration management for DTaaS services"""

import os
import platform
from pathlib import Path
from dotenv import load_dotenv

SERVICES_ENV_FILE = "services.env"


class Config:
    """This class handles loading and accessing configuration values from an environment file."""

    def __init__(self):
        base_dir = self.get_base_dir()
        if os.environ.get("DTAAS_TEST_MODE") == "true":
            # Use test configuration from tests/config/
            self.env_path = base_dir / "tests" / "config" / SERVICES_ENV_FILE
        else:
            self.env_path = base_dir / "config" / SERVICES_ENV_FILE

        self.base_dir = base_dir

        if not self.env_path.exists():
            raise FileNotFoundError(
                f"Configuration file not found: {self.env_path}\n"
                f"Please copy config/{SERVICES_ENV_FILE}.template to config/{SERVICES_ENV_FILE} \n"
                f"and update it with your configuration "
            )
        load_dotenv(dotenv_path=self.env_path, override=True)
        self.env = dict(os.environ)

    @staticmethod
    def _is_running_from_venv() -> bool:
        """Check if running from a virtual environment (venv or site-packages)."""
        file_path = Path(__file__).resolve()
        return "site-packages" in str(file_path) or "venv" in str(file_path)

    @staticmethod
    def _get_windows_base_dir() -> Path:
        """Get base directory for Windows development environment."""
        if Config._is_running_from_venv():
            return Path.cwd().parent
        # Running from source: Go up from dtaas_services/pkg/config.py to deploy/services/
        return Path(__file__).parent.parent.parent.parent

    @staticmethod
    def get_base_dir() -> Path:
        """
        Get the base directory for the project.
        Supports both standalone package and development workflows:
        - If config/services.env exists in cwd, use cwd (standalone package)
        - Otherwise use package source location (development in DTaaS repo)
        On Linux/MacOS in development mode, uses Path.cwd().parent
        On Windows in development mode, uses Path(__file__).parent.parent.parent.parent
        Returns:
            Path object representing the base directory
        """
        # Check if running from generated project (standalone package workflow)
        cwd_config = Path.cwd() / "config" / "services.env"
        if cwd_config.exists():
            return Path.cwd()

        # Running from source in DTaaS repository (development workflow)
        if platform.system().lower() in ["linux", "darwin"]:
            return Path.cwd().parent

        # Windows: Use helper to determine correct path
        return Config._get_windows_base_dir()

    def get_value(self, key: str) -> str:
        """Gets a required configuration value from the environment file."""
        value = self.env.get(key)
        if value is None:
            raise RuntimeError(
                f"Required configuration key '{key}' is not set in the environment file."
            )
        return value
