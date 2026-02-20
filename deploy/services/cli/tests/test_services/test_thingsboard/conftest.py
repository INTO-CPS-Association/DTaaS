"""Shared fixtures for test_thingsboard tests"""

import pytest
from ..conftest import _create_mock_config_instance


@pytest.fixture
def mock_config(mocker):
    """Mock Config class for any module"""
    mock_instance = _create_mock_config_instance(
        {
            "THINGSBOARD_UID": "1000",
            "THINGSBOARD_GID": "1000",
        }
    )
    mock1 = mocker.patch("dtaas_services.pkg.services.thingsboard.permissions.Config")
    mock2 = mocker.patch("dtaas_services.pkg.services.thingsboard.setup.Config")
    mock1.return_value = mock_instance
    mock2.return_value = mock_instance
    return mock1  # Return the first one for the test
