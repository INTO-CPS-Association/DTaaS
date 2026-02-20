"""Shared fixtures for test_postgres tests"""

from unittest.mock import patch
import pytest
from ..conftest import _create_mock_config_instance
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.services.postgres.postgres.Config") as mock:
        mock_instance = _create_mock_config_instance()
        mock.return_value = mock_instance
        yield mock
