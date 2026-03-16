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


def _setup_thingsboard_error_test(mocker, error_type, error_msg):
    """Setup common mocks for ThingsBoard error handling tests.

    Args:
        mocker: pytest-mock fixture
        error_type: Exception class to raise
        error_msg: Error message for the exception

    Returns:
        None (mocks are patches in place)
    """
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._run_credential_setup",
        side_effect=error_type(error_msg),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
