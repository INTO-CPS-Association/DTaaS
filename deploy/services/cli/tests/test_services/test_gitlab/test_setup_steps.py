"""Tests for individual GitLab setup pipeline steps."""

import json
import pytest
from dtaas_services.pkg.services.gitlab import setup
from tests.test_services.test_gitlab.conftest import TEST_TOKEN, TEST_PASSWORD
# pylint: disable=W0212, W0621

SETUP = "dtaas_services.pkg.services.gitlab.setup"


@pytest.fixture
def password_and_pat(mocker):
    """Mock the initial password read and the PAT creation."""
    return {
        "password": mocker.patch(
            f"{SETUP}._step_get_password", return_value=(True, TEST_PASSWORD)
        ),
        "pat": mocker.patch(f"{SETUP}._step_create_pat", return_value=(True, TEST_TOKEN)),
    }


def test_check_gitlab_health_success(mock_console, mock_docker, mocker):
    """Test health check step success."""
    mocker.patch(f"{SETUP}.is_gitlab_healthy", return_value="healthy")
    success, error = setup._check_gitlab_health(mock_console, mock_docker)
    assert success is True
    assert error == ""


def test_check_gitlab_health_not_ready(mock_console, mock_docker, mocker):
    """Test health check step when GitLab is still starting."""
    mocker.patch(f"{SETUP}.is_gitlab_healthy", return_value="starting")
    success, status = setup._check_gitlab_health(mock_console, mock_docker)
    assert success is False
    assert status == "starting"


@pytest.mark.parametrize(
    "result, expected",
    [((True, TEST_PASSWORD), (True, TEST_PASSWORD)), ((False, "gone"), (False, "gone"))],
)
def test_step_get_password(mock_console, mocker, result, expected):
    """The initial password or the read error is passed on"""
    mocker.patch(f"{SETUP}.get_initial_root_password", return_value=result)
    assert setup._step_get_password(mock_console) == expected


@pytest.mark.parametrize(
    "result, expected",
    [((True, TEST_TOKEN), (True, TEST_TOKEN)), ((False, "api"), (False, "api"))],
)
def test_step_create_pat(mock_console, mocker, result, expected):
    """The PAT or the creation error is passed on"""
    mocker.patch(f"{SETUP}.create_pat", return_value=result)
    assert setup._step_create_pat(mock_console) == expected


@pytest.mark.parametrize(
    "first_install, expected",
    [
        (True, {"root_password": TEST_PASSWORD, "personal_access_token": TEST_TOKEN}),
        (False, {"personal_access_token": TEST_TOKEN}),
    ],
)
def test_step_password_and_pat_saves_right_away(
    mock_console, password_and_pat, tokens_path, first_install, expected
):
    """The PAT (and on a first install the initial password) is saved at once"""
    success, _ = setup._step_password_and_pat(mock_console, first_install)
    assert success is True
    assert json.loads(tokens_path.read_text(encoding="utf-8")) == expected
    assert password_and_pat["password"].called is first_install


@pytest.mark.parametrize(
    "failing, created", [("password", False), ("pat", True)]
)
def test_step_password_and_pat_failure_saves_nothing(
    mock_console, password_and_pat, tokens_path, failing, created
):
    """A failed read stops before the PAT; a failed PAT saves nothing"""
    password_and_pat[failing].return_value = (False, f"{failing} error")
    result = setup._step_password_and_pat(mock_console, True)
    assert result == (False, f"{failing} error")
    assert password_and_pat["pat"].called is created
    assert not tokens_path.exists()
