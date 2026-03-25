"""Shared fixtures for GitLab service tests."""

from unittest.mock import Mock, MagicMock
import pytest
from dtaas_services.pkg.services.gitlab.app_token import OAuthAppResult

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_PASSWORD = "RootPass123"  # noqa: S105 # NOSONAR


@pytest.fixture
def mock_console():
    """Mock Rich console."""
    console = Mock()
    console.status = MagicMock()
    return console


@pytest.fixture
def mock_docker():
    """Mock Docker client."""
    return Mock()


@pytest.fixture
def sample_server_result():
    """Sample server OAuth app result."""
    return OAuthAppResult(
        application_id=1, name="Server App", client_id="s-cid", client_secret="s-sec"
    )


@pytest.fixture
def sample_client_result():
    """Sample client OAuth app result."""
    return OAuthAppResult(
        application_id=2, name="Client App", client_id="c-cid", client_secret="c-sec"
    )
