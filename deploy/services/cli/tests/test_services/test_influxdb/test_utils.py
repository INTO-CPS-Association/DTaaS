# pylint: disable=redefined-outer-name
"""Tests for InfluxDB utility functions (_utils.py)"""

from dtaas_services.pkg.services.influxdb._utils import (
    parse_json_response,
    execute_influxdb_command,
)

UTILS_PATH = "dtaas_services.pkg.services.influxdb._utils"


def test_parse_json_response_success():
    """Test successful JSON parsing"""
    success, data, error = parse_json_response('[{"name": "user1"}]')
    assert success is True
    assert data == [{"name": "user1"}]
    assert error == ""


def test_parse_json_response_invalid_json():
    """Test JSON parsing with invalid JSON string"""
    success, data, error = parse_json_response("{invalid json")
    assert success is False
    assert data is None
    assert "Failed to parse JSON" in error


def test_parse_json_response_key_error(mocker):
    """Test JSON parsing with KeyError"""
    mocker.patch("json.loads", side_effect=KeyError("missing key"))
    success, data, error = parse_json_response('{"test": "value"}')
    assert success is False
    assert data is None
    assert "Unexpected data format" in error


def test_execute_influxdb_command_success(mocker):
    """Test successful InfluxDB command execution"""
    mock_exec = mocker.patch(f"{UTILS_PATH}.execute_docker_command")
    mock_exec.return_value = (True, "success output")
    success, output = execute_influxdb_command(
        ["influx", "user", "list"], "Failed to list users"
    )
    assert success is True
    assert output == "success output"


def test_execute_influxdb_command_failure(mocker):
    """Test failed InfluxDB command execution"""
    mock_exec = mocker.patch(f"{UTILS_PATH}.execute_docker_command")
    mock_exec.return_value = (False, "command failed")
    success, error = execute_influxdb_command(
        ["influx", "user", "list"], "Failed to list users"
    )
    assert success is False
    assert "Failed to list users" in error
