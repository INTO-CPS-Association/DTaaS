"""Tests for the 'deployment' CLI commands."""

from unittest.mock import patch
import pytest
import tomlkit
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_generate():
    """Mock the file-writing steps of deployment generate (no dtaas.toml)."""
    with patch("src.cmd_deployment.projectPkg.generate_deploy_project"), patch(
        "src.cmd_deployment.projectPkg.generate_user_templates"
    ) as mock_templates, patch(
        "src.cmd_deployment.hostDirsPkg"
    ) as mock_host_dirs, patch("src.cmd_deploy_utils._find_toml", return_value=None):
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
    result = runner.invoke(dtaas, ["deployment", "generate", "--type", "secure-server"])

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


@pytest.fixture
def generate_with_config(runner, tmp_path, base):
    """Run generate on a dir holding *base*, updated by a dict, as dtaas.toml.

    The file-writing steps are mocked; returns (result, copy mock).
    """

    def _run(deploy_type, extra):
        base.update(extra)
        (tmp_path / "dtaas.toml").write_text(tomlkit.dumps(base), encoding="utf-8")
        args = ["deployment", "generate", "--type", deploy_type]
        with patch(
            "src.cmd_deployment.projectPkg.generate_deploy_project"
        ) as mock_copy, patch(
            "src.cmd_deployment.projectPkg.generate_user_templates"
        ), patch("src.cmd_deployment.apply_deploy_config"), patch(
            "src.cmd_deployment.hostDirsPkg"
        ):
            result = runner.invoke(dtaas, [*args, "--output-dir", str(tmp_path)])
        return result, mock_copy

    return _run


def test_deployment_generate_refuses_invalid_config_before_writing(
    generate_with_config,
):
    """An invalid dtaas.toml stops generate with every problem listed, before
    any file is copied, so nothing is left half written."""
    bad = "https://a/x\\', REACT_APP_URL: (globalThis.pwned=1)//"
    result, mock_copy = generate_with_config(
        "secure-server", {"frontend": {"logger-url": bad}}
    )

    assert result.exit_code == 1
    assert "Invalid dtaas.toml:\n- frontend.logger-url must be" in result.output
    mock_copy.assert_not_called()


def test_deployment_generate_checks_only_its_type(generate_with_config):
    """A valid config passes; a leftover section of another type is ignored."""
    leftover = {"workspace-secure-server": {"keycloak-issuer-url": "not a url"}}
    result, mock_copy = generate_with_config("secure-server", leftover)

    assert result.exit_code == 0, result.output
    mock_copy.assert_called_once()
