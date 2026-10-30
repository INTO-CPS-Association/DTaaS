"""Tests for token saving and root password removal (setup.py token steps)."""

import json
from pathlib import Path
from dtaas_services.pkg.services.gitlab import setup
from tests.test_services.test_gitlab.conftest import TEST_TOKEN, write_text
# pylint: disable=W0212, W0621

SETUP = "dtaas_services.pkg.services.gitlab.setup"


def test_step_save_tokens_success(mock_console, tokens_path):
    """Saved fields land in the tokens file and the save is reported"""
    success, msg = setup._step_save_tokens(
        mock_console, {"personal_access_token": TEST_TOKEN}
    )
    assert (success, msg) == (True, f"Tokens saved to {tokens_path}")
    mock_console.print.assert_called_once()


def test_step_save_tokens_failure(mocker, mock_console):
    """A failed save is returned and not reported as saved"""
    mocker.patch(f"{SETUP}.merge_tokens", return_value=(False, "Permission denied"))
    assert setup._step_save_tokens(mock_console, {}) == (False, "Permission denied")
    mock_console.print.assert_not_called()


def test_step_remove_root_password_success(mock_console, tokens_path):
    """The initial password moves to the backup file"""
    write_text(
        tokens_path, '{"root_password": "secret", "personal_access_token": "tok"}'
    )
    success, _ = setup._step_remove_root_password_from_tokens(mock_console)
    assert success is True
    data = json.loads(tokens_path.read_text(encoding="utf-8"))
    assert "root_password" not in data
    backup_path = tokens_path.parent / "backup_gitlab_tokens.json"
    backup_data = json.loads(backup_path.read_text(encoding="utf-8"))
    assert backup_data["root_password"] == "secret"


def test_step_remove_root_password_failure(mocker, mock_console):
    """Test remove root password step when tokens file is missing."""
    mocker.patch(
        f"{SETUP}.get_tokens_path",
        return_value=Path("/nonexistent/gitlab_tokens.json"),
    )
    success, msg = setup._step_remove_root_password_from_tokens(mock_console)
    assert success is False
    assert "Failed to update tokens file" in msg
