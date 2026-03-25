"""Tests for token saving and root password removal (setup.py token steps)."""

import json
from pathlib import Path
from dtaas_services.pkg.services.gitlab import setup
from tests.test_services.test_gitlab.conftest import TEST_TOKEN, TEST_PASSWORD
# pylint: disable=W0212, W0621


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
    success, _ = setup._step_save_tokens(mock_console, TEST_PASSWORD, results)
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
    success, _ = setup._step_save_tokens(mock_console, TEST_PASSWORD, results)
    assert success is False


def test_step_remove_root_password_success(mock_console, mocker, tmp_path):
    """Test remove root password step success."""
    tokens_path = tmp_path / "config" / "gitlab_tokens.json"
    tokens_path.parent.mkdir(parents=True)
    tokens_path.write_text(
        '{"root_password": "secret", "personal_access_token": "tok"}',
        encoding="utf-8",
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._get_tokens_output_path",
        return_value=tokens_path,
    )
    success, _ = setup._step_remove_root_password_from_tokens(mock_console)
    assert success is True
    data = json.loads(tokens_path.read_text(encoding="utf-8"))
    assert "root_password" not in data
    backup_path = tokens_path.parent / "backup_gitlab_tokens.json"
    backup_data = json.loads(backup_path.read_text(encoding="utf-8"))
    assert backup_data["root_password"] == "secret"


def test_step_remove_root_password_failure(mock_console, mocker):
    """Test remove root password step when tokens file is missing."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.setup._get_tokens_output_path",
        return_value=Path("/nonexistent/gitlab_tokens.json"),
    )
    success, msg = setup._step_remove_root_password_from_tokens(mock_console)
    assert success is False
    assert "Failed to update tokens file" in msg
