"""Tests for CLI commands."""

from unittest.mock import patch, MagicMock
from pathlib import Path
import pytest
from click.testing import CliRunner
from python_on_whales.exceptions import DockerException
from src.cmd import dtaas
from src.pkg.cert_validate import CertValidationError
# pylint: disable=redefined-outer-name


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_user_pkg():
    """Mock user package functions and Config to avoid filesystem dependency"""
    with patch("src.cmd.userPkg.add_users") as mock_add, patch(
        "src.cmd.userPkg.delete_user"
    ) as mock_delete, patch("src.cmd_utils.configPkg.Config") as mock_cfg:
        mock_cfg.return_value = MagicMock()
        yield {"add": mock_add, "delete": mock_delete, "config": mock_cfg}


def test_delete_user_success(runner, mock_user_pkg):
    """Test successful user deletion"""
    mock_user_pkg["delete"].return_value = None

    result = runner.invoke(dtaas, ["admin", "user", "delete"])
    assert result.exit_code == 0
    assert "User deleted successfully" in result.output
    mock_user_pkg["delete"].assert_called_once()


def test_generate_project_success(runner):
    """Test successful project file generation with defaults"""
    with patch("src.cmd.projectPkg.generate_project") as mock_gen:
        result = runner.invoke(dtaas, ["generate-project"])

        assert result.exit_code == 0
        assert "Project files generated successfully" in result.output
        mock_gen.assert_called_once_with(".", False)


def test_generate_project_error(runner):
    """Test project generation propagates errors"""
    with patch("src.cmd.projectPkg.generate_project") as mock_gen:
        mock_gen.side_effect = OSError("Copy failed")

        result = runner.invoke(dtaas, ["generate-project"])

        assert result.exit_code != 0
        assert "Error while generating project" in result.output


def test_generate_deployment_without_config_prints_note(runner):
    """generate-deployment prints a note when dtaas.toml is absent"""
    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd_utils._find_toml", return_value=None
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    assert "Note:" in result.output


def test_generate_deployment_error(runner):
    """generate-deployment converts known exceptions to ClickException"""
    with patch("src.cmd.projectPkg.generate_deploy_project") as mock_gen:
        mock_gen.side_effect = RuntimeError("template missing")

        result = runner.invoke(
            dtaas, ["generate-deployment", "--type", "insecure-server"]
        )

        assert result.exit_code != 0
        assert "template missing" in result.output


def test_config_generate_success(runner):
    """config generate forwards output-dir/force and reports success when written."""
    with patch("src.cmd.projectPkg.generate_config", return_value=False) as mock_gen:
        result = runner.invoke(dtaas, ["admin", "config", "generate"])

    assert result.exit_code == 0
    assert "Configuration file generated successfully" in result.output
    mock_gen.assert_called_once_with(".", False)


def test_config_generate_skips_existing(runner):
    """When the file already exists, no misleading success message is printed."""
    with patch("src.cmd.projectPkg.generate_config", return_value=True):
        result = runner.invoke(dtaas, ["admin", "config", "generate"])

    assert result.exit_code == 0
    assert "Configuration file generated successfully" not in result.output


def test_config_generate_error(runner):
    """config generate converts an OSError into a ClickException."""
    with patch("src.cmd.projectPkg.generate_config", side_effect=OSError("disk full")):
        result = runner.invoke(dtaas, ["admin", "config", "generate"])

    assert result.exit_code != 0
    assert "Error while generating config" in result.output


def test_config_validate_valid(runner):
    """config validate reports success when no problems are found."""
    with patch("src.cmd.configValidatePkg.validate_config", return_value=[]):
        result = runner.invoke(dtaas, ["admin", "config", "validate"])

    assert result.exit_code == 0
    assert "Configuration is valid" in result.output


def test_config_validate_reports_problems(runner):
    """config validate lists every problem and exits non-zero."""
    with patch(
        "src.cmd.configValidatePkg.validate_config",
        return_value=["git-repo must be a valid URL", "common.path is missing"],
    ):
        result = runner.invoke(dtaas, ["admin", "config", "validate"])

    assert result.exit_code != 0
    assert "Invalid dtaas.toml" in result.output
    assert "- git-repo must be a valid URL" in result.output
    assert "- common.path is missing" in result.output


def test_config_validate_missing_file(runner):
    """A FileNotFoundError from validate_config surfaces as a ClickException."""
    with patch(
        "src.cmd.configValidatePkg.validate_config",
        side_effect=FileNotFoundError("dtaas.toml not found"),
    ):
        result = runner.invoke(dtaas, ["admin", "config", "validate"])

    assert result.exit_code != 0
    assert "dtaas.toml not found" in result.output


def test_add_users_config_error(runner):
    """add command raises ClickException when Config() fails"""
    with patch("src.cmd_utils.configPkg.Config", side_effect=RuntimeError("no config")):
        result = runner.invoke(dtaas, ["admin", "user", "add"])

    assert result.exit_code != 0
    assert "no config" in result.output


@pytest.fixture
def mock_deploy_pkg():
    """Mock the deploy package handlers used by install/uninstall."""
    with patch("src.cmd.deployPkg.install") as mock_install, patch(
        "src.cmd.deployPkg.uninstall"
    ) as mock_uninstall, patch(
        "src.cmd.deployPkg.installation_present", return_value=True
    ) as mock_present, patch("src.cmd.provision_user_files") as mock_provision:
        yield {
            "install": mock_install,
            "uninstall": mock_uninstall,
            "present": mock_present,
            "provision": mock_provision,
        }


def test_admin_install_success(runner, mock_deploy_pkg):
    """install reports success and forwards the default output dir."""
    result = runner.invoke(dtaas, ["admin", "install"])

    assert result.exit_code == 0
    assert "Deployment installed successfully" in result.output
    mock_deploy_pkg["install"].assert_called_once_with(".")
    mock_deploy_pkg["provision"].assert_called_once_with(".")


def test_admin_install_error(runner, mock_deploy_pkg):
    """install converts an OSError into a ClickException."""
    mock_deploy_pkg["install"].side_effect = OSError("not generated")

    result = runner.invoke(dtaas, ["admin", "install"])

    assert result.exit_code != 0
    assert "not generated" in result.output


def test_admin_uninstall_remove_user_files_with_yes(runner, mock_deploy_pkg):
    """--remove-user-files with --yes skips the prompt and reports removal."""
    mock_deploy_pkg["uninstall"].return_value = "Removed user files at '/x/files'."

    result = runner.invoke(
        dtaas, ["admin", "uninstall", "--remove-user-files", "--yes"]
    )

    assert result.exit_code == 0
    assert "Removed user files" in result.output
    mock_deploy_pkg["uninstall"].assert_called_once_with(".", True)


def test_admin_uninstall_error(runner, mock_deploy_pkg):
    """uninstall converts an OSError into a ClickException."""
    mock_deploy_pkg["uninstall"].side_effect = OSError("daemon down")

    result = runner.invoke(dtaas, ["admin", "uninstall"])

    assert result.exit_code != 0
    assert "daemon down" in result.output


def test_admin_uninstall_removes_files_when_nothing_running(runner, mock_deploy_pkg):
    """--remove-user-files still deletes files when no containers are running."""
    mock_deploy_pkg["present"].return_value = False

    with patch("src.cmd.deployPkg.require_compose_file") as mock_require, patch(
        "src.cmd.deployPkg.delete_user_files",
        return_value="Removed user files at '/x/files'.",
    ) as mock_delete:
        result = runner.invoke(
            dtaas, ["admin", "uninstall", "--remove-user-files", "--yes"]
        )

    assert result.exit_code == 0
    assert "no existing DTaaS / Workspace installation" in result.output
    assert "Removed user files" in result.output
    mock_require.assert_called_once_with(".")
    mock_delete.assert_called_once_with(".")
    mock_deploy_pkg["uninstall"].assert_not_called()


def test_admin_update_certs_success(runner):
    """update --certs forwards the output dir and echoes the result message."""
    with patch(
        "src.cmd_utils.certUpdatePkg.update_certs", return_value="certs updated"
    ) as mock_update:
        result = runner.invoke(dtaas, ["admin", "update", "--certs"])

    assert result.exit_code == 0
    assert "certs updated" in result.output
    mock_update.assert_called_once_with(".")


def test_admin_update_config_success(runner):
    """update --config forwards the output dir (not dry-run) and echoes the result."""
    with patch(
        "src.cmd_utils.configUpdatePkg.update_config",
        return_value="Updated config/.env.",
    ) as mock_update:
        result = runner.invoke(dtaas, ["admin", "update", "--config"])

    assert result.exit_code == 0
    assert "Updated config/.env." in result.output
    mock_update.assert_called_once_with(".", False)
