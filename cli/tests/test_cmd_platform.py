"""Tests for the 'platform' CLI commands (cmd_platform.py)."""

from unittest.mock import patch
import pytest
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_deploy_pkg():
    """Mock the deploy package handlers used by install/uninstall."""
    with patch("src.cmd_platform.deployPkg.install") as mock_install, patch(
        "src.cmd_utils.deployPkg.uninstall"
    ) as mock_uninstall, patch(
        "src.cmd_utils.deployPkg.installation_present", return_value=True
    ) as mock_present, patch(
        "src.cmd_platform.provision_user_files"
    ) as mock_provision, patch(
        "src.cmd_platform.provision_logger_dir"
    ) as mock_logger_dir:
        yield {
            "install": mock_install,
            "uninstall": mock_uninstall,
            "present": mock_present,
            "provision": mock_provision,
            "logger_dir": mock_logger_dir,
        }


def test_platform_install_success(runner, mock_deploy_pkg):
    """install reports success and forwards the default output dir."""
    result = runner.invoke(dtaas, ["platform", "install"])

    assert result.exit_code == 0
    assert "Deployment installed successfully" in result.output
    mock_deploy_pkg["install"].assert_called_once_with(".")
    mock_deploy_pkg["provision"].assert_called_once_with(".")
    mock_deploy_pkg["logger_dir"].assert_called_once_with(".")


def test_platform_install_error(runner, mock_deploy_pkg):
    """install converts an OSError into a ClickException."""
    mock_deploy_pkg["install"].side_effect = OSError("not generated")

    result = runner.invoke(dtaas, ["platform", "install"])

    assert result.exit_code != 0
    assert "not generated" in result.output


def test_platform_uninstall_remove_user_files_with_yes(runner, mock_deploy_pkg):
    """--remove-user-files with --yes skips the prompt and reports removal."""
    mock_deploy_pkg["uninstall"].return_value = "Removed user files at '/x/files'."

    result = runner.invoke(
        dtaas, ["platform", "uninstall", "--remove-user-files", "--yes"]
    )

    assert result.exit_code == 0
    assert "Removed user files" in result.output
    mock_deploy_pkg["uninstall"].assert_called_once_with(".", True)


def test_platform_uninstall_error(runner, mock_deploy_pkg):
    """uninstall converts an OSError into a ClickException."""
    mock_deploy_pkg["uninstall"].side_effect = OSError("daemon down")

    result = runner.invoke(dtaas, ["platform", "uninstall"])

    assert result.exit_code != 0
    assert "daemon down" in result.output


def test_platform_uninstall_removes_files_when_nothing_running(runner, mock_deploy_pkg):
    """--remove-user-files still deletes files when no containers are running."""
    mock_deploy_pkg["present"].return_value = False

    with patch("src.cmd_utils.deployPkg.require_compose_file") as mock_require, patch(
        "src.cmd_utils.deployPkg.delete_user_files",
        return_value="Removed user files at '/x/files'.",
    ) as mock_delete:
        result = runner.invoke(
            dtaas, ["platform", "uninstall", "--remove-user-files", "--yes"]
        )

    assert result.exit_code == 0
    assert "no existing DTaaS / Workspace installation" in result.output
    assert "Removed user files" in result.output
    mock_require.assert_called_once_with(".")
    mock_delete.assert_called_once_with(".")
    mock_deploy_pkg["uninstall"].assert_not_called()


def test_platform_update_certs_success(runner):
    """update --certs forwards the output dir and echoes the result message."""
    with patch(
        "src.cmd_utils.certUpdatePkg.update_certs", return_value="certs updated"
    ) as mock_update:
        result = runner.invoke(dtaas, ["platform", "update", "--certs"])

    assert result.exit_code == 0
    assert "certs updated" in result.output
    mock_update.assert_called_once_with(".")


def test_platform_update_config_success(runner):
    """update --config forwards the output dir (not dry-run) and echoes the result."""
    with patch(
        "src.cmd_utils.configUpdatePkg.update_config",
        return_value="Updated config/.env.",
    ) as mock_update:
        result = runner.invoke(dtaas, ["platform", "update", "--config"])

    assert result.exit_code == 0
    assert "Updated config/.env." in result.output
    mock_update.assert_called_once_with(".", False)


def test_platform_update_requires_a_flag(runner):
    """A bare update with neither --certs nor --config is rejected."""
    result = runner.invoke(dtaas, ["platform", "update"])

    assert result.exit_code != 0
    assert "Nothing to update" in result.output


@pytest.mark.parametrize("command", [["install"], ["update", "--config"]])
def test_platform_commands_reject_a_broken_compose_file(
    runner, broken_compose, command
):
    """A malformed docker-compose.yml ends in a clean error, not a traceback,
    and install never reaches docker compose."""
    directory, summary = broken_compose
    with patch("src.cmd_platform.deployPkg.install") as mock_install:
        result = runner.invoke(
            dtaas, ["platform", *command, "--output-dir", str(directory)]
        )

    assert result.exit_code == 1
    assert isinstance(result.exception, SystemExit)
    assert f"Error: {summary}" in result.output
    mock_install.assert_not_called()
