"""Tests for ThingsBoard utility functions."""

import os
import json
import concurrent.futures
from unittest.mock import Mock, MagicMock
import pytest
import click
import httpx
from dtaas_services.pkg.services.thingsboard import tb_utility
# pylint: disable=W0212, W0621

# Test constants
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"


@pytest.fixture
def mock_docker():
    """Mock Docker client"""
    mock = Mock()
    mock.compose = Mock()
    return mock


@pytest.fixture
def mock_console():
    """Mock Rich console"""
    mock = Mock()
    # Mock the status context manager
    mock.status.return_value.__enter__ = Mock(return_value=Mock())
    mock.status.return_value.__exit__ = Mock(return_value=None)
    return mock


def test_is_json_parse_error_true():
    """Test JSON parse error detection"""
    # Function checks if 'json' is in str(exception).lower()
    exception = ValueError("Invalid JSON format")
    assert tb_utility.is_json_parse_error(exception) is True


def test_run_install(mock_docker):
    """Test ThingsBoard installation run"""
    tb_utility._run_install(mock_docker)
    mock_docker.compose.run.assert_called_once_with(
        "thingsboard-ce",
        remove=True,
        envs={"INSTALL_TB": "true", "LOAD_DEMO": "false"},
        service_ports=False,
        use_aliases=True,
        user="root",
    )


def test_run_thingsboard_install_timeout(mock_docker, mock_console, mocker):
    """Test ThingsBoard installation timeout"""
    mocker.patch.dict(os.environ, {"THINGSBOARD_INSTALL_TIMEOUT": "10"})
    mock_executor_class = mocker.patch("concurrent.futures.ThreadPoolExecutor")
    mock_executor = MagicMock()
    mock_future = MagicMock()
    mock_future.result.side_effect = concurrent.futures.TimeoutError()
    mock_executor.submit.return_value = mock_future
    mock_executor.__enter__.return_value = mock_executor
    mock_executor.__exit__.return_value = None
    mock_executor_class.return_value = mock_executor

    with pytest.raises(click.ClickException) as exc_info:
        tb_utility.run_thingsboard_install(mock_console, mock_docker)
    assert "timed out" in str(exc_info.value)


def test_run_thingsboard_install_error(mock_docker, mock_console, mocker):
    """Test ThingsBoard installation error"""
    mock_executor_class = mocker.patch("concurrent.futures.ThreadPoolExecutor")
    mock_executor = MagicMock()
    mock_future = MagicMock()
    mock_future.result.side_effect = Exception("Install failed")
    mock_executor.submit.return_value = mock_future
    mock_executor.__enter__.return_value = mock_executor
    mock_executor.__exit__.return_value = None
    mock_executor_class.return_value = mock_executor

    with pytest.raises(click.ClickException) as exc_info:
        tb_utility.run_thingsboard_install(mock_console, mock_docker)
    assert "failed" in str(exc_info.value)


def test_handle_login_response_json_error():
    """Test login response with JSON decode error"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.side_effect = json.JSONDecodeError("msg", "doc", 0)
    token = tb_utility.handle_login_response(mock_response)
    assert token is None


def test_log_login_error_ssl(mocker):
    """Test logging SSL error"""
    error = httpx.HTTPError("certificate verify failed")
    mock_logger = mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_utility.logger"
    )
    tb_utility._log_login_error(error)
    mock_logger.error.assert_called_once()
    call_args = str(mock_logger.error.call_args)
    assert "SSL" in call_args


def test_process_login_response_success():
    """Test processing successful login response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"token": "test_token"}
    token = tb_utility._process_login_response(mock_response)
    assert token == "test_token"


def test_process_login_response_unauthorized():
    """Test processing unauthorized response"""
    mock_response = Mock()
    mock_response.status_code = 401
    token = tb_utility._process_login_response(mock_response)
    assert token is None


def test_login_network_error_with_retries(mocker):
    """Test login with network error and retries"""
    mock_post = mocker.patch(
        "httpx.post", side_effect=httpx.HTTPError("Connection error")
    )
    mocker.patch("time.sleep")
    token = tb_utility.login("https://localhost:8080", TEST_EMAIL, TEST_PASSWORD)
    assert token is None
    assert mock_post.call_count == 3  # 3 retries


def test_login_server_error_with_retries(mocker):
    """Test login with server error and retries"""
    mock_response = Mock(status_code=500)
    mock_post = mocker.patch("httpx.post", return_value=mock_response)
    mocker.patch("time.sleep")
    mocker.patch("builtins.print")
    token = tb_utility.login("https://localhost:8080", TEST_EMAIL, TEST_PASSWORD)
    assert token is None
    assert mock_post.call_count == 3  # 3 retries


def test_verify_admin_login_success(mocker):
    """Test successful admin login verification"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_utility.login",
        return_value="test_token",
    )
    success, msg = tb_utility.verify_admin_login(
        "https://localhost:8080", TEST_EMAIL, TEST_PASSWORD
    )
    assert success is True
    assert msg == ""


def test_verify_admin_login_failure(mocker):
    """Test failed admin login verification"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_utility.login",
        return_value=None,
    )
    success, msg = tb_utility.verify_admin_login(
        "https://localhost:8080", TEST_EMAIL, TEST_PASSWORD
    )
    assert success is False
    assert "verification failed" in msg
