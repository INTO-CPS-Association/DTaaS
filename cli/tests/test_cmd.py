"""Tests for the config / deployment / platform CLI commands."""

from unittest.mock import patch
import pytest
from click.testing import CliRunner
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


def test_config_reconcile_invokes_run_reconcile(runner):
    """config reconcile delegates to run_reconcile with the output dir and fix flag."""
    with patch("src.cmd_config.run_reconcile") as mock_reconcile:
        result = runner.invoke(dtaas, ["config", "reconcile"])

    assert result.exit_code == 0
    mock_reconcile.assert_called_once_with(".", False)


def test_config_reconcile_passes_fix_flag(runner):
    """config reconcile --fix forwards fix=True to run_reconcile."""
    with patch("src.cmd_config.run_reconcile") as mock_reconcile:
        result = runner.invoke(dtaas, ["config", "reconcile", "--fix"])

    assert result.exit_code == 0
    mock_reconcile.assert_called_once_with(".", True)


def test_config_reconcile_maps_errors(runner):
    """A malformed state cache surfaces as a ClickException."""
    with patch("src.cmd_config.run_reconcile", side_effect=ValueError("bad state")):
        result = runner.invoke(dtaas, ["config", "reconcile"])

    assert result.exit_code != 0
    assert "bad state" in result.output


def test_config_reconcile_help_renders_examples_block(runner):
    """The docstring's \\b example block is preformatted, not word-wrapped.

    A missing blank line before \\b merges it into the preceding paragraph,
    so Click folds the example commands onto wrapped lines instead of
    rendering one per line.
    """
    result = runner.invoke(dtaas, ["config", "reconcile", "--help"])

    assert "\x08" not in result.output
    assert "Examples:\n    dtaas config reconcile " in result.output


def test_deployment_generate_without_config_prints_note(runner):
    """deployment generate prints a note when dtaas.toml is absent"""
    with patch("src.cmd_deployment.projectPkg.generate_deploy_project"), patch(
        "src.cmd_deployment.projectPkg.generate_user_templates"
    ), patch("src.cmd_deployment.projectPkg.set_files_permissions"), patch(
        "src.cmd_deploy_utils._find_toml", return_value=None
    ):
        result = runner.invoke(dtaas, ["deployment", "generate", "--type", "localhost"])

    assert result.exit_code == 0
    assert "Note:" in result.output


def test_deployment_generate_copies_user_templates(runner):
    """deployment generate folds in the user-management templates (generate-project)."""
    with patch("src.cmd_deployment.projectPkg.generate_deploy_project"), patch(
        "src.cmd_deployment.projectPkg.generate_user_templates"
    ) as mock_templates, patch(
        "src.cmd_deployment.projectPkg.set_files_permissions"
    ), patch("src.cmd_deploy_utils._find_toml", return_value=None):
        result = runner.invoke(
            dtaas, ["deployment", "generate", "--type", "localhost", "--force"]
        )

    assert result.exit_code == 0
    mock_templates.assert_called_once_with(".", True)


def test_deployment_generate_error(runner):
    """deployment generate converts known exceptions to ClickException"""
    with patch(
        "src.cmd_deployment.projectPkg.generate_deploy_project",
        side_effect=RuntimeError("template missing"),
    ):
        result = runner.invoke(
            dtaas, ["deployment", "generate", "--type", "insecure-server"]
        )

    assert result.exit_code != 0
    assert "template missing" in result.output


def test_deployment_generate_help_renders_examples_block(runner):
    """The docstring's \\b example block is preformatted, not word-wrapped."""
    result = runner.invoke(dtaas, ["deployment", "generate", "--help"])

    assert "\x08" not in result.output
    assert "Examples:\n    dtaas deployment generate " in result.output


def test_config_generate_success(runner):
    """config generate forwards output-dir/force and reports success when written."""
    with patch(
        "src.cmd_config.projectPkg.generate_config", return_value=False
    ) as mock_gen:
        result = runner.invoke(dtaas, ["config", "generate"])

    assert result.exit_code == 0
    assert "Configuration file generated successfully" in result.output
    mock_gen.assert_called_once_with(".", False)


def test_config_generate_force_forwards_flag(runner):
    """config generate --force forwards force=True."""
    with patch(
        "src.cmd_config.projectPkg.generate_config", return_value=False
    ) as mock_gen:
        result = runner.invoke(dtaas, ["config", "generate", "--force"])

    assert result.exit_code == 0
    mock_gen.assert_called_once_with(".", True)


def test_config_generate_skips_existing(runner):
    """When the file already exists, no misleading success message is printed."""
    with patch("src.cmd_config.projectPkg.generate_config", return_value=True):
        result = runner.invoke(dtaas, ["config", "generate"])

    assert result.exit_code == 0
    assert "Configuration file generated successfully" not in result.output


def test_config_generate_error(runner):
    """config generate converts an OSError into a ClickException."""
    with patch(
        "src.cmd_config.projectPkg.generate_config", side_effect=OSError("disk full")
    ):
        result = runner.invoke(dtaas, ["config", "generate"])

    assert result.exit_code != 0
    assert "Error while generating config" in result.output


def test_config_validate_valid(runner):
    """config validate reports success when no problems are found."""
    with patch("src.cmd_config.configValidatePkg.validate_config", return_value=[]):
        result = runner.invoke(dtaas, ["config", "validate"])

    assert result.exit_code == 0
    assert "Configuration is valid" in result.output


def test_config_validate_reports_problems(runner):
    """config validate lists every problem and exits non-zero."""
    with patch(
        "src.cmd_config.configValidatePkg.validate_config",
        return_value=["git-repo must be a valid URL", "common.path is missing"],
    ):
        result = runner.invoke(dtaas, ["config", "validate"])

    assert result.exit_code != 0
    assert "Invalid dtaas.toml" in result.output
    assert "- git-repo must be a valid URL" in result.output
    assert "- common.path is missing" in result.output


def test_config_validate_missing_file(runner):
    """A FileNotFoundError from validate_config surfaces as a ClickException."""
    with patch(
        "src.cmd_config.configValidatePkg.validate_config",
        side_effect=FileNotFoundError("dtaas.toml not found"),
    ):
        result = runner.invoke(dtaas, ["config", "validate"])

    assert result.exit_code != 0
    assert "dtaas.toml not found" in result.output


@pytest.fixture
def mock_deploy_pkg():
    """Mock the deploy package handlers used by install/uninstall."""
    with patch("src.cmd_platform.deployPkg.install") as mock_install, patch(
        "src.cmd_utils.deployPkg.uninstall"
    ) as mock_uninstall, patch(
        "src.cmd_utils.deployPkg.installation_present", return_value=True
    ) as mock_present, patch("src.cmd_platform.provision_user_files") as mock_provision:
        yield {
            "install": mock_install,
            "uninstall": mock_uninstall,
            "present": mock_present,
            "provision": mock_provision,
        }


def test_platform_install_success(runner, mock_deploy_pkg):
    """install reports success and forwards the default output dir."""
    result = runner.invoke(dtaas, ["platform", "install"])

    assert result.exit_code == 0
    assert "Deployment installed successfully" in result.output
    mock_deploy_pkg["install"].assert_called_once_with(".")
    mock_deploy_pkg["provision"].assert_called_once_with(".")


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
