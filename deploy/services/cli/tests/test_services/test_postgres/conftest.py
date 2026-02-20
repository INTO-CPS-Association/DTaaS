"""Shared fixtures for test_postgres tests"""

import pytest
from ..conftest import _create_mock_config_instance
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_config(mocker):
    """Mock Config class"""
    mock = mocker.patch("dtaas_services.pkg.services.postgres.postgres.Config")
    mock_instance = _create_mock_config_instance()
    mock.return_value = mock_instance
    yield mock
