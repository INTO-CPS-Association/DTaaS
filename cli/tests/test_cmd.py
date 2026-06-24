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


def test_param_rows_skips_hidden_param():
    """_param_rows returns no rows for a param with no help record (hidden)."""
    from src.cmd import VerticalChoicesCommand

    param = MagicMock()
    param.get_help_record.return_value = None

    rows = VerticalChoicesCommand._param_rows(param, ctx=None)  # pylint: disable=protected-access
    assert not rows


def test_generate_deployment_prints_placeholder_warnings(runner):
    """Warnings from check_placeholders are echoed to the user."""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd.utilsPkg.import_toml", return_value=({"localhost": {}}, None)
    ), patch("src.cmd.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd.deployConfigPkg.apply_config"
    ), patch(
        "src.cmd.deployConfigPkg.check_placeholders",
        return_value=["Warning: placeholder FOO left unset"],
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code == 0
    assert "placeholder FOO left unset" in result.output


def test_generate_deployment_substitution_error(runner):
    """A failure during config substitution is reported as a ClickException."""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd.utilsPkg.import_toml", return_value=({"localhost": {}}, None)
    ), patch(
        "src.cmd.deployConfigPkg.build_file_specs", side_effect=ValueError("bad spec")
    ):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code != 0
    assert "Error substituting config values" in result.output


def test_generate_deployment_user_dir_error(runner):
    """An OSError while creating user directories surfaces as a ClickException."""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd.utilsPkg.import_toml",
        return_value=({"users": {"add": ["alice"]}, "localhost": {}}, None),
    ), patch("src.cmd.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd.deployConfigPkg.apply_config"
    ), patch("src.cmd.projectPkg.create_user_dirs", side_effect=OSError("disk full")):
        result = runner.invoke(dtaas, ["generate-deployment", "--type", "localhost"])

    assert result.exit_code != 0
    assert "Error creating user directories" in result.output


def test_find_toml_prefers_output_dir(tmp_path):
    """_find_toml returns the output_dir copy when present."""
    from src.cmd import _find_toml

    toml = tmp_path / "dtaas.toml"
    toml.write_text("x = 1")

    assert _find_toml(str(tmp_path)) == toml


def test_find_toml_returns_none_when_absent(tmp_path, monkeypatch):
    """_find_toml returns None when no dtaas.toml exists in either location."""
    from src.cmd import _find_toml

    empty = tmp_path / "empty"
    empty.mkdir()
    monkeypatch.chdir(empty)  # cwd has no dtaas.toml either

    assert _find_toml(str(empty)) is None


def test_generate_deployment_copies_certs(runner):
    """The certs-src from dtaas.toml is forwarded to certsPkg.copy_certs."""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd.projectPkg.set_files_permissions"
    ), patch("src.cmd._find_toml", return_value=Path("dtaas.toml")), patch(
        "src.cmd.utilsPkg.import_toml",
        return_value=(
            {"common": {"security": {"certs-src": "/etc/certs"}}, "secure-server": {}},
            None,
        ),
    ), patch("src.cmd.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd.deployConfigPkg.apply_config"
    ), patch("src.cmd.deployConfigPkg.check_placeholders", return_value=[]), patch(
        "src.cmd.certsPkg.copy_certs", return_value="certs copied"
    ) as mock_copy:
        result = runner.invoke(
            dtaas, ["generate-deployment", "--type", "secure-server"]
        )

    assert result.exit_code == 0
    assert "certs copied" in result.output
    mock_copy.assert_called_once_with("secure-server", ".", "/etc/certs", False)


def test_generate_deployment_cert_copy_error(runner):
    """An OSError while copying certificates surfaces as a ClickException."""
    from pathlib import Path

    with patch("src.cmd.projectPkg.generate_deploy_project"), patch(
        "src.cmd._find_toml", return_value=Path("dtaas.toml")
    ), patch(
        "src.cmd.utilsPkg.import_toml",
        return_value=({"common": {"security": {"certs-src": "/etc/certs"}}}, None),
    ), patch("src.cmd.deployConfigPkg.build_file_specs", return_value=[]), patch(
        "src.cmd.deployConfigPkg.apply_config"
    ), patch("src.cmd.deployConfigPkg.check_placeholders", return_value=[]), patch(
        "src.cmd.certsPkg.copy_certs", side_effect=OSError("permission denied")
    ):
        result = runner.invoke(
            dtaas, ["generate-deployment", "--type", "secure-server"]
        )

    assert result.exit_code != 0
    assert "Error copying certificates" in result.output


def test_certs_src_handles_missing_section():
    """_certs_src returns '' when common.security is absent or malformed."""
    from src.cmd import _certs_src

    assert _certs_src({}) == ""
    assert _certs_src({"common": {"security": "oops"}}) == ""
    assert _certs_src({"common": {"security": {"certs-src": " /x "}}}) == "/x"


def test_add_users_config_error(runner):
    """add command raises ClickException when Config() fails"""
    with patch("src.cmd.configPkg.Config", side_effect=RuntimeError("no config")):
        result = runner.invoke(dtaas, ["admin", "user", "add"])

    assert result.exit_code != 0
    assert "no config" in result.output
