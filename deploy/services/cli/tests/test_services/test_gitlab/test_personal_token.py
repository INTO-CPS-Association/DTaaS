"""Tests for GitLab Personal Access Token creation (personal_token.py)."""

import json
from pathlib import Path
from unittest.mock import Mock

from dtaas_services.pkg.services.gitlab import personal_token as pt
# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"

def test_parse_token_from_output_too_short():
    """Test parsing when token is too short (< 10 chars)."""
    output = "short\n"
    assert pt._parse_token_from_output(output) is None


def test_execute_rails_command_success(mocker):
    """Test successful rails command execution."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.execute_docker_command",
        return_value=(True, "glpat-token12345678"),
    )
    success, output = pt._execute_rails_command()
    assert success is True
    assert "glpat" in output


def test_extract_and_validate_token_parse_failure():
    """Test token extraction when parsing fails."""
    output = ""
    success, msg = pt._extract_and_validate_token(output)
    assert success is False
    assert "Could not parse token" in msg


def test_create_personal_access_token_success(mocker):
    """Test full PAT creation flow."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._execute_rails_command",
        return_value=(True, "glpat-realtoken12345678"),
    )
    success, token = pt.create_personal_access_token()
    assert success is True
    assert token == "glpat-realtoken12345678"


def test_create_personal_access_token_exec_failure(mocker):
    """Test PAT creation when docker exec fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._execute_rails_command",
        return_value=(False, "error: gitlab not running"),
    )
    success, msg = pt.create_personal_access_token()
    assert success is False
    assert "Failed to create Personal Access Token" in msg


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


def test_parse_user_pat_response_bad_status():
    """Test parsing a failed PAT creation response."""
    response = Mock()
    response.status_code = 403
    response.text = "Forbidden"
    success, error = pt._parse_user_pat_response(response, TEST_USERNAME)
    assert success is False
    assert "403" in error


def test_parse_user_pat_response_empty_token():
    """Test parsing a response that contains an empty token."""
    response = Mock()
    response.status_code = 201
    response.json.return_value = {"token": ""}
    success, error = pt._parse_user_pat_response(response, TEST_USERNAME)
    assert success is False
    assert "Empty token" in error


def test_create_user_pat_success(mocker):
    """Test creating a PAT for a user succeeds."""
    mock_response = Mock()
    mock_response.status_code = 201
    mock_response.json.return_value = {"token": TEST_TOKEN}
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    success, token = pt.create_user_pat(TEST_TOKEN, 42, TEST_USERNAME)
    assert success is True
    assert token == TEST_TOKEN


def test_create_user_pat_request_failure(mocker):
    """Test creating a PAT fails on request error."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.gitlab_request",
        return_value=(False, None, "timeout"),
    )
    success, error = pt.create_user_pat(TEST_TOKEN, 42, TEST_USERNAME)
    assert success is False
    assert "timeout" in error
