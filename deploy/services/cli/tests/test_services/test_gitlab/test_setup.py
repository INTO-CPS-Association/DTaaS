"""Tests for GitLab setup prerequisite steps and full flow."""

from dtaas_services.pkg.services.gitlab import setup
from tests.test_services.test_gitlab.conftest import TEST_TOKEN, TEST_PASSWORD
# pylint: disable=W0212, W0621


def test_run_prereq_steps_success(mock_console, mock_docker, mocker):
    """Test all prerequisite steps succeed."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._check_gitlab_health",
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
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_reset_root_password",
        return_value=(True, "Root password updated"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_remove_root_password_from_tokens",
        return_value=(True, "backed up"),
    )
    success, msg = setup.setup_gitlab(mock_console, mock_docker)
    assert success is True
    assert "completed successfully" in msg


def test_setup_gitlab_fails_on_password_reset_failure(
    mock_console, mock_docker, mocker
):
    """Test setup_gitlab fails when root password reset fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._run_prereq_steps",
        return_value=(True, TEST_PASSWORD, TEST_TOKEN, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._setup_tokens_phase",
        return_value=(True, "saved"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_reset_root_password",
        return_value=(False, "API error"),
    )
    success, msg = setup.setup_gitlab(mock_console, mock_docker)
    assert success is False
    assert "Root password reset failed" in msg


def test_setup_gitlab_fails_on_token_cleanup_failure(mock_console, mock_docker, mocker):
    """Test setup_gitlab fails when root password removal from tokens fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._run_prereq_steps",
        return_value=(True, TEST_PASSWORD, TEST_TOKEN, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._setup_tokens_phase",
        return_value=(True, "saved"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_reset_root_password",
        return_value=(True, "Root password updated"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._step_remove_root_password_from_tokens",
        return_value=(False, "file error"),
    )
    success, msg = setup.setup_gitlab(mock_console, mock_docker)
    assert success is False
    assert "remove root password from tokens" in msg
