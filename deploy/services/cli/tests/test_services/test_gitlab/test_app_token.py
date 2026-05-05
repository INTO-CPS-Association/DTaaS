"""Tests for GitLab OAuth application token management (app_token.py)."""

import json
from unittest.mock import Mock, MagicMock
import pytest
from gitlab.exceptions import GitlabError
from dtaas_services.pkg.services.gitlab import app_token
# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR

MOCK_OAUTH_JSON = [
    {
        "name": "DTaaS Server Authorization",
        "redirect_uri": "https://example.com/_oauth",
        "confidential": True,
        "scopes": "read_user",
        "trusted": False,
    },
    {
        "name": "DTaaS Client Authorization",
        "redirect_uri": "https://example.com/Library",
        "confidential": False,
        "scopes": "api openid profile read_repository read_user",
        "trusted": True,
    },
]


def test_load_oauth_apps_config_success(tmp_path, monkeypatch):
    """Test loading config from the default filename."""
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / "gitlab_oauth.json").write_text(json.dumps(MOCK_OAUTH_JSON))
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("OAUTH_APPS", raising=False)

    result = app_token._load_oauth_apps_config()
    assert len(result) == 2
    assert result[0]["name"] == "DTaaS Server Authorization"


def test_load_oauth_apps_config_missing_file(tmp_path, monkeypatch):
    """Test FileNotFoundError when config file is absent."""
    (tmp_path / "config").mkdir()
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("OAUTH_APPS", raising=False)

    with pytest.raises(FileNotFoundError, match="gitlab_oauth.json"):
        app_token._load_oauth_apps_config()


def test_build_apps_config_missing_redirect_uri(mocker):
    """Test KeyError when redirect_uri is missing from an entry."""
    bad_data = [{"name": "Broken App", "confidential": False, "scopes": "api"}]
    mocker.patch.object(app_token, "_load_oauth_apps_config", return_value=bad_data)

    with pytest.raises(KeyError, match="redirect_uri"):
        app_token._build_apps_config()


def test_create_server_application_missing_server(mocker):
    """Test error returned when no server app is found in the config."""
    client_only = [MOCK_OAUTH_JSON[1]]
    mocker.patch.object(app_token, "_load_oauth_apps_config", return_value=client_only)

    success, result, error = app_token.create_server_application("tok")
    assert success is False
    assert result is None
    assert "Server Authorization" in error


def test_create_client_application_missing_client(mocker):
    """Test error returned when no client app is found in the config."""
    server_only = [MOCK_OAUTH_JSON[0]]
    mocker.patch.object(app_token, "_load_oauth_apps_config", return_value=server_only)

    success, result, error = app_token.create_client_application("tok")
    assert success is False
    assert result is None
    assert "Client Authorization" in error


def test_create_application_request_failure(mocker):
    """Test creating an application when the API request fails."""
    mock_gl = MagicMock()
    mock_gl.applications.create.side_effect = GitlabError("connection refused")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )
    config = app_token.OAuthAppConfig(
        name="MyApp",
        redirect_uri="https://services.intocps.org/callback",
        confidential=True,
        scopes="api",
    )
    success, result, error = app_token.create_application(TEST_TOKEN, config)
    assert success is False
    assert result is None
    assert "connection refused" in error


def _mock_gitlab_app(app_id, name, client_id, secret):
    mock_app = Mock()
    mock_app.id = app_id
    mock_app.application_name = name
    mock_app.application_id = client_id
    mock_app.secret = secret
    return mock_app


def test_create_server_application_success(mocker):
    """Test creating the server OAuth app."""
    mocker.patch.object(
        app_token, "_load_oauth_apps_config", return_value=MOCK_OAUTH_JSON
    )

    mock_gl = MagicMock()
    mock_gl.applications.create.return_value = _mock_gitlab_app(
        1, "DTaaS Server Authorization", "s-cid", "s-sec"
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.get_gitlab_client",
        return_value=mock_gl,
    )

    success, result, _ = app_token.create_server_application(TEST_TOKEN)
    assert success is True
    assert result is not None
    assert result.client_id == "s-cid"


def test_create_client_application_success(mocker):
    """Test creating the client OAuth app."""
    mocker.patch.object(
        app_token, "_load_oauth_apps_config", return_value=MOCK_OAUTH_JSON
    )

    mock_gl = MagicMock()
    mock_gl.applications.create.return_value = _mock_gitlab_app(
        2, "DTaaS Client Authorization", "c-cid", "c-sec"
    )
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
