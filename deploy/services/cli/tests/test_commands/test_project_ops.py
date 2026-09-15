"""Tests for project_ops commands (project generate)"""

import pytest
from dtaas_services.cmd import services
# pylint: disable=W0621


@pytest.fixture
def mock_generate(mocker):
    """Mock generate_project_structure at its import site"""
    return mocker.patch(
        "dtaas_services.commands.project_ops.generate_project_structure"
    )


def test_generate_custom_path(runner, tmp_path):
    """Test project generate with custom path"""
    custom_path = tmp_path / "custom"
    custom_path.mkdir()
    result = runner.invoke(
        services, ["project", "generate", "--path", str(custom_path)]
    )
    assert result.exit_code == 0
    assert "Project structure generated" in result.output


def test_generate_failure(runner, mock_generate):
    """Test project generate failure"""
    mock_generate.return_value = (False, "Failed to generate project: Path error")
    result = runner.invoke(services, ["project", "generate"])
    assert result.exit_code != 0
    assert "Failed to generate project" in result.output


@pytest.mark.parametrize("args, expected_force", [([], False), (["--force"], True)])
def test_generate_passes_force(runner, mock_generate, args, expected_force):
    """Test project generate forwards the --force flag"""
    mock_generate.return_value = (True, "Project structure generated")
    result = runner.invoke(services, ["project", "generate"] + args)
    assert result.exit_code == 0
    assert mock_generate.call_args.args[2] is expected_force
