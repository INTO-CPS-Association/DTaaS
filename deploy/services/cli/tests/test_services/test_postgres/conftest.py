"""Shared fixtures for test_postgres tests"""

import pytest
from ..conftest import _create_mock_config_instance
# pylint: disable=redefined-outer-name

USER_MODULE = "dtaas_services.pkg.services.postgres.user_management"


@pytest.fixture
def mock_config(mocker):
    """Mock Config class"""
    mock = mocker.patch("dtaas_services.pkg.services.postgres.postgres.Config")
    mock_instance = _create_mock_config_instance()
    mock.return_value = mock_instance
    yield mock


@pytest.fixture(autouse=True)
def mock_user_config(mocker):
    """Mock Config class for user_management module"""
    mock = mocker.patch(f"{USER_MODULE}.Config")
    mock_instance = _create_mock_config_instance(
        extra_keys={
            "POSTGRES_USER": "dtaas_user",
            "POSTGRES_PASSWORD": "dtaas_secret",  # noqa: S105 # NOSONAR
            "POSTGRES_PORT": "5432",
        }
    )
    mock.return_value = mock_instance
    yield mock
