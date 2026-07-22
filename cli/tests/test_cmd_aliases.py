"""Tests for the deprecated command aliases (cmd_aliases.py).

Every old spelling must (a) still forward to its replacement and (b) print a
deprecation notice naming the new command, for one release.
"""

from unittest.mock import patch
import pytest
from click.testing import CliRunner
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def runner():
    """CLI test runner."""
    return CliRunner()


def test_admin_config_reconcile_forwards_and_warns(runner):
    """'admin config reconcile' forwards to config reconcile and warns."""
    with patch("src.cmd_config.run_reconcile") as mock_reconcile:
        result = runner.invoke(dtaas, ["admin", "config", "reconcile", "--fix"])

    assert result.exit_code == 0
    mock_reconcile.assert_called_once_with(".", True)
    assert "deprecated" in result.output
    assert "config reconcile" in result.output


def test_admin_install_forwards_to_platform_install(runner):
    """'admin install' forwards to platform install and warns."""
    with patch("src.cmd_platform.deployPkg.install") as mock_install, patch(
        "src.cmd_platform.provision_user_files"
    ):
        result = runner.invoke(dtaas, ["admin", "install"])

    assert result.exit_code == 0
    mock_install.assert_called_once_with(".")
    assert "deprecated" in result.output
    assert "platform install" in result.output


def test_admin_user_add_forwards_to_user_add(runner):
    """'admin user add' forwards to user add and warns."""
    with patch(
        "src.cmd_user.stage_users_for_add", return_value=[]
    ) as mock_stage, patch("src.cmd_utils.configPkg.Config"), patch(
        "src.cmd_user.userPkg.add_users", return_value=None
    ):
        result = runner.invoke(
            dtaas, ["admin", "user", "add", "alice", "--email", "a@x.io"]
        )

    assert result.exit_code == 0
    mock_stage.assert_called_once()
    assert "deprecated" in result.output
    assert "user add" in result.output


def test_generate_deployment_alias_forwards(runner):
    """Top-level 'generate-deployment' forwards to deployment generate and warns."""
    with patch("src.cmd_deployment.projectPkg.generate_deploy_project"), patch(
        "src.cmd_deployment.projectPkg.generate_user_templates"
    ), patch("src.cmd_deployment.projectPkg.set_files_permissions"), patch(
        "src.cmd_deploy_utils._find_toml", return_value=None
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    assert "deprecated" in result.output
    assert "deployment generate" in result.output


def test_generate_project_alias_notes_config_owns_toml(runner):
    """'generate-project' forwards to deployment generate and points at config generate."""
    with patch("src.cmd_deployment.projectPkg.generate_deploy_project"), patch(
        "src.cmd_deployment.projectPkg.generate_user_templates"
    ), patch("src.cmd_deployment.projectPkg.set_files_permissions"), patch(
        "src.cmd_deploy_utils._find_toml", return_value=None
    ):
        result = runner.invoke(dtaas, ["generate-project", "--type", "localhost"])

    assert result.exit_code == 0
    assert "deprecated" in result.output
    assert "config generate" in result.output


def test_deprecated_aliases_hidden_from_help(runner):
    """The deprecated spellings do not appear in 'dtaas --help'."""
    result = runner.invoke(dtaas, ["--help"])

    assert "admin" not in result.output
    assert "generate-deployment" not in result.output
    assert "generate-project" not in result.output
