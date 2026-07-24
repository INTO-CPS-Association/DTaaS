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
        yield {"add": mock_add, "delete": mock_delete, "config": mock_cfg}


def test_delete_user_success(runner, mock_user_pkg):
    """Test successful user deletion"""
    mock_user_pkg["delete"].return_value = None

    result = runner.invoke(dtaas, ["user", "delete", "alice", "bob"])
    assert result.exit_code == 0
    assert "Users deleted successfully" in result.output
    mock_user_pkg["delete"].assert_called_once_with(["alice", "bob"], dry_run=False)


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


def test_delete_users_rejects_names_and_file(runner, tmp_path):
    """Passing both USERNAMES and --file is rejected."""
    csv_file = tmp_path / "users.csv"
    csv_file.write_text("username,email\nalice,a@x.io\n")

    result = runner.invoke(dtaas, ["user", "delete", "alice", "--file", str(csv_file)])

    assert result.exit_code != 0
    assert "either USERNAMES or --file" in result.output


def test_delete_users_requires_names_or_file(runner):
    """A bare delete with no USERNAMES and no --file is rejected."""
    result = runner.invoke(dtaas, ["user", "delete"])

    assert result.exit_code != 0
    assert "Provide one or more USERNAMES" in result.output


def test_add_users_config_error(runner):
    """add command raises ClickException when Config() fails"""
    with patch("src.cmd_utils.configPkg.Config", side_effect=RuntimeError("no config")):
        result = runner.invoke(dtaas, ["user", "add"])

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
        result = runner.invoke(dtaas, ["user", "add", "alice", "--email", "a@x.io"])

    assert result.exit_code != 0
    mock_stage.assert_not_called()


def test_add_users_with_file(runner, mock_user_pkg, tmp_path):
    """add --file stages the CSV then provisions."""
    mock_user_pkg["add"].return_value = None
    csv_file = tmp_path / "users.csv"
    csv_file.write_text("username,email,groups,load_balance\nalice,a@x.io,g,true\n")

    with patch("src.cmd_user.stage_users_for_add") as mock_stage:
        result = runner.invoke(dtaas, ["user", "add", "--file", str(csv_file)])

    assert result.exit_code == 0
    mock_stage.assert_called_once_with(
        UserAddInput(None, str(csv_file), None, (), True)
    )
    mock_user_pkg["add"].assert_called_once()


def test_add_single_user(runner, mock_user_pkg):
    """add USERNAME --email stages one user then provisions."""
    mock_user_pkg["add"].return_value = None

    with patch("src.cmd_user.stage_users_for_add") as mock_stage:
        result = runner.invoke(dtaas, ["user", "add", "alice", "--email", "a@x.io"])

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
        result = runner.invoke(dtaas, ["user", "add", "--file", str(csv_file)])

    assert result.exit_code != 0
    assert "Error importing users file" in result.output


@pytest.fixture
def mock_users_lifecycle_pkg():
    """Mock the users_lifecycle package functions used by pause/stop/resume."""
    with patch("src.cmd_user.usersLifecyclePkg.pause_users") as mock_pause, patch(
        "src.cmd_user.usersLifecyclePkg.stop_users"
    ) as mock_stop, patch("src.cmd_user.usersLifecyclePkg.resume_users") as mock_resume:
        yield {"pause": mock_pause, "stop": mock_stop, "resume": mock_resume}


@pytest.mark.parametrize(
    "verb,fn,verb_past",
    [
        ("pause", "pause", "paused"),
        ("stop", "stop", "stopped"),
        ("resume", "resume", "resumed"),
    ],
)
def test_lifecycle_command_success(
    runner, mock_users_lifecycle_pkg, verb, fn, verb_past
):
    """pause/stop/resume report success and forward the resolved usernames."""
    mock_users_lifecycle_pkg[fn].return_value = (["alice"], [], [])

    result = runner.invoke(dtaas, ["user", verb, "alice"])

    assert result.exit_code == 0
    assert f"alice {verb_past} successfully" in result.output
    mock_users_lifecycle_pkg[fn].assert_called_once_with(["alice"])


def test_pause_reports_unregistered_and_not_provisioned(
    runner, mock_users_lifecycle_pkg
):
    """pause reports each skipped username with the reason, then any successes."""
    mock_users_lifecycle_pkg["pause"].return_value = (["alice"], ["ghost"], ["bob"])

    result = runner.invoke(dtaas, ["user", "pause", "alice", "bob", "ghost"])

    assert result.exit_code == 0
    assert "'ghost' is not a registered user, skipping" in result.output
    assert "'bob' is not currently provisioned, skipping" in result.output
    assert "alice paused successfully" in result.output


def test_pause_with_file(runner, mock_users_lifecycle_pkg, tmp_path):
    """pause --file bulk-targets the usernames listed in a CSV."""
    mock_users_lifecycle_pkg["pause"].return_value = (["alice", "bob"], [], [])
    csv_file = tmp_path / "users.csv"
    csv_file.write_text("username,email\nalice,a@x.io\nbob,b@x.io\n")

    result = runner.invoke(dtaas, ["user", "pause", "--file", str(csv_file)])

    assert result.exit_code == 0
    mock_users_lifecycle_pkg["pause"].assert_called_once_with(["alice", "bob"])


def test_stop_rejects_starting_user(
    runner, mock_users_lifecycle_pkg, tmp_path, monkeypatch
):
    """Targeting a dtaas.toml starting user is rejected before any compose call."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text('[[users]]\nusername="alice"\n')

    result = runner.invoke(dtaas, ["user", "stop", "alice"])

    assert result.exit_code != 0
    assert "Cannot stop starting user" in result.output
    mock_users_lifecycle_pkg["stop"].assert_not_called()


def test_resume_requires_names_or_file(runner):
    """A bare resume with no USERNAMES and no --file is rejected, naming --all
    as the third way to supply a target."""
    result = runner.invoke(dtaas, ["user", "resume"])

    assert result.exit_code != 0
    assert "Provide one or more USERNAMES" in result.output
    assert "--all" in result.output


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


def test_user_status_single_user(runner):
    """user status USERNAME reports just that user."""
    with patch(
        "src.cmd_user.lifecyclePkg.collect_status", return_value=_STATUS_ROWS
    ), patch("src.cmd_user.registryPkg.load_registry", return_value=_REGISTRY):
        result = runner.invoke(dtaas, ["user", "status", "alice"])

    assert result.exit_code == 0
    assert "alice" in result.output
    assert "bob" not in result.output


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


def test_user_pause_all_targets_registry(runner, mock_users_lifecycle_pkg):
    """user pause --all targets every registry user."""
    mock_users_lifecycle_pkg["pause"].return_value = (["alice", "bob"], [], [])
    with patch("src.cmd_user.registryPkg.load_registry", return_value=_REGISTRY):
        result = runner.invoke(dtaas, ["user", "pause", "--all"])

    assert result.exit_code == 0
    mock_users_lifecycle_pkg["pause"].assert_called_once_with(["alice", "bob"])


def test_user_stop_all_and_targets_rejected(runner):
    """--all combined with explicit USERNAMES is rejected."""
    result = runner.invoke(dtaas, ["user", "stop", "alice", "--all"])

    assert result.exit_code != 0
    assert "not both" in result.output


def test_user_resume_all_empty_registry(runner):
    """user resume --all with an empty registry is a friendly no-op."""
    with patch("src.cmd_user.registryPkg.load_registry", return_value={}):
        result = runner.invoke(dtaas, ["user", "resume", "--all"])

    assert result.exit_code == 0
    assert "No additional users to act on." in result.output
