"""Tests for individual GitLab setup pipeline steps."""

from dtaas_services.pkg.services.gitlab import setup
from tests.test_services.test_gitlab.conftest import TEST_TOKEN, TEST_PASSWORD
# pylint: disable=W0212, W0621


def test_check_gitlab_health_success(mock_console, mock_docker, mocker):
    """Test health check step success."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.is_gitlab_healthy",
        return_value="healthy",
    )
    success, error = setup._check_gitlab_health(mock_console, mock_docker)
    assert success is True
    assert error == ""


def test_check_gitlab_health_not_ready(mock_console, mock_docker, mocker):
    """Test health check step when GitLab is still starting."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup.is_gitlab_healthy",
        return_value="starting",
    )
    success, status = setup._check_gitlab_health(mock_console, mock_docker)
    assert success is False
    assert status == "starting"


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
