"""Tests for the config / platform CLI commands."""

from unittest.mock import patch
import pytest
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


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


@pytest.mark.parametrize("warnings", [[], ["Warning: frontend.logger-url is not set"]])
def test_config_validate_valid(runner, warnings):
    """config validate reports success when no problems are found, after any
    warnings, which do not make the configuration invalid."""
    with patch(
        "src.cmd_config.configValidatePkg.validate_config",
        return_value=([], warnings),
    ):
        result = runner.invoke(dtaas, ["config", "validate"])

    assert result.exit_code == 0
    assert result.output.splitlines() == [*warnings, "Configuration is valid"]


def test_config_validate_reports_problems(runner):
    """config validate lists every problem and exits non-zero, still printing
    its warnings."""
    with patch(
        "src.cmd_config.configValidatePkg.validate_config",
        return_value=(
            ["git-repo must be a valid URL", "common.path is missing"],
            ["Warning: frontend.logger-url is not set"],
        ),
    ):
        result = runner.invoke(dtaas, ["config", "validate"])

    assert result.exit_code != 0
    assert "Warning: frontend.logger-url is not set" in result.output
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


def test_permission_error_appends_sudo_hint(runner):
    """A permission-denied failure tells the user to re-run with sudo -E."""
    with patch(
        "src.cmd_config.configValidatePkg.validate_config",
        side_effect=PermissionError(
            "[Errno 13] Permission denied: '/etc/letsencrypt/archive/x'"
        ),
    ):
        result = runner.invoke(dtaas, ["config", "validate"])

    assert result.exit_code != 0
    assert "Permission denied" in result.output
    assert 'sudo -E env PATH="$PATH" dtaas <command>' in result.output


def test_non_permission_error_has_no_sudo_hint(runner):
    """An unrelated failure is not decorated with the sudo hint."""
    with patch(
        "src.cmd_config.configValidatePkg.validate_config",
        side_effect=ValueError("malformed toml"),
    ):
        result = runner.invoke(dtaas, ["config", "validate"])

    assert result.exit_code != 0
    assert "sudo -E env" not in result.output


def test_version_reports_the_installed_version(runner):
    """'dtaas --version' answers which build is installed, which is the first
    thing to establish when a manual test behaves unexpectedly."""
    result = runner.invoke(dtaas, ["--version"])

    assert result.exit_code == 0
    assert "dtaas" in result.output
