"""Tests for ThingsBoard shared activation utilities."""

from unittest.mock import Mock
import httpx
from dtaas_services.pkg.services.thingsboard import activation as act

# pylint: disable=W0212


def test_extract_token_from_link_missing_token():
    """Test extracting activation token from a link without token."""
    token, error = act._extract_token_from_link("https://example.com/no-token")
    assert token is None
    assert "Could not extract" in error


def test_get_activation_token_success():
    """Test getting activation token - success."""
    session = Mock()
    session.get.return_value = Mock(status_code=200, text="link?activateToken=token123")
    token, error = act.get_activation_token("https://localhost:8080", session, "uid")
    assert token == "token123"
    assert error == ""


def test_get_activation_token_bad_status():
    """Test getting activation token - non-200 status."""
    session = Mock()
    session.get.return_value = Mock(status_code=404, text="Not Found")
    token, error = act.get_activation_token("https://localhost:8080", session, "uid")
    assert token is None
    assert "Failed" in error


def test_get_activation_token_network_error():
    """Test getting activation token - network error."""
    session = Mock()
    session.get.side_effect = httpx.HTTPError("Connection failed")
    token, error = act.get_activation_token("https://localhost:8080", session, "uid")
    assert token is None
    assert "Network error" in error


def test_handle_activate_error_ssl():
    """Test activation error handler - SSL error."""
    exc = httpx.HTTPError("SSL certificate verify failed")
    success, msg = act._handle_activate_error(exc)
    assert success is False
    assert "SSL" in msg


def test_activate_user_success(mocker):
    """Test user activation - success."""
    mocker.patch("httpx.post", return_value=Mock(status_code=200))
    success, error = act.activate_user("https://localhost:8080", "token", "pass")
    assert success is True
    assert error == ""


def test_activate_user_failure(mocker):
    """Test user activation - non-200 status."""
    mocker.patch("httpx.post", return_value=Mock(status_code=400))
    success, error = act.activate_user("https://localhost:8080", "token", "pass")
    assert success is False
    assert "Failed" in error


def test_activate_user_network_error(mocker):
    """Test user activation - network error."""
    mocker.patch("httpx.post", side_effect=httpx.HTTPError("Connection refused"))
    success, error = act.activate_user("https://localhost:8080", "token", "pass")
    assert success is False
    assert "Network error" in error
