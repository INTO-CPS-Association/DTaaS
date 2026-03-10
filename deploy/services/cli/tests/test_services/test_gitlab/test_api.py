"""Tests for GitLab low-level REST API client (_api.py)."""

from unittest.mock import Mock
import pytest
import httpx
import dtaas_services.pkg.services.gitlab._api as api
# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_HOSTNAME = "services.foo.com"
TEST_PORT = "8090"


def test_build_base_url_missing_port(monkeypatch):
    """Test RuntimeError when GITLAB_PORT is not set."""
    monkeypatch.delenv("GITLAB_PORT", raising=False)
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    with pytest.raises(RuntimeError, match="GITLAB_PORT"):
        api.build_base_url()


def test_build_base_url_missing_hostname(monkeypatch):
    """Test RuntimeError when HOSTNAME is not set."""
    monkeypatch.setenv("GITLAB_PORT", TEST_PORT)
    monkeypatch.delenv("HOSTNAME", raising=False)
    with pytest.raises(RuntimeError, match="HOSTNAME"):
        api.build_base_url()


def test_build_headers():
    """Test header dict contains PRIVATE-TOKEN."""
    headers = api._build_headers(TEST_TOKEN)
    assert headers == {"PRIVATE-TOKEN": TEST_TOKEN}


def test_gitlab_request_success(monkeypatch, mocker):
    """Test successful API request."""
    monkeypatch.setenv("GITLAB_PORT", TEST_PORT)
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    monkeypatch.setenv("SSL_VERIFY", "false")

    mock_response = Mock(spec=httpx.Response)
    mock_response.status_code = 200
    mocker.patch("httpx.request", return_value=mock_response)

    http_params = {"method": "GET", "endpoint": "/users"}
    success, response, error = api.gitlab_request(http_params, TEST_TOKEN)
    assert success is True
    assert response is mock_response
    assert error == ""


def test_gitlab_request_connect_error(monkeypatch, mocker):
    """Test API request with connection error."""
    monkeypatch.setenv("GITLAB_PORT", TEST_PORT)
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    monkeypatch.setenv("SSL_VERIFY", "false")

    mocker.patch("httpx.request", side_effect=httpx.ConnectError("refused"))
    http_params = {"method": "GET", "endpoint": "/users"}
    success, response, error = api.gitlab_request(http_params, TEST_TOKEN)
    assert success is False
    assert response is None
    assert "HTTP request failed" in error
