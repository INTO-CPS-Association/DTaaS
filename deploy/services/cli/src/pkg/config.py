"""Configuration management for DTaaS services"""
import os
from pathlib import Path
from typing import Dict
from dotenv import load_dotenv


class Config:
    """Configuration class for DTaaS services management"""

    def __init__(self, services_dir: Path = None) -> None:
        """
        Initialize configuration.

        Args:
            services_dir: Path to the services directory. If None, uses default location.
        """
        if services_dir is None:
            # Default to manual directory relative to CLI location
            self.base_dir = Path(__file__).parent.parent.parent / "manual"
        else:
            self.base_dir = services_dir

        self.env_file = self.base_dir / "config" / "services.env"
        self.env: Dict[str, str] = {}

        if self.env_file.exists():
            self.env = self._load_env()

    def _load_env(self) -> Dict[str, str]:
        """Load environment variables from services.env file"""
        if not self.env_file.exists():
            raise FileNotFoundError(
                f"Environment file not found: {self.env_file}\n"
                f"Please copy services.env.template to services.env and configure it."
            )
        load_dotenv(dotenv_path=self.env_file, override=True)
        return dict(os.environ)

    def get_required_env(self, var_name: str) -> str:
        """
        Get a required environment variable.

        Args:
            var_name: Name of the environment variable

        Returns:
            Value of the environment variable

        Raises:
            RuntimeError: If the variable is not set
        """
        value = self.env.get(var_name)
        if value is None:
            raise RuntimeError(
                f"Required environment variable '{var_name}' is not set. "
                f"Please ensure it is defined in {self.env_file}"
            )
        return value

    def get_env(self, var_name: str, default: str = None) -> str:
        """
        Get an environment variable with optional default.

        Args:
            var_name: Name of the environment variable
            default: Default value if variable is not set

        Returns:
            Value of the environment variable or default
        """
        return self.env.get(var_name, default)
