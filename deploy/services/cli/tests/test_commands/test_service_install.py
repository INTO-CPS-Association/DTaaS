"""Tests for the service install command and its helpers"""

import click
import pytest
from dtaas_services.cmd import services
from dtaas_services.commands.install_helpers import resolve_install_targets
# pylint: disable=W0621

INSTALL = ["service", "install"]
HELPERS = "dtaas_services.commands.install_helpers"


@pytest.fixture
def gitlab_started(mock_service_setup):
    """Service mock whose containers start successfully"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "GitLab started",
    )
    return mock_service_setup


@pytest.fixture
def mock_setup_gitlab(mocker):
    """Mock the GitLab post-install setup"""
    return mocker.patch(f"{HELPERS}.setup_gitlab")


@pytest.mark.parametrize(
    "service_list, expected",
    [
        (None, ["thingsboard", "gitlab"]),
        (["gitlab"], ["gitlab"]),
        (["gitlab", "ThingsBoard"], ["gitlab", "thingsboard"]),
        (["thingsboard-ce", "thingsboard", "gitlab"], ["thingsboard", "gitlab"]),
    ],
)
def test_resolve_install_targets(service_list, expected):
    """Selections map to install flows in order, without duplicates"""
    assert resolve_install_targets(service_list) == expected


def test_resolve_install_targets_unsupported():
    """Unsupported names are all listed in the error"""
    with pytest.raises(click.ClickException, match="mysql, redis"):
        resolve_install_targets(["gitlab", "mysql", "redis"])


@pytest.mark.parametrize("selector", ["mysql", "gitlab,mysql"])
def test_install_invalid_service(runner, mock_service_setup, selector):
    """Test install command with unsupported service name"""
    result = runner.invoke(services, INSTALL + ["-s", selector])
    assert result.exit_code != 0
    assert "Installation is supported for ThingsBoard and GitLab" in result.output
    mock_service_setup["service_instance"].manage_services.assert_not_called()


def test_install_postgres_start_fails(runner, mock_service_setup):
    """Test install command when postgres start fails"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        RuntimeError("Start failed"),
        "Failed to start PostgreSQL",
    )
    result = runner.invoke(services, INSTALL)
    assert result.exit_code != 0
    assert "Failed to start PostgreSQL" in result.output


@pytest.mark.parametrize(
    "error, expected",
    [
        (FileNotFoundError("Config not found"), "Config not found"),
        (RuntimeError("Unexpected error"), "Installation failed"),
    ],
)
def test_install_service_init_errors(runner, mocker, error, expected):
    """Test install command when Service init raises"""
    mocker.patch("dtaas_services.commands.service_ops.check_root_unix")
    mocker.patch("dtaas_services.commands.service_ops.Service", side_effect=error)
    result = runner.invoke(services, INSTALL)
    assert result.exit_code != 0
    assert expected in result.output


@pytest.mark.usefixtures("gitlab_started")
@pytest.mark.parametrize("selector", [["-s", "gitlab"], ["--service", "gitlab"]])
def test_install_gitlab_success(runner, mock_setup_gitlab, selector):
    """Test successful GitLab install with the new and the legacy selector"""
    mock_setup_gitlab.return_value = (True, "GitLab setup completed")
    result = runner.invoke(services, INSTALL + selector)
    assert result.exit_code == 0
    assert "GitLab setup completed" in result.output
    mock_setup_gitlab.assert_called_once()


@pytest.mark.usefixtures("gitlab_started")
@pytest.mark.parametrize(
    "setup_result, succeeds, expected",
    [
        ((False, "starting"), True, "service status -s gitlab"),
        ((False, "OAuth app creation failed"), False, "OAuth app creation failed"),
    ],
)
def test_install_gitlab_setup_outcomes(
    runner, mock_setup_gitlab, setup_result, succeeds, expected
):
    """GitLab not ready prints a hint; other setup failures exit non zero"""
    mock_setup_gitlab.return_value = setup_result
    result = runner.invoke(services, INSTALL + ["-s", "gitlab"])
    assert (result.exit_code == 0) is succeeds
    assert expected in result.output


def test_install_gitlab_start_fails(runner, mock_service_setup):
    """Test install GitLab when it fails to start"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        RuntimeError("Start failed"),
        "Failed to start GitLab",
    )
    result = runner.invoke(services, INSTALL + ["-s", "gitlab"])
    assert result.exit_code != 0
    assert "Failed to start GitLab" in result.output


def test_install_runs_selected_services_in_order(runner, mocker, mock_service_setup):
    """A comma list installs each selected service once, in the given order"""
    calls = []
    mocker.patch(
        f"{HELPERS}._install_thingsboard",
        side_effect=lambda *_: calls.append("thingsboard"),
    )
    mocker.patch(
        f"{HELPERS}._install_gitlab", side_effect=lambda *_: calls.append("gitlab")
    )
    result = runner.invoke(services, INSTALL + ["-s", "gitlab,thingsboard-ce,thingsboard"])
    assert result.exit_code == 0
    assert calls == ["gitlab", "thingsboard"]
    assert mock_service_setup["service"].called
