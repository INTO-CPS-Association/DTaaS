"""Shared fixtures for test_thingsboard tests"""

from unittest.mock import patch
import pytest
from ..conftest import _create_mock_config_instance


@pytest.fixture
def mock_config():
    """Mock Config class for any module"""
    # Patch both the permissions and setup modules
    with patch(
        "dtaas_services.pkg.services.thingsboard.permissions.Config"
    ) as mock1, patch("dtaas_services.pkg.services.thingsboard.setup.Config") as mock2:
        mock_instance = _create_mock_config_instance(
            {
                "THINGSBOARD_UID": "1000",
                "THINGSBOARD_GID": "1000",
            }
        )
        mock1.return_value = mock_instance
        mock2.return_value = mock_instance
        yield mock1  # Return the first one for the test
