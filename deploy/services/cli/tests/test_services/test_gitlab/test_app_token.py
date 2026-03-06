"""Tests for GitLab OAuth application token management (app_token.py)."""

from unittest.mock import Mock
import json
import pytest
from dtaas_services.pkg.services.gitlab import app_token
# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_SERVER_DNS = "foo.com"


def test_get_server_dns_missing(monkeypatch):
    """Test RuntimeError when SERVER_DNS is not set."""
    monkeypatch.delenv("SERVER_DNS", raising=False)
    with pytest.raises(RuntimeError, match="SERVER_DNS"):
        app_token._get_server_dns()


def test_validate_and_parse_app_response_http_error():
    """Test validation failure on non-200/201 status."""
    response = Mock()
    response.status_code = 422
    response.text = "Validation failed"
    config = app_token.OAuthAppConfig(
        name="App", redirect_uri="https://x", confidential=True, scopes="api"
    )
    success, result, error = app_token._validate_and_parse_app_response(
        response, config
    )
    assert success is False
    assert result is None
    assert "422" in error


def test_validate_and_parse_app_response_bad_json():
    """Test validation failure on JSON parse error."""
    response = Mock()
    response.status_code = 200
    response.json.side_effect = json.JSONDecodeError("x", "y", 0)
    config = app_token.OAuthAppConfig(
        name="App", redirect_uri="https://x", confidential=True, scopes="api"
    )
    success, result, error = app_token._validate_and_parse_app_response(
        response, config
    )
    assert success is False
    assert result is None
    assert "parse" in error.lower()


def test_create_application_request_failure(mocker):
    """Test creating an application when the HTTP request itself fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(False, None, "connection refused"),
    )
    config = app_token.OAuthAppConfig(
        name="MyApp", redirect_uri="https://x", confidential=True, scopes="api"
    )
    success, result, error = app_token.create_application(TEST_TOKEN, config)
    assert success is False
    assert result is None
    assert "connection refused" in error


def test_create_server_application_success(monkeypatch, mocker):
    """Test creating the server OAuth app."""
    monkeypatch.setenv("SERVER_DNS", TEST_SERVER_DNS)
    mock_response = Mock()
    mock_response.status_code = 201
    mock_response.json.return_value = {
        "id": 1,
        "application_name": "DTaaS Server Authorization",
        "application_id": "s-cid",
        "secret": "s-sec",
    }
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    success, result, _ = app_token.create_server_application(TEST_TOKEN)
    assert success is True
    assert result.client_id == "s-cid"


def test_create_client_application_success(monkeypatch, mocker):
    """Test creating the client OAuth app."""
    monkeypatch.setenv("SERVER_DNS", TEST_SERVER_DNS)
    mock_response = Mock()
    mock_response.status_code = 201
    mock_response.json.return_value = {
        "id": 2,
        "application_name": "DTaaS Client Authorization",
        "application_id": "c-cid",
        "secret": "c-sec",
    }
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    success, result, _ = app_token.create_client_application(TEST_TOKEN)
    assert success is True
    assert result.client_id == "c-cid"


def test_validate_and_parse_app_list_http_error():
    """Test list parsing with non-200 status."""
    response = Mock()
    response.status_code = 403
    response.text = "Forbidden"
    success, apps, error = app_token._validate_and_parse_app_list(response)
    assert success is False
    assert apps == []
    assert "403" in error


def test_validate_and_parse_app_list_bad_json():
    """Test list parsing with bad JSON."""
    response = Mock()
    response.status_code = 200
    response.json.side_effect = json.JSONDecodeError("x", "y", 0)
    success, apps, error = app_token._validate_and_parse_app_list(response)
    assert success is False
    assert apps == []
    assert "parse" in error.lower()


def test_list_all_applications_success(mocker):
    """Test listing all applications successfully."""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = [{"id": 1}]
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    success, apps, _ = app_token.list_all_applications(TEST_TOKEN)
    assert success is True
    assert len(apps) == 1


def test_list_all_applications_request_failure(mocker):
    """Test listing applications when request fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(False, None, "timeout"),
    )
    success, apps, error = app_token.list_all_applications(TEST_TOKEN)
    assert success is False
    assert apps == []
    assert "timeout" in error


def test_delete_application_success(mocker):
    """Test deleting an application successfully (HTTP 204)."""
    mock_response = Mock()
    mock_response.status_code = 204
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    success, msg = app_token.delete_application(TEST_TOKEN, 42)
    assert success is True
    assert "deleted" in msg.lower()


def test_delete_application_request_failure(mocker):
    """Test deleting an application when request fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(False, None, "connection error"),
    )
    success, msg = app_token.delete_application(TEST_TOKEN, 42)
    assert success is False
    assert "connection error" in msg


def test_delete_application_wrong_status(mocker):
    """Test deleting an application with unexpected status code."""
    mock_response = Mock()
    mock_response.status_code = 404
    mock_response.text = "Not Found"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    success, msg = app_token.delete_application(TEST_TOKEN, 99)
    assert success is False
    assert "404" in msg
