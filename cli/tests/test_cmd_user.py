"""Tests for the 'user add'/'user delete' CLI commands (cmd_user.py)."""

from unittest.mock import patch, MagicMock
import pytest
from click.testing import CliRunner
from src.cmd import dtaas
from src.cmd_utils import UserAddInput
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
        yield {"add": mock_add, "delete": mock_delete, "config": mock_cfg}


def test_delete_user_success(runner, mock_user_pkg):
    """Test successful user deletion"""
    mock_user_pkg["delete"].return_value = None

    result = runner.invoke(dtaas, ["admin", "user", "delete", "alice", "bob"])
    assert result.exit_code == 0
    assert "Users deleted successfully" in result.output
    mock_user_pkg["delete"].assert_called_once_with(["alice", "bob"], dry_run=False)


def test_delete_user_dry_run(runner, mock_user_pkg):
    """delete --dry-run previews without deleting and prints the dry-run message."""
    mock_user_pkg["delete"].return_value = None

    result = runner.invoke(dtaas, ["admin", "user", "delete", "alice", "--dry-run"])

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

    result = runner.invoke(dtaas, ["admin", "user", "delete", "--file", str(csv_file)])

    assert result.exit_code == 0
    mock_user_pkg["delete"].assert_called_once_with(["alice", "bob"], dry_run=False)


def test_delete_users_rejects_names_and_file(runner, tmp_path):
    """Passing both USERNAMES and --file is rejected."""
    csv_file = tmp_path / "users.csv"
    csv_file.write_text("username,email\nalice,a@x.io\n")

    result = runner.invoke(
        dtaas, ["admin", "user", "delete", "alice", "--file", str(csv_file)]
    )

    assert result.exit_code != 0
    assert "either USERNAMES or --file" in result.output


def test_delete_users_requires_names_or_file(runner):
    """A bare delete with no USERNAMES and no --file is rejected."""
    result = runner.invoke(dtaas, ["admin", "user", "delete"])

    assert result.exit_code != 0
    assert "Provide one or more USERNAMES" in result.output


def test_add_users_config_error(runner):
    """add command raises ClickException when Config() fails"""
    with patch("src.cmd_utils.configPkg.Config", side_effect=RuntimeError("no config")):
        result = runner.invoke(dtaas, ["admin", "user", "add"])

    assert result.exit_code != 0
    assert "no config" in result.output


def test_add_users_config_error_does_not_stage_registry(runner):
    """A failed Config() load must not write to the registry first.

    stage_users_for_add runs inside the action passed to run_user_command, so
    it only executes once Config() has already succeeded -- a bad dtaas.toml
    never leaves a partially-updated registry behind.
    """
    with patch(
        "src.cmd_utils.configPkg.Config", side_effect=RuntimeError("no config")
    ), patch("src.cmd_user.stage_users_for_add") as mock_stage:
        result = runner.invoke(
            dtaas, ["admin", "user", "add", "alice", "--email", "a@x.io"]
        )

    assert result.exit_code != 0
    mock_stage.assert_not_called()


def test_add_users_with_file(runner, mock_user_pkg, tmp_path):
    """add --file stages the CSV then provisions."""
    mock_user_pkg["add"].return_value = None
    csv_file = tmp_path / "users.csv"
    csv_file.write_text("username,email,groups,load_balance\nalice,a@x.io,g,true\n")

    with patch("src.cmd_user.stage_users_for_add") as mock_stage:
        result = runner.invoke(dtaas, ["admin", "user", "add", "--file", str(csv_file)])

    assert result.exit_code == 0
    mock_stage.assert_called_once_with(
        UserAddInput(None, str(csv_file), None, (), True)
    )
    mock_user_pkg["add"].assert_called_once()


def test_add_single_user(runner, mock_user_pkg):
    """add USERNAME --email stages one user then provisions."""
    mock_user_pkg["add"].return_value = None

    with patch("src.cmd_user.stage_users_for_add") as mock_stage:
        result = runner.invoke(
            dtaas, ["admin", "user", "add", "alice", "--email", "a@x.io"]
        )

    assert result.exit_code == 0
    mock_stage.assert_called_once_with(UserAddInput("alice", None, "a@x.io", (), True))
    mock_user_pkg["add"].assert_called_once()


def test_add_users_file_import_error(runner, mock_user_pkg, tmp_path):
    """A malformed users file surfaces as a ClickException."""
    csv_file = tmp_path / "users.csv"
    csv_file.write_text("no-username-column\n")

    with patch(
        "src.cmd_utils.registryPkg.read_csv_users", side_effect=KeyError("username")
    ):
        result = runner.invoke(dtaas, ["admin", "user", "add", "--file", str(csv_file)])

    assert result.exit_code != 0
    assert "Error importing users file" in result.output
