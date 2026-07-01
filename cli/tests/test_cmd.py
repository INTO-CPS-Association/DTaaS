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


def test_generate_deployment_without_config_prints_note(runner):
    """generate-deployment prints a note when dtaas.toml is absent"""
    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd_utils._find_toml", return_value=None
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    assert "Note:" in result.output


def test_generate_deployment_malformed_toml_errors(runner):
    """generate-deployment fails when dtaas.toml exists but cannot be parsed"""

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd_utils._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd_utils.utilsPkg.import_toml",
        return_value=(None, Exception("parse error")),
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code != 0
    assert "Error reading dtaas.toml" in result.output


def test_generate_deployment_error(runner):
    """generate-deployment converts known exceptions to ClickException"""
    with patch("src.cmd.projectPkg.generate_deploy_project") as mock_gen:
        mock_gen.side_effect = RuntimeError("template missing")

        result = runner.invoke(
            dtaas, ["generate-deployment", "--type", "insecure-server"]
        )

        assert result.exit_code != 0
        assert "template missing" in result.output


def test_generate_deployment_help_lists_choices_vertically(runner):
    """The custom help formatter renders --type choices as a vertical list."""
    result = runner.invoke(dtaas, ["generate-deployment", "--help"])

    assert result.exit_code == 0
    assert "One of:" in result.output
    # Each deploy type appears on its own line in the Options section.
    for deploy_type in ["localhost", "secure-server", "workspace-localhost"]:
        assert deploy_type in result.output


def test_generate_deployment_prints_placeholder_warnings(runner):
    """Warnings from check_placeholders are echoed to the user."""

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd_utils._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd_utils.utilsPkg.import_toml", return_value=({"localhost": {}}, None)
    ), patch("src.cmd_utils.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd_utils.deployConfigPkg.apply_config"
    ), patch(
        "src.cmd_utils.deployConfigPkg.check_placeholders",
        return_value=["Warning: placeholder FOO left unset"],
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    assert "placeholder FOO left unset" in result.output


def test_generate_deployment_substitution_error(runner):
    """A failure during config substitution is reported as a ClickException."""

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd_utils._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd_utils.utilsPkg.import_toml", return_value=({"localhost": {}}, None)
    ), patch(
        "src.cmd_utils.deployConfigPkg.build_file_specs",
        side_effect=ValueError("bad spec"),
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code != 0
    assert "Error substituting config values" in result.output


def test_generate_deployment_user_dir_error(runner):
    """An OSError while creating user directories surfaces as a ClickException."""

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd_utils._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd_utils.utilsPkg.import_toml",
        return_value=({"users": {"add": ["alice"]}, "localhost": {}}, None),
    ), patch("src.cmd_utils.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd_utils.deployConfigPkg.apply_config"
    ), patch(
        "src.cmd_utils.projectPkg.create_user_dirs", side_effect=OSError("disk full")
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code != 0
    assert "Error creating user directories" in result.output


def test_generate_deployment_copies_certs(runner):
    """The certs-src from dtaas.toml is forwarded to certsPkg.copy_certs."""

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd.projectPkg.set_files_permissions"
    ), patch("src.cmd_utils._find_toml", return_value=Path("dtaas.toml")), patch(
        "src.cmd_utils.utilsPkg.import_toml",
        return_value=(
            {"common": {"security": {"certs-src": "/etc/certs"}}, "secure-server": {}},
            None,
        ),
    ), patch("src.cmd_utils.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd_utils.deployConfigPkg.apply_config"
    ), patch(
        "src.cmd_utils.deployConfigPkg.check_placeholders", return_value=[]
    ), patch(
        "src.cmd_utils.certsPkg.copy_certs", return_value="certs copied"
    ) as mock_copy:
        result = runner.invoke(
            dtaas, ["generate-deployment", "--type", "secure-server"]
        )

    assert result.exit_code == 0
    assert "certs copied" in result.output
    mock_copy.assert_called_once_with("secure-server", ".", "/etc/certs", False)


def test_generate_deployment_cert_copy_error(runner):
    """An OSError while copying certificates surfaces as a ClickException."""

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd_utils._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd_utils.utilsPkg.import_toml",
        return_value=({"common": {"security": {"certs-src": "/etc/certs"}}}, None),
    ), patch("src.cmd_utils.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd_utils.deployConfigPkg.apply_config"
    ), patch(
        "src.cmd_utils.deployConfigPkg.check_placeholders", return_value=[]
    ), patch(
        "src.cmd_utils.certsPkg.copy_certs", side_effect=OSError("permission denied")
    ):
        result = runner.invoke(
            dtaas, ["generate-deployment", "--type", "secure-server"]
        )

    assert result.exit_code != 0
    assert "Error copying certificates" in result.output


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


def test_admin_install_docker_error(runner, mock_deploy_pkg):
    """A python-on-whales DockerException surfaces with its real message."""
    mock_deploy_pkg["install"].side_effect = DockerException(
        ["docker", "compose", "up", "-d"], 1, stderr=b"Cannot connect to the daemon"
    )

    result = runner.invoke(dtaas, ["admin", "install"])

    assert result.exit_code != 0
    assert "Cannot connect to the daemon" in result.output


def test_admin_uninstall_success(runner, mock_deploy_pkg):
    """uninstall reports success and preserves files by default."""
    mock_deploy_pkg["uninstall"].return_value = None

    result = runner.invoke(dtaas, ["admin", "uninstall"])

    assert result.exit_code == 0
    assert "Deployment uninstalled successfully" in result.output
    mock_deploy_pkg["uninstall"].assert_called_once_with(".", False)


def test_admin_uninstall_remove_user_files_with_yes(runner, mock_deploy_pkg):
    """--remove-user-files with --yes skips the prompt and reports removal."""
    mock_deploy_pkg["uninstall"].return_value = "Removed user files at '/x/files'."

    result = runner.invoke(
        dtaas, ["admin", "uninstall", "--remove-user-files", "--yes"]
    )

    assert result.exit_code == 0
    assert "Removed user files" in result.output
    mock_deploy_pkg["uninstall"].assert_called_once_with(".", True)


def test_admin_uninstall_remove_user_files_aborts(runner, mock_deploy_pkg):
    """Declining the confirmation prompt aborts before any teardown."""
    result = runner.invoke(
        dtaas, ["admin", "uninstall", "--remove-user-files"], input="n\n"
    )

    assert result.exit_code != 0
    mock_deploy_pkg["uninstall"].assert_not_called()


def test_admin_uninstall_error(runner, mock_deploy_pkg):
    """uninstall converts an OSError into a ClickException."""
    mock_deploy_pkg["uninstall"].side_effect = OSError("daemon down")

    result = runner.invoke(dtaas, ["admin", "uninstall"])

    assert result.exit_code != 0
    assert "daemon down" in result.output


def test_admin_uninstall_no_existing_installation(runner, mock_deploy_pkg):
    """A repeated uninstall reports there is nothing installed, not success."""
    mock_deploy_pkg["present"].return_value = False

    result = runner.invoke(dtaas, ["admin", "uninstall"])

    assert result.exit_code == 0
    assert "no existing DTaaS / Workspace installation" in result.output
    assert "uninstalled successfully" not in result.output
    mock_deploy_pkg["uninstall"].assert_not_called()


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
        "src.cmd.certUpdatePkg.update_certs", return_value="certs updated"
    ) as mock_update:
        result = runner.invoke(dtaas, ["admin", "update", "--certs"])

    assert result.exit_code == 0
    assert "certs updated" in result.output
    mock_update.assert_called_once_with(".")


def test_admin_update_requires_a_target(runner):
    """update without a target flag fails with a helpful message."""
    result = runner.invoke(dtaas, ["admin", "update"])

    assert result.exit_code != 0
    assert "Nothing to update" in result.output


def test_admin_update_validation_error(runner):
    """A CertValidationError surfaces as a ClickException with its message."""
    with patch(
        "src.cmd.certUpdatePkg.update_certs",
        side_effect=CertValidationError("Certificate expired on 2024-01-01."),
    ):
        result = runner.invoke(dtaas, ["admin", "update", "--certs"])

    assert result.exit_code != 0
    assert "expired" in result.output


def test_admin_update_os_error(runner):
    """An OSError (e.g. missing certs-src) surfaces as a ClickException."""
    with patch(
        "src.cmd.certUpdatePkg.update_certs",
        side_effect=OSError("certs-src directory not found"),
    ):
        result = runner.invoke(dtaas, ["admin", "update", "--certs"])

    assert result.exit_code != 0
    assert "certs-src" in result.output
