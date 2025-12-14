"""Configuration module for documentation replacement tool."""

import configparser
from pathlib import Path
from typing import List


class Config:
    """Configuration container."""

    def __init__(self, version: str, url: str, files: List[str]):
        """Initialize configuration."""
        self.version = version
        self.url = url
        self.files = files


def load_config(config_path: Path) -> Config:
    """
    Load configuration from INI file.

    Args:
        config_path: Path to docs.ini file

    Returns:
        Config object with version, url, and file list
    """
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    parser = configparser.ConfigParser()
    parser.read(config_path, encoding="utf-8")

    section = "docs.substitute"
    version = parser.get(section, "VERSION", fallback="").strip()
    url = parser.get(section, "URL", fallback="").strip()
    files_raw = parser.get(section, "FILES", fallback="")

    files = [f.strip() for f in files_raw.split(",") if f.strip()]

    if not version or not url or not files:
        raise ValueError(f"Section [{section}] must contain VERSION, URL, FILES")

    return Config(version, url, files)
