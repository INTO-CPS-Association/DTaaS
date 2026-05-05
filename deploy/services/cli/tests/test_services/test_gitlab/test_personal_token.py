"""Tests for GitLab Personal Access Token creation (personal_token.py)."""

import json
from unittest.mock import MagicMock, Mock

import httpx
from gitlab.exceptions import GitlabError

from dtaas_services.pkg.services.gitlab import personal_token as pt

# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"
BASE_URL = "https://example.com:8090/gitlab"


def test_get_oauth_token_success(mocker):
    """Test successful OAuth ROPC token retrieval."""
    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"access_token": "oauth-abc123"}

    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.httpx.post",
        return_value=mock_resp,
    )

    success, token = pt._get_oauth_token(BASE_URL, "rootpassword", True)

    assert success is True
    assert token == "oauth-abc123"


def test_get_oauth_token_non_200(mocker):
    """Test OAuth failure when GitLab returns a non-200 status."""
    mock_resp = Mock()
    mock_resp.status_code = 401
    mock_resp.text = "Unauthorized"

    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.httpx.post",
        return_value=mock_resp,
    )

    success, msg = pt._get_oauth_token(BASE_URL, "wrongpassword", True)

    assert success is False
    assert "401" in msg


def test_get_oauth_token_missing_field(mocker):
    """Test OAuth failure when response body lacks access_token."""
    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {}

    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.httpx.post",
        return_value=mock_resp,
    )

    success, msg = pt._get_oauth_token(BASE_URL, "rootpassword", True)

    assert success is False
    assert "No access_token" in msg


def test_get_oauth_token_network_error(mocker):
    """Test OAuth failure on a network error."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.httpx.post",
        side_effect=httpx.RequestError("connection refused"),
    )

    success, msg = pt._get_oauth_token(BASE_URL, "rootpassword", True)

    assert success is False
    assert "OAuth request failed" in msg


def test_revoke_existing_pats_revokes_matching():
    """Test that only PATs with the matching name are deleted."""
    keep_pat = Mock()
    keep_pat.name = "other-token"

    revoke_pat = Mock()
    revoke_pat.name = "dtaas-services"

    mock_gl = MagicMock()
    mock_gl.personal_access_tokens.list.return_value = [keep_pat, revoke_pat]

    pt._revoke_existing_pats(mock_gl, "dtaas-services")

    revoke_pat.delete.assert_called_once()
    keep_pat.delete.assert_not_called()


def test_revoke_existing_pats_no_match():
    """Test that no PATs are deleted when none match the name."""
    pat = Mock()
    pat.name = "unrelated"

    mock_gl = MagicMock()
    mock_gl.personal_access_tokens.list.return_value = [pat]

    pt._revoke_existing_pats(mock_gl, "dtaas-services")


def test_create_pat_via_api_success(mocker):
    """Test PAT creation via API succeeds."""
    mock_pat = Mock()
    mock_pat.token = TEST_TOKEN

    mock_user = Mock()
    mock_user.personal_access_tokens.create.return_value = mock_pat

    mock_gl = MagicMock()
    mock_gl.personal_access_tokens.list.return_value = []
    mock_gl.users.get.return_value = mock_user

    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.build_base_url",
        return_value=BASE_URL,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.get_ssl_verify",
        return_value=True,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.gitlab.Gitlab",
        return_value=mock_gl,
    )

    success, token = pt._create_pat_via_api("oauth-token")

    assert success is True
    assert token == TEST_TOKEN


def test_create_pat_via_api_empty_token(mocker):
    """Test PAT creation fails when API returns an empty token."""
    mock_pat = Mock()
    mock_pat.token = ""

    mock_user = Mock()
    mock_user.personal_access_tokens.create.return_value = mock_pat

    mock_gl = MagicMock()
    mock_gl.personal_access_tokens.list.return_value = []
    mock_gl.users.get.return_value = mock_user

    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.build_base_url",
        return_value=BASE_URL,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.get_ssl_verify",
        return_value=True,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.gitlab.Gitlab",
        return_value=mock_gl,
    )

    success, msg = pt._create_pat_via_api("oauth-token")

    assert success is False
    assert "Empty token" in msg


def test_create_pat_via_api_gitlab_error(mocker):
    """Test PAT creation fails on GitlabError."""
    mock_gl = MagicMock()
    mock_gl.personal_access_tokens.list.return_value = []
    mock_gl.users.get.side_effect = GitlabError("forbidden")

    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.build_base_url",
        return_value=BASE_URL,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.get_ssl_verify",
        return_value=True,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.gitlab.Gitlab",
        return_value=mock_gl,
    )

    success, msg = pt._create_pat_via_api("oauth-token")

    assert success is False
    assert "Failed to create PAT via API" in msg


def test_create_pat_success(mocker):
    """Test full PAT creation flow succeeds end-to-end."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.build_base_url",
        return_value=BASE_URL,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.get_ssl_verify",
        return_value=True,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._get_oauth_token",
        return_value=(True, "oauth-abc"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._create_pat_via_api",
        return_value=(True, TEST_TOKEN),
    )

    success, token = pt.create_pat("rootpassword")

    assert success is True
    assert token == TEST_TOKEN


def test_create_pat_oauth_failure(mocker):
    """Test PAT creation fails when OAuth token request fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.build_base_url",
        return_value=BASE_URL,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.get_ssl_verify",
        return_value=True,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._get_oauth_token",
        return_value=(False, "connection refused"),
    )

    success, msg = pt.create_pat("rootpassword")

    assert success is False
    assert "Failed to obtain OAuth token" in msg


def test_read_tokens_file_empty_pat(tmp_path):
    """Test reading tokens file with empty PAT."""
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text(json.dumps({"personal_access_token": ""}), encoding="utf-8")
    success, msg = pt._read_tokens_file(tokens_file)
    assert success is False
    assert "empty" in msg


def test_read_tokens_file_invalid_json(tmp_path):
    """Test reading tokens file with invalid JSON."""
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text("not valid json{{{", encoding="utf-8")
    success, msg = pt._read_tokens_file(tokens_file)
    assert success is False
    assert "Failed to read token file" in msg


def test_load_pat_from_tokens_success(mocker, tmp_path):
    """Test loading PAT when file exists."""
    tokens_file = tmp_path / "config" / "gitlab_tokens.json"
    tokens_file.parent.mkdir(parents=True)
    tokens_file.write_text(
        json.dumps({"personal_access_token": TEST_TOKEN}), encoding="utf-8"
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._get_tokens_path",
        return_value=tokens_file,
    )
    success, pat = pt._load_pat_from_tokens()
    assert success is True
    assert pat == TEST_TOKEN


def test_create_user_pat_success():
    """Test creating a PAT for a user succeeds."""
    gl = MagicMock()
    mock_user = Mock()
    mock_pat = Mock()
    mock_pat.token = TEST_TOKEN
    mock_user.personal_access_tokens.create.return_value = mock_pat
    gl.users.get.return_value = mock_user

    success, token = pt.create_user_pat(gl, 42, TEST_USERNAME)
    assert success is True
    assert token == TEST_TOKEN


def test_create_user_pat_request_failure():
    """Test creating a PAT fails on API error."""
    gl = MagicMock()
    gl.users.get.side_effect = GitlabError("timeout")

    success, error = pt.create_user_pat(gl, 42, TEST_USERNAME)
    assert success is False
    assert "timeout" in error


def test_create_user_pat_empty_token():
    """Test creating a PAT that returns an empty token."""
    gl = MagicMock()
    mock_user = Mock()
    mock_pat = Mock()
    mock_pat.token = ""
    mock_user.personal_access_tokens.create.return_value = mock_pat
    gl.users.get.return_value = mock_user

    success, error = pt.create_user_pat(gl, 42, TEST_USERNAME)
    assert success is False
    assert "Empty token" in error
