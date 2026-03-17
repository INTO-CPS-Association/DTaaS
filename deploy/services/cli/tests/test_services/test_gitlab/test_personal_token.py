"""Tests for GitLab Personal Access Token creation (personal_token.py)."""

import json
from unittest.mock import Mock, MagicMock
from gitlab.exceptions import GitlabError
from dtaas_services.pkg.services.gitlab import personal_token as pt
# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"


def test_parse_token_from_output_too_short():
    """Test parsing when token is too short (< 10 chars)."""
    output = "short\n"
    assert pt._parse_token_from_output(output) is None


def test_parse_token_from_output_invalid_characters():
    """Test parsing when token contains unexpected characters."""
    output = "glpat-bad-token;rm\n"
    assert pt._parse_token_from_output(output) is None


def test_build_rails_script_invalid_token_name_raises():
    """Test rails script generation rejects unsafe token names."""
    unsafe_name = "bad'; system('id'); '"
    try:
        pt._build_rails_script(unsafe_name)
        assert False, "Expected ValueError for invalid token name"
    except ValueError as exc:
        assert "Invalid token name" in str(exc)


def test_execute_rails_command_success(mocker):
    """Test successful rails command execution."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.execute_docker_command",
        return_value=(True, "glpat-token12345678"),
    )
    success, output = pt._execute_rails_command()
    assert success is True
    assert "glpat" in output


def test_execute_rails_command_invalid_pat_name(mocker):
    """Test rails command fails early for invalid PAT names."""
    mock_exec = mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.execute_docker_command"
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.PAT_NAME", "bad name"
    )

    success, output = pt._execute_rails_command()

    assert success is False
    assert "Invalid token name" in output
    mock_exec.assert_not_called()


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
