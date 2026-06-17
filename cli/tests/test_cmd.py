"""Tests for CLI commands."""

from unittest.mock import patch, MagicMock
import pytest
from click.testing import CliRunner
from src.cmd import dtaas
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
    ) as mock_delete, patch("src.cmd.configPkg.Config") as mock_cfg:
        mock_cfg.return_value = MagicMock()
        yield {"add": mock_add, "delete": mock_delete, "config": mock_cfg}


def test_add_users_success(runner, mock_user_pkg):
    """Test successful user addition"""
    mock_user_pkg["add"].return_value = None

    result = runner.invoke(dtaas, ["admin", "user", "add"])
    assert result.exit_code == 0
    assert "Users added successfully" in result.output
    mock_user_pkg["add"].assert_called_once()


def test_add_users_error(runner, mock_user_pkg):
    """Test user addition with error"""
    mock_user_pkg["add"].return_value = Exception("Add failed")

    result = runner.invoke(dtaas, ["admin", "user", "add"])
    assert result.exit_code != 0
    assert "Error while adding users" in result.output


def test_delete_user_success(runner, mock_user_pkg):
    """Test successful user deletion"""
    mock_user_pkg["delete"].return_value = None

    result = runner.invoke(dtaas, ["admin", "user", "delete"])
    assert result.exit_code == 0
    assert "User deleted successfully" in result.output
    mock_user_pkg["delete"].assert_called_once()


def test_delete_user_error(runner, mock_user_pkg):
    """Test user deletion with error"""
    mock_user_pkg["delete"].return_value = Exception("Delete failed")

    result = runner.invoke(dtaas, ["admin", "user", "delete"])
    assert result.exit_code != 0
    assert "Error while deleting users" in result.output


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


def test_generate_deployment_success(runner):
    """generate-deployment copies files and prints success; skips substitution if no toml"""
    with patch("src.cmd.projectPkg.generate_deploy_project") as mock_gen, patch(
        "src.cmd._find_toml", return_value=None
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

        assert result.exit_code == 0
        assert "localhost" in result.output
        mock_gen.assert_called_once_with("localhost", ".", False)


def test_generate_deployment_applies_config(runner):
    """generate-deployment calls build_file_specs and apply_config when toml is present"""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd.utilsPkg.import_toml", return_value=({"localhost": {}}, None)
    ), patch(
        "src.cmd.deployConfigPkg.build_file_specs", return_value=[]
    ) as mock_build, patch(
        "src.cmd.deployConfigPkg.apply_config"
    ) as mock_apply:
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    mock_build.assert_called_once_with("localhost", {"localhost": {}})
    mock_apply.assert_called_once_with(".", [])


def test_generate_deployment_without_config_prints_note(runner):
    """generate-deployment prints a note when dtaas.toml is absent"""
    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=None
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    assert "Note:" in result.output


def test_generate_deployment_malformed_toml_errors(runner):
    """generate-deployment fails when dtaas.toml exists but cannot be parsed"""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd.utilsPkg.import_toml",
        return_value=(None, Exception("parse error")),
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code != 0
    assert "Error reading dtaas.toml" in result.output


def test_generate_deployment_creates_user_dirs(runner):
    """generate-deployment calls create_user_dirs with usernames from toml users.add"""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd.utilsPkg.import_toml",
        return_value=({"users": {"add": ["alice", "bob"]}, "localhost": {}}, None),
    ), patch(
        "src.cmd.deployConfigPkg.build_file_specs", return_value=[]
    ), patch(
        "src.cmd.deployConfigPkg.apply_config"
    ), patch(
        "src.cmd.projectPkg.create_user_dirs"
    ) as mock_create_dirs:
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    mock_create_dirs.assert_called_once_with(".", ["alice", "bob"])


def test_generate_deployment_error(runner):
    """generate-deployment converts known exceptions to ClickException"""
    with patch("src.cmd.projectPkg.generate_deploy_project") as mock_gen:
        mock_gen.side_effect = RuntimeError("template missing")

        result = runner.invoke(
            dtaas, ["generate-deployment", "--type", "insecure-server"]
        )

        assert result.exit_code != 0
        assert "template missing" in result.output


def test_add_users_config_error(runner):
    """add command raises ClickException when Config() fails"""
    with patch("src.cmd.configPkg.Config", side_effect=RuntimeError("no config")):
        result = runner.invoke(dtaas, ["admin", "user", "add"])

    assert result.exit_code != 0
    assert "no config" in result.output


def test_delete_user_config_error(runner):
    """delete command raises ClickException when Config() fails"""
    with patch("src.cmd.configPkg.Config", side_effect=RuntimeError("no config")):
        result = runner.invoke(dtaas, ["admin", "user", "delete"])

    assert result.exit_code != 0
    assert "no config" in result.output
