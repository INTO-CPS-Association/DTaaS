"""Tests for the 'user pause'/'stop'/'resume' CLI commands (cmd_user_lifecycle.py)."""

from unittest.mock import patch
import pytest
from click.testing import CliRunner
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_users_lifecycle_pkg():
    """Mock the users_lifecycle package functions used by pause/stop/resume."""
    with patch(
        "src.cmd_user_lifecycle.usersLifecyclePkg.pause_users"
    ) as mock_pause, patch(
        "src.cmd_user_lifecycle.usersLifecyclePkg.stop_users"
    ) as mock_stop, patch(
        "src.cmd_user_lifecycle.usersLifecyclePkg.resume_users"
    ) as mock_resume:
        yield {"pause": mock_pause, "stop": mock_stop, "resume": mock_resume}


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


def test_user_stop_all_and_targets_rejected(runner):
    """--all combined with explicit USERNAMES is rejected."""
    result = runner.invoke(dtaas, ["user", "stop", "alice", "--all"])

    assert result.exit_code != 0
    assert "not both" in result.output


def test_user_resume_all_empty_registry(runner):
    """user resume --all with an empty registry is a friendly no-op."""
    with patch(
        "src.cmd_user_lifecycle.registryPkg.load_registry", return_value={}
    ):
        result = runner.invoke(dtaas, ["user", "resume", "--all"])

    assert result.exit_code == 0
    assert "No additional users to act on." in result.output
