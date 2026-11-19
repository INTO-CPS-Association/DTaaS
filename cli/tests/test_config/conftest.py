"""Fixtures shared by the config.py tests: the toml data and the
import_toml patch each Config is built from."""

from unittest.mock import patch
import pytest
from src.pkg import config
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_toml_data():
    """Mock TOML configuration data"""
    return {
        "common": {"path": "/test/path", "server-dns": "localhost"},
        "users": [
            {"username": "user1", "email": "user1@x.io"},
            {"username": "user2", "email": "user2@x.io"},
        ],
    }


@pytest.fixture
def mock_utils():
    """Mock utils.import_toml"""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        yield mock_import


@pytest.fixture
def mock_config():
    """Create a mock config object with test data"""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        mock_import.return_value = (
            {
                "common": {
                    "server-dns": "localhost",
                    "path": "/test/path",
                    "resources": {
                        "cpus": 4,
                        "mem_limit": "4G",
                        "pids_limit": 4960,
                        "shm_size": "512m",
                    },
                },
                "users": [
                    {"username": "username1", "email": "test@example.com"},
                ],
            },
            None,
        )
        yield config.Config()
