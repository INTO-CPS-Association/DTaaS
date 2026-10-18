"""Tests for the 'deployment' CLI commands."""

from unittest.mock import patch
import pytest
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_generate():
    """Mock the file-writing steps of deployment generate (no dtaas.toml)."""
    with patch("src.cmd_deployment.projectPkg.generate_deploy_project"), patch(
        "src.cmd_deployment.projectPkg.generate_user_templates"
    ) as mock_templates, patch(
        "src.cmd_deployment.hostDirsPkg"
    ) as mock_host_dirs, patch(
        "src.cmd_deploy_utils._find_toml", return_value=None
    ):
        yield {"templates": mock_templates, "host_dirs": mock_host_dirs}


def test_deployment_generate_without_config_prints_note(runner, mock_generate):
    """deployment generate prints a note when dtaas.toml is absent"""
    result = runner.invoke(dtaas, ["deployment", "generate", "--type", "localhost"])

    assert result.exit_code == 0
    assert "Note:" in result.output
    assert mock_generate["templates"].called


def test_deployment_generate_copies_user_templates(runner, mock_generate):
    """deployment generate also copies the user-management templates."""
    result = runner.invoke(
        dtaas, ["deployment", "generate", "--type", "localhost", "--force"]
    )

    assert result.exit_code == 0
    mock_generate["templates"].assert_called_once_with(".", True)


def test_deployment_generate_prepares_host_dirs(runner, mock_generate):
    """deployment generate hands files/ and the logger's logs/logger over."""
    result = runner.invoke(
        dtaas, ["deployment", "generate", "--type", "secure-server"]
    )

    assert result.exit_code == 0
    host_dirs = mock_generate["host_dirs"]
    host_dirs.set_files_permissions.assert_called_once_with(".")
    host_dirs.set_logs_permissions.assert_called_once_with(".", "secure-server")


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
