"""Tests for GitLab user management via REST API (users.py)."""

import json
from pathlib import Path
from unittest.mock import Mock
from dtaas_services.pkg.services.gitlab import users
# pylint: disable=W0212, W0621

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_PASSWORD = "UserP@ss123"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"
TEST_EMAIL = "test@example.com"


def test_get_tokens_path(mocker):
    """Test tokens path construction."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.Config.get_base_dir",
        return_value=Path("/srv/dtaas"),
    )
    result = users._get_tokens_path()
    assert result == Path("/srv/dtaas/config/gitlab_tokens.json")


def test_read_tokens_file_empty_pat(tmp_path):
    """Test reading tokens file with empty PAT."""
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text(json.dumps({"personal_access_token": ""}), encoding="utf-8")
    success, msg = users._read_tokens_file(tokens_file)
    assert success is False
    assert "empty" in msg


def test_read_tokens_file_invalid_json(tmp_path):
    """Test reading tokens file with invalid JSON."""
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text("not valid json{{{", encoding="utf-8")
    success, msg = users._read_tokens_file(tokens_file)
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
        "dtaas_services.pkg.services.gitlab.users._get_tokens_path",
        return_value=tokens_file,
    )
    success, pat = users._load_pat_from_tokens()
    assert success is True
    assert pat == TEST_TOKEN


def test_load_pat_from_tokens_file_missing(mocker, tmp_path):
    """Test loading PAT when file does not exist."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._get_tokens_path",
        return_value=tmp_path / "nonexistent.json",
    )
    success, msg = users._load_pat_from_tokens()
    assert success is False
    assert "Token file not found" in msg
    assert "install" in msg.lower()


def test_evaluate_user_response_409():
    """Test evaluating a 409 Conflict (user exists) response."""
    response = Mock()
    response.status_code = 409
    success, error = users._evaluate_user_response(response, TEST_USERNAME)
    assert success is True
    assert error == ""


def test_evaluate_user_response_422():
    """Test evaluating a 422 validation error response."""
    response = Mock()
    response.status_code = 422
    response.text = "Validation failed"
    success, error = users._evaluate_user_response(response, TEST_USERNAME)
    assert success is False
    assert "422" in error


def test_create_single_user_success(mocker):
    """Test creating a single user successfully."""
    mock_response = Mock()
    mock_response.status_code = 201
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    success, error = users._create_single_user(
        TEST_TOKEN, TEST_USERNAME, TEST_EMAIL, TEST_PASSWORD
    )
    assert success is True
    assert error == ""


def test_create_single_user_request_failure(mocker):
    """Test creating a user when HTTP request fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.gitlab_request",
        return_value=(False, None, "connection refused"),
    )
    success, error = users._create_single_user(
        TEST_TOKEN, TEST_USERNAME, TEST_EMAIL, TEST_PASSWORD
    )
    assert success is False
    assert "connection refused" in error


def test_create_users_from_rows_success(mocker):
    """Test creating users from CSV rows."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        return_value=(True, ""),
    )
    rows = [
        {"username": "user1", "email": "u1@x.com", "password": "pass1"},
        {"username": "user2", "email": "u2@x.com", "password": "pass2"},
    ]
    success, error = users._create_users_from_rows(TEST_TOKEN, iter(rows))
    assert success is True
    assert error == ""


def test_create_users_from_rows_failure_stops(mocker):
    """Test that row processing stops on first failure."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        side_effect=[(True, ""), (False, "user2 failed")],
    )
    rows = [
        {"username": "user1", "email": "u1@x.com", "password": "pass1"},
        {"username": "user2", "email": "u2@x.com", "password": "pass2"},
        {"username": "user3", "email": "u3@x.com", "password": "pass3"},
    ]
    success, error = users._create_users_from_rows(TEST_TOKEN, iter(rows))
    assert success is False
    assert "user2 failed" in error


def test_process_credentials_success(mocker, tmp_path):
    """Test processing credentials file successfully."""
    creds_file = tmp_path / "credentials.csv"
    creds_file.write_text(
        "username,password,email\nuser1,pass1,u1@x.com\n", encoding="utf-8"
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_users_from_rows",
        return_value=(True, ""),
    )
    success, _ = users._process_credentials(TEST_TOKEN, creds_file)
    assert success is True


def test_process_credentials_file_not_found():
    """Test processing credentials when file does not exist."""
    success, error = users._process_credentials(
        TEST_TOKEN, Path("/nonexistent/creds.csv")
    )
    assert success is False
    assert "Error reading credentials file" in error


def test_load_gitlab_prerequisites_success(mocker, tmp_path):
    """Test loading prerequisites with PAT and credentials file."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_pat_from_tokens",
        return_value=(True, TEST_TOKEN),
    )
    creds_file = tmp_path / "credentials.csv"
    creds_file.write_text("username,password,email\n", encoding="utf-8")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.get_credentials_path",
        return_value=creds_file,
    )
    success, pat, creds = users._load_gitlab_prerequisites()
    assert success is True
    assert pat == TEST_TOKEN
    assert creds == creds_file


def test_load_gitlab_prerequisites_no_pat(mocker):
    """Test loading prerequisites when PAT is missing."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_pat_from_tokens",
        return_value=(False, "Token file not found"),
    )
    success, msg, _ = users._load_gitlab_prerequisites()
    assert success is False
    assert "Token file not found" in msg


def test_load_gitlab_prerequisites_no_creds_file(mocker, tmp_path):
    """Test loading prerequisites when credentials file is missing."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_pat_from_tokens",
        return_value=(True, TEST_TOKEN),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.get_credentials_path",
        return_value=tmp_path / "nonexistent.csv",
    )
    success, msg, _ = users._load_gitlab_prerequisites()
    assert success is False
    assert "Credentials file not found" in msg


def test_setup_gitlab_users_success(mocker):
    """Test full user setup flow."""
    mocker.patch("dtaas_services.pkg.services.gitlab.users.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_gitlab_prerequisites",
        return_value=(True, TEST_TOKEN, Path("/test/creds.csv")),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._process_credentials",
        return_value=(True, ""),
    )
    success, msg = users.setup_gitlab_users()
    assert success is True
    assert "created successfully" in msg


def test_setup_gitlab_users_prereq_fails(mocker):
    """Test user setup when prerequisites fail."""
    mocker.patch("dtaas_services.pkg.services.gitlab.users.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_gitlab_prerequisites",
        return_value=(False, "Token file not found", Path()),
    )
    success, msg = users.setup_gitlab_users()
    assert success is False
    assert "Token file not found" in msg


def test_setup_gitlab_users_process_fails(mocker):
    """Test user setup when credential processing fails."""
    mocker.patch("dtaas_services.pkg.services.gitlab.users.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_gitlab_prerequisites",
        return_value=(True, TEST_TOKEN, Path("/test/creds.csv")),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._process_credentials",
        return_value=(False, "API error for user2"),
    )
    success, msg = users.setup_gitlab_users()
    assert success is False
    assert "API error" in msg
