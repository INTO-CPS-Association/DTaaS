"""Tests for the lifecycle CLI commands (status / stop / pause / resume)."""

import json
from unittest.mock import patch
import pytest
from click.testing import CliRunner
from python_on_whales.exceptions import DockerException
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def runner():
    """CLI test runner."""
    return CliRunner()


_ROWS = [
    {
        "project": "deployment",
        "service": "traefik",
        "state": "running",
        "health": "healthy",
    },
    {
        "project": "deployment",
        "service": "client",
        "state": "not created",
        "health": None,
    },
]


def test_status_table_output(runner):
    """status prints an aligned table with a header and one row per service."""
    with patch("src.cmd_lifecycle.lifecyclePkg.collect_status", return_value=_ROWS):
        result = runner.invoke(dtaas, ["admin", "status"])

    assert result.exit_code == 0
    assert "PROJECT" in result.output
    assert "traefik" in result.output
    assert "not created" in result.output
    # No healthcheck renders as a dash, never the literal "None".
    assert "None" not in result.output


def test_status_json_output(runner):
    """status --json emits the raw records as parseable JSON."""
    with patch("src.cmd_lifecycle.lifecyclePkg.collect_status", return_value=_ROWS):
        result = runner.invoke(dtaas, ["admin", "status", "--json"])

    assert result.exit_code == 0
    assert json.loads(result.output) == _ROWS


def test_status_reports_no_services(runner):
    """status handles an empty result without crashing on the table renderer."""
    with patch("src.cmd_lifecycle.lifecyclePkg.collect_status", return_value=[]):
        result = runner.invoke(dtaas, ["admin", "status"])

    assert result.exit_code == 0
    assert "No services found." in result.output


def test_status_maps_missing_deployment_to_error(runner):
    """A missing deployment surfaces as a non-zero ClickException."""
    with patch(
        "src.cmd_lifecycle.lifecyclePkg.collect_status",
        side_effect=OSError("No 'docker-compose.yml' found"),
    ):
        result = runner.invoke(dtaas, ["admin", "status"])

    assert result.exit_code != 0
    assert "docker-compose.yml" in result.output


def test_stop_success(runner):
    """stop reports success and forwards the default output dir."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=True
    ), patch("src.cmd_lifecycle.lifecyclePkg.stop") as mock_stop:
        result = runner.invoke(dtaas, ["admin", "stop"])

    assert result.exit_code == 0
    assert "Deployment stopped successfully" in result.output
    mock_stop.assert_called_once_with(".")


def test_stop_reports_absent_installation(runner):
    """stop is a no-op (exit 0) that reports when nothing is installed."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=False
    ), patch("src.cmd_lifecycle.lifecyclePkg.stop") as mock_stop:
        result = runner.invoke(dtaas, ["admin", "stop"])

    assert result.exit_code == 0
    assert "no existing DTaaS / Workspace installation" in result.output
    mock_stop.assert_not_called()


def test_stop_maps_docker_exception(runner):
    """A compose failure during stop surfaces as a non-zero ClickException."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=True
    ), patch(
        "src.cmd_lifecycle.lifecyclePkg.stop",
        side_effect=DockerException(["docker"], 1, stderr=b"daemon down"),
    ):
        result = runner.invoke(dtaas, ["admin", "stop"])

    assert result.exit_code != 0
    assert "daemon down" in result.output


def test_pause_success(runner):
    """pause forwards the output dir and reports success."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=True
    ), patch("src.cmd_lifecycle.lifecyclePkg.pause") as mock_pause:
        result = runner.invoke(dtaas, ["admin", "pause", "--output-dir", "./x"])

    assert result.exit_code == 0
    assert "Deployment paused successfully" in result.output
    mock_pause.assert_called_once_with("./x")


def test_resume_calls_unpause(runner):
    """resume drives the compose unpause path and reports success."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=True
    ), patch("src.cmd_lifecycle.lifecyclePkg.unpause") as mock_unpause:
        result = runner.invoke(dtaas, ["admin", "resume"])

    assert result.exit_code == 0
    assert "Deployment resumed successfully" in result.output
    mock_unpause.assert_called_once_with(".")


def test_start_success(runner):
    """start reports success and forwards the default output dir."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=True
    ), patch("src.cmd_lifecycle.lifecyclePkg.start") as mock_start:
        result = runner.invoke(dtaas, ["admin", "start"])

    assert result.exit_code == 0
    assert "Deployment started successfully" in result.output
    mock_start.assert_called_once_with(".")


def test_start_reports_absent_installation(runner):
    """start is a no-op (exit 0) that reports when nothing is installed."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=False
    ), patch("src.cmd_lifecycle.lifecyclePkg.start") as mock_start:
        result = runner.invoke(dtaas, ["admin", "start"])

    assert result.exit_code == 0
    assert "no existing DTaaS / Workspace installation" in result.output
    mock_start.assert_not_called()


def test_pause_reports_absent_installation(runner):
    """pause is a no-op (exit 0) that reports when nothing is installed."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=False
    ), patch("src.cmd_lifecycle.lifecyclePkg.pause") as mock_pause:
        result = runner.invoke(dtaas, ["admin", "pause"])

    assert result.exit_code == 0
    assert "no existing DTaaS / Workspace installation" in result.output
    mock_pause.assert_not_called()


def test_pause_maps_docker_exception(runner):
    """A compose failure during pause surfaces as a non-zero ClickException."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=True
    ), patch(
        "src.cmd_lifecycle.lifecyclePkg.pause",
        side_effect=DockerException(["docker"], 1, stderr=b"not running"),
    ):
        result = runner.invoke(dtaas, ["admin", "pause"])

    assert result.exit_code != 0
    assert "not running" in result.output


def test_resume_reports_absent_installation(runner):
    """resume is a no-op (exit 0) that reports when nothing is installed."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=False
    ), patch("src.cmd_lifecycle.lifecyclePkg.unpause") as mock_unpause:
        result = runner.invoke(dtaas, ["admin", "resume"])

    assert result.exit_code == 0
    assert "no existing DTaaS / Workspace installation" in result.output
    mock_unpause.assert_not_called()


def test_resume_maps_docker_exception(runner):
    """A compose failure during resume surfaces as a non-zero ClickException."""
    with patch(
        "src.cmd_lifecycle.deployPkg.installation_present", return_value=True
    ), patch(
        "src.cmd_lifecycle.lifecyclePkg.unpause",
        side_effect=DockerException(["docker"], 1, stderr=b"not paused"),
    ):
        result = runner.invoke(dtaas, ["admin", "resume"])

    assert result.exit_code != 0
    assert "not paused" in result.output
