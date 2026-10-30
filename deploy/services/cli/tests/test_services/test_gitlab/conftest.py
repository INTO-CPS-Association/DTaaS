"""Shared fixtures for GitLab service tests."""

import re
from unittest.mock import Mock, MagicMock
import pytest
from dtaas_services.pkg.services.gitlab import app_script, tokens_file
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


@pytest.fixture
def tokens_path(mocker, tmp_path):
    """Put the project base dir, so config/gitlab_tokens.json, in tmp_path."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    return tmp_path / "config" / "gitlab_tokens.json"


def ruby_payload(script):
    """Return the JSON text the apps script hands to JSON.parse, as Ruby reads it."""
    literal = script.removeprefix(app_script.APPS_SCRIPT_HEAD)
    literal = literal.removesuffix(app_script.APPS_SCRIPT_TAIL)
    return re.sub(r"\\([\\'])", r"\1", literal)


def write_text(path, text):
    """Write text to path, creating its folder."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
