"""Shared fixtures for test_services tests"""

from pathlib import Path
from unittest.mock import Mock
import pytest
# pylint: disable=redefined-outer-name


def _create_mock_config_instance(extra_keys=None):
    """Create a mock config instance with common environment values.

    Args:
        extra_keys: Optional dict of additional keys to include in get_value
    """
    config_dict = {
        "HOSTNAME": "test.example.com",
        "POSTGRES_UID": "999",
        "POSTGRES_GID": "999",
    }
    if extra_keys:
        config_dict.update(extra_keys)

    mock_instance = Mock()
    mock_instance.get_value.side_effect = lambda key: config_dict.get(key, "default")
    mock_instance.get_base_dir = Mock(return_value=Path("/test/base"))
    return mock_instance


@pytest.fixture
def mock_docker():
    """Mock Docker client"""
    mock = Mock()
    mock.execute = Mock()
    mock.compose = Mock()
    return mock


@pytest.fixture
def mock_console():
    """Mock Rich console"""
    return Mock()
