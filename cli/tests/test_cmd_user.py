"""Tests for the 'user add'/'user delete' CLI commands (cmd_user.py)."""

from unittest.mock import patch, MagicMock
import pytest
from click.testing import CliRunner
from src.cmd import dtaas
from src.cmd_user_utils import UserAddInput
# pylint: disable=redefined-outer-name


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_user_pkg():
    """Mock user package functions and Config to avoid filesystem dependency"""
    with patch("src.cmd_user.userPkg.add_users") as mock_add, patch(
        "src.cmd_user.userPkg.delete_users"
    ) as mock_delete, patch("src.cmd_utils.configPkg.Config") as mock_cfg:
        mock_cfg.return_value = MagicMock()
        mock_cfg.return_value.get_gitlab_provision.return_value = (False, None)
        yield {"add": mock_add, "delete": mock_delete, "config": mock_cfg}


def test_delete_user_error(runner, mock_user_pkg):
    """A delete_users failure surfaces as a ClickException."""
    mock_user_pkg["delete"].return_value = "daemon down"

    result = runner.invoke(dtaas, ["user", "delete", "alice"])

    assert result.exit_code != 0
    assert "Error while deleting users: daemon down" in result.output


def test_delete_user_dry_run(runner, mock_user_pkg):
    """delete --dry-run previews without deleting and prints the dry-run message."""
    mock_user_pkg["delete"].return_value = None

    result = runner.invoke(dtaas, ["user", "delete", "alice", "--dry-run"])

    assert result.exit_code == 0
    assert "Dry run complete" in result.output
    mock_user_pkg["delete"].assert_called_once_with(["alice"], dry_run=True)


def test_delete_users_with_file(runner, mock_user_pkg, tmp_path):
    """delete --file bulk-deletes the usernames listed in a CSV."""
    mock_user_pkg["delete"].return_value = None
    csv_file = tmp_path / "users.csv"
    csv_file.write_text(
        "username,email,groups,load_balance\n"
        "alice,a@x.io,g,true\n"
        "bob,b@x.io,g,false\n"
    )

    result = runner.invoke(dtaas, ["user", "delete", "--file", str(csv_file)])

    assert result.exit_code == 0
    mock_user_pkg["delete"].assert_called_once_with(["alice", "bob"], dry_run=False)


def test_add_users_gitlab_provision_check_error(runner, mock_user_pkg):
    """A get_gitlab_provision() error surfaces as a ClickException."""
    mock_user_pkg["config"].return_value.get_gitlab_provision.return_value = (
        False,
        Exception("bad gitlab section"),
    )

    result = runner.invoke(dtaas, ["user", "add", "alice", "--email", "a@x.io"])

    assert result.exit_code != 0
    assert "Error while adding users: bad gitlab section" in result.output


def test_add_single_user_prompts_for_password_when_provisioning(runner, mock_user_pkg):
    """A single-user add with GitLab provisioning enabled and no --password prompts
    for one interactively (hidden input, confirmed)."""
    mock_user_pkg["add"].return_value = None
    mock_user_pkg["config"].return_value.get_gitlab_provision.return_value = (True, None)

    with patch("src.cmd_user.stage_users_for_add") as mock_stage:
        mock_stage.return_value = (["alice"], {"alice": "S3cur3-p4ss"})
        result = runner.invoke(
            dtaas,
            ["user", "add", "alice", "--email", "a@x.io"],
            input="S3cur3-p4ss\nS3cur3-p4ss\n",
        )

    assert result.exit_code == 0
    staged_input = mock_stage.call_args[0][0]
    assert staged_input.password == "S3cur3-p4ss"


_STATUS_ROWS = [
    {"project": "deployment", "service": "traefik", "state": "running", "health": None},
    {"project": "users", "service": "alice", "state": "running", "health": None},
    {"project": "users", "service": "bob", "state": "paused", "health": None},
]
_REGISTRY = {"alice": {}, "bob": {}}


def test_user_status_filters_to_user_containers(runner):
    """user status narrows the platform view to the per-user containers only."""
    with patch(
        "src.cmd_user.lifecyclePkg.collect_status", return_value=_STATUS_ROWS
    ), patch("src.cmd_user.registryPkg.load_registry", return_value=_REGISTRY):
        result = runner.invoke(dtaas, ["user", "status"])

    assert result.exit_code == 0
    assert "alice" in result.output
    assert "bob" in result.output
    assert "traefik" not in result.output


def test_user_status_unknown_user_rejected(runner):
    """A USERNAME not in the registry is rejected (distinguishable from stopped)."""
    with patch("src.cmd_user.registryPkg.load_registry", return_value=_REGISTRY):
        result = runner.invoke(dtaas, ["user", "status", "ghost"])

    assert result.exit_code != 0
    assert "'ghost' is not a registered user" in result.output


def test_user_status_registered_but_not_provisioned(runner):
    """A registered user with no container reads as not-provisioned, not absent."""
    with patch(
        "src.cmd_user.lifecyclePkg.collect_status", return_value=_STATUS_ROWS
    ), patch("src.cmd_user.registryPkg.load_registry", return_value={"carol": {}}):
        result = runner.invoke(dtaas, ["user", "status", "carol"])

    assert result.exit_code == 0
    assert "'carol' is registered but not currently provisioned." in result.output


def test_user_status_maps_missing_deployment_to_error(runner):
    """A missing deployment surfaces as a non-zero ClickException."""
    with patch(
        "src.cmd_user.lifecyclePkg.collect_status",
        side_effect=OSError("No 'docker-compose.yml' found"),
    ):
        result = runner.invoke(dtaas, ["user", "status"])

    assert result.exit_code != 0
    assert "docker-compose.yml" in result.output
