import os
import platform
from pathlib import Path
from dotenv import load_dotenv


class Config:
    """ This class handles loading and accessing configuration values from an environment file. """

    def __init__(self):
        # Default windows path
        base_dir = Path(__file__).parent.parent.parent.parent
        # If it is Linux or MacOS, adjust the base directory
        if platform.system().lower() in ['linux', 'darwin']:
            base_dir = Path.cwd().parent
        self.env_path = base_dir / "config" / "services.env"

        if not self.env_path.exists():
            raise FileNotFoundError(
                    f"Configuration file not found: {self.env_path}\n"
                    f"Please copy config/services.env.template to config/services.env ")
        load_dotenv(dotenv_path=self.env_path, override=True)
        self.env = dict(os.environ)


    def get_value(self, key: str) -> str:
        """ Gets a required configuration value from the environment file. """
        value = self.env.get(key)
        if value is None:
            raise RuntimeError(
                f"Required configuration key '{key}' is not set in the environment file.")
        return value


    def get_all(self) -> dict:
        """Get all configuration values as a dictionary."""
        return self.env.copy()
