"""Tests for Docker command execution utilities."""

from unittest.mock import Mock
from python_on_whales.exceptions import DockerException
from dtaas_services.pkg.docker_utils import (
    execute_docker_command,
    _process_stderr_lines,
    _extract_stderr_line,
    _format_docker_error,
)


def test_execute_docker_command_success(mocker):
    """Test successful Docker command execution"""
    mock_docker_client = mocker.patch("dtaas_services.pkg.docker_utils.DockerClient")
    mock_client = Mock()
    mock_docker_client.return_value = mock_client
    mock_client.execute.return_value = "command output"
    success, output = execute_docker_command("test_container", ["echo", "hello"])
    assert success is True
    assert output == "command output"
    mock_client.execute.assert_called_once_with("test_container", ["echo", "hello"])


def test_execute_docker_command_failure(mocker):
    """Test Docker command execution failure"""
    mock_docker_client = mocker.patch("dtaas_services.pkg.docker_utils.DockerClient")
    mock_client = Mock()
    mock_docker_client.return_value = mock_client
    mock_client.execute.side_effect = DockerException(
        ["docker", "exec"], 1, b"", b"Docker error"
    )
    success, output = execute_docker_command("test_container", ["bad", "command"])
    assert success is False
    assert "Docker error:" in output
    assert "Docker error" in output


def test_process_stderr_lines_empty():
    """Test processing empty stderr"""
    result = _process_stderr_lines("")
    assert result == "Unknown error"


def test_extract_stderr_line_no_stderr_content():
    """Test extraction when no stderr content"""
    error_str = "First line of error\nSecond line"
    result = _extract_stderr_line(error_str)
    assert result == "First line of error"


def test_format_docker_error_no_such_container():
    """Test formatting 'No such container' error"""
    error = "No such container: my-container"
    result = _format_docker_error("my-container", error)
    assert "not running" in result
    assert "dtaas-services start" in result
