"""Tests for GitLab OAuth application token management (app_token.py)."""

from unittest.mock import Mock, MagicMock
import pytest
from gitlab.exceptions import GitlabError
from dtaas_services.pkg.services.gitlab import app_token
# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_SERVER_DNS = "intocps.org"


def test_get_server_dns_missing(monkeypatch):
    """Test RuntimeError when HOSTNAME is not set."""
    monkeypatch.delenv("HOSTNAME", raising=False)
    with pytest.raises(RuntimeError, match="HOSTNAME"):
        app_token._get_server_dns()


def test_create_application_request_failure(mocker):
    """Test creating an application when the API request fails."""
    mock_gl = MagicMock()
    mock_gl.applications.create.side_effect = GitlabError("connection refused")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
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
    monkeypatch.setenv("HOSTNAME", TEST_SERVER_DNS)
    mock_gl = MagicMock()
    mock_app = Mock()
    mock_app.id = 1
    mock_app.application_name = "DTaaS Server Authorization"
    mock_app.application_id = "s-cid"
    mock_app.secret = "s-sec"
    mock_gl.applications.create.return_value = mock_app
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )
    success, result, _ = app_token.create_server_application(TEST_TOKEN)
    assert success is True
    assert result is not None
    assert result.client_id == "s-cid"


def test_create_client_application_success(monkeypatch, mocker):
    """Test creating the client OAuth app."""
    monkeypatch.setenv("HOSTNAME", TEST_SERVER_DNS)
    mock_gl = MagicMock()
    mock_app = Mock()
    mock_app.id = 2
    mock_app.application_name = "DTaaS Client Authorization"
    mock_app.application_id = "c-cid"
    mock_app.secret = "c-sec"
    mock_gl.applications.create.return_value = mock_app
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )
    success, result, _ = app_token.create_client_application(TEST_TOKEN)
    assert success is True
    assert result is not None
    assert result.client_id == "c-cid"


def test_list_all_applications_success(mocker):
    """Test listing all applications successfully."""
    mock_gl = MagicMock()
    mock_app = Mock()
    mock_app.attributes = {"id": 1}
    mock_gl.applications.list.return_value = [mock_app]
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )
    success, apps, _ = app_token.list_all_applications(TEST_TOKEN)
    assert success is True
    assert len(apps) == 1
    assert apps[0] == {"id": 1}


def test_list_all_applications_request_failure(mocker):
    """Test listing applications when request fails."""
    mock_gl = MagicMock()
    mock_gl.applications.list.side_effect = GitlabError("timeout")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )
    success, apps, error = app_token.list_all_applications(TEST_TOKEN)
    assert success is False
    assert apps == []
    assert "timeout" in error


def test_delete_application_success(mocker):
    """Test deleting an application successfully."""
    mock_gl = MagicMock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )
    success, msg = app_token.delete_application(TEST_TOKEN, 42)
    assert success is True
    assert "deleted" in msg.lower()
    mock_gl.applications.delete.assert_called_once_with(42)


def test_delete_application_request_failure(mocker):
    """Test deleting an application when request fails."""
    mock_gl = MagicMock()
    mock_gl.applications.delete.side_effect = GitlabError("connection error")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )
    success, msg = app_token.delete_application(TEST_TOKEN, 42)
    assert success is False
    assert "connection error" in msg
