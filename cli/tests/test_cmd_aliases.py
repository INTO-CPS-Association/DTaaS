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


def test_admin_stop_alias_warns_about_narrowed_scope(runner):
    """'admin stop' must warn that scope narrowed to core-only, not just rename."""
    with patch("src.cmd_lifecycle.deployPkg.installation_present", return_value=False):
        result = runner.invoke(dtaas, ["admin", "stop"])

    assert result.exit_code == 0
    assert "deprecated" in result.output
    assert "platform stop" in result.output
    # The blast-radius change must be surfaced, pointing at the user verb.
    assert "CORE services only" in result.output
    assert "dtaas user stop --all" in result.output


def test_generate_project_alias_still_works_without_type(runner):
    """'generate-project' is a working shim (no --type), not a broken forward.

    It must not hard-fail with a Click 'Missing option --type' usage error --
    the deprecation contract is that old spellings still work for one release.
    """
    with patch("src.cmd_aliases.projectPkg.generate_dtaas_toml") as mock_config, patch(
        "src.cmd_aliases.projectPkg.generate_user_templates"
    ) as mock_templates:
        result = runner.invoke(dtaas, ["generate-project", "--output-dir", "."])

    assert result.exit_code == 0
    assert "deprecated" in result.output
    assert "config generate" in result.output
    mock_config.assert_called_once_with(".", False)
    mock_templates.assert_called_once_with(".", False)


def test_generate_project_alias_maps_copy_error(runner):
    """A copy failure in the shim surfaces as a ClickException, not a traceback."""
    with patch(
        "src.cmd_aliases.projectPkg.generate_dtaas_toml",
        side_effect=OSError("disk full"),
    ):
        result = runner.invoke(dtaas, ["generate-project"])

    assert result.exit_code != 0
    assert "Error while generating project" in result.output


def test_generate_project_alias_preserves_existing_users_csv(runner, tmp_path):
    """A curated users.csv must survive 'generate-project --force'.

    The old generate-project never wrote users.csv; 'config generate' (which
    the shim used to delegate to wholesale) does, so under --force it would
    silently clobber an operator's real users.csv with the placeholder sample.
    """
    users_csv = tmp_path / "users.csv"
    users_csv.write_text(
        "username,email,groups,load_balance\nalice,a@x.io,default,true\n"
    )

    result = runner.invoke(
        dtaas, ["generate-project", "--output-dir", str(tmp_path), "--force"]
    )

    assert result.exit_code == 0
    assert users_csv.read_text().startswith("username,email,groups,load_balance\nalice")


def test_admin_user_status_is_not_an_alias(runner):
    """'user status' is new in 2.0, so 'admin user status' never existed."""
    result = runner.invoke(dtaas, ["admin", "user", "status"])

    assert result.exit_code != 0
    assert "No such command 'status'" in result.output


def test_admin_help_lists_migration_targets(runner):
    """'dtaas admin --help' must not be a dead end -- it lists the old verbs."""
    result = runner.invoke(dtaas, ["admin", "--help"])

    assert result.exit_code == 0
    for name in ("install", "uninstall", "config", "user"):
        assert name in result.output


def test_deprecated_aliases_hidden_from_top_level_help(runner):
    """The deprecated spellings do not appear in 'dtaas --help'."""
    result = runner.invoke(dtaas, ["--help"])

    assert "admin" not in result.output
    assert "generate-deployment" not in result.output
    assert "generate-project" not in result.output
