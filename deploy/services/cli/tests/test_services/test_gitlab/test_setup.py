"""Tests for GitLab post-install setup."""

import json
from pathlib import Path
from unittest.mock import Mock, MagicMock
import pytest
from dtaas_services.pkg.services.gitlab import setup
from dtaas_services.pkg.services.gitlab.app_token import OAuthAppResult
# pylint: disable=W0212, W0621

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


def test_save_tokens_success(tmp_path):
    """Test saving tokens to a JSON file."""
    tokens = setup.GitLabTokens(
        root_password=TEST_PASSWORD,
        personal_access_token=TEST_TOKEN,
        server_app={"id": 1},
        client_app={"id": 2},
    )
    output_path = tmp_path / "config" / "gitlab_tokens.json"
    success, _ = setup._save_tokens(tokens, output_path)
    assert success is True
    assert output_path.exists()
    data = json.loads(output_path.read_text(encoding="utf-8"))
    assert data["personal_access_token"] == TEST_TOKEN


def test_save_tokens_os_error(mocker):
    """Test saving tokens with OS error."""
    tokens = setup.GitLabTokens(
        root_password=TEST_PASSWORD,
        personal_access_token=TEST_TOKEN,
        server_app={},
        client_app={},
    )
    bad_path = Path("/nonexistent/dir/tokens.json")
    mocker.patch("pathlib.Path.mkdir", side_effect=OSError("Permission denied"))
    success, msg = setup._save_tokens(tokens, bad_path)
    assert success is False
    assert "Failed to save tokens" in msg


def test_get_tokens_output_path(mocker):
    """Test tokens output path construction."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.Config.get_base_dir",
        return_value=Path("/srv/dtaas"),
    )
    result = setup._get_tokens_output_path()
    assert result == Path("/srv/dtaas/config/gitlab_tokens.json")


def test_step_wait_for_health_success(mock_console, mock_docker, mocker):
    """Test health wait step success."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.wait_for_gitlab_ready",
        return_value=True,
    )
    success, error = setup._step_wait_for_health(mock_console, mock_docker)
    assert success is True
    assert error == ""


def test_step_get_password_success(mock_console, mocker):
    """Test password retrieval step success."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.get_initial_root_password",
        return_value=(True, TEST_PASSWORD),
    )
    success, pw = setup._step_get_password(mock_console)
    assert success is True
    assert pw == TEST_PASSWORD


def test_step_get_password_failure(mock_console, mocker):
    """Test password retrieval step failure."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.get_initial_root_password",
        return_value=(False, "file not found"),
    )
    success, msg = setup._step_get_password(mock_console)
    assert success is False
    assert "file not found" in msg


def test_step_create_pat_success(mock_console, mocker):
    """Test PAT creation step success."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.create_personal_access_token",
        return_value=(True, TEST_TOKEN),
    )
    success, token = setup._step_create_pat(mock_console)
    assert success is True
    assert token == TEST_TOKEN


def test_step_create_pat_failure(mock_console, mocker):
    """Test PAT creation step failure."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.create_personal_access_token",
        return_value=(False, "rails error"),
    )
    success, msg = setup._step_create_pat(mock_console)
    assert success is False
    assert "rails error" in msg


def test_step_create_oauth_apps_success(
    mock_console, mocker, sample_server_result, sample_client_result
):
    """Test OAuth app creation step success."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.create_server_application",
        return_value=(True, sample_server_result, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.create_client_application",
        return_value=(True, sample_client_result, ""),
    )
    success, srv, cli, error = setup._step_create_oauth_apps(mock_console, TEST_TOKEN)
    assert success is True
    assert srv is sample_server_result
    assert cli is sample_client_result
    assert error == ""


def test_step_create_oauth_apps_client_fails(
    mock_console, mocker, sample_server_result
):
    """Test OAuth app creation when client app fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.create_server_application",
        return_value=(True, sample_server_result, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.create_client_application",
        return_value=(False, None, "client error"),
    )
    success, _, _, error = setup._step_create_oauth_apps(mock_console, TEST_TOKEN)
    assert success is False
    assert "client error" in error


def test_step_save_tokens_success(
    mock_console, mocker, sample_server_result, sample_client_result, tmp_path
):
    """Test save tokens step success."""
    output_path = tmp_path / "tokens.json"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._get_tokens_output_path",
        return_value=output_path,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._save_tokens",
        return_value=(True, f"Tokens saved to {output_path}"),
    )
    results = {
        "pat": TEST_TOKEN,
        "server_result": sample_server_result,
        "client_result": sample_client_result,
    }
    success, _ = setup._step_save_tokens(
        mock_console,
        TEST_PASSWORD,
        results,
    )
    assert success is True


def test_step_save_tokens_failure(
    mock_console, mocker, sample_server_result, sample_client_result, tmp_path
):
    """Test save tokens step failure."""
    output_path = tmp_path / "readonly" / "tokens.json"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._get_tokens_output_path",
        return_value=output_path,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._save_tokens",
        return_value=(False, "Permission denied"),
    )
    results = {
        "pat": TEST_TOKEN,
        "server_result": sample_server_result,
        "client_result": sample_client_result,
    }
    success, _ = setup._step_save_tokens(
        mock_console,
        TEST_PASSWORD,
        results,
    )
    assert success is False


def test_run_prereq_steps_success(mock_console, mock_docker, mocker):
    """Test all prerequisite steps succeed."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_wait_for_health",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_get_password",
        return_value=(True, TEST_PASSWORD),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_create_pat",
        return_value=(True, TEST_TOKEN),
    )
    success, pw, pat, error = setup._run_prereq_steps(mock_console, mock_docker)
    assert success is True
    assert pw == TEST_PASSWORD
    assert pat == TEST_TOKEN
    assert error == ""


def test_setup_gitlab_success(
    mock_console, mock_docker, mocker, sample_server_result, sample_client_result
):
    """Test full setup_gitlab flow."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._run_prereq_steps",
        return_value=(True, TEST_PASSWORD, TEST_TOKEN, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_create_oauth_apps",
        return_value=(True, sample_server_result, sample_client_result, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_save_tokens",
        return_value=(True, "saved"),
    )
    success, msg = setup.setup_gitlab(mock_console, mock_docker)
    assert success is True
    assert "completed successfully" in msg
