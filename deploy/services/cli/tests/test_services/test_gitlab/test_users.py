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


def test_evaluate_user_response_201():
    """Test evaluating a 201 Created response returns user_id."""
    response = Mock()
    response.status_code = 201
    response.json.return_value = {"id": 42}
    success, user_id, error = users._evaluate_user_response(response, TEST_USERNAME)
    assert success is True
    assert user_id == 42
    assert error == ""


def test_evaluate_user_response_409():
    """Test evaluating a 409 Conflict (user exists) response."""
    response = Mock()
    response.status_code = 409
    success, user_id, error = users._evaluate_user_response(response, TEST_USERNAME)
    assert success is True
    assert user_id is None
    assert error == ""


def test_evaluate_user_response_422():
    """Test evaluating a 422 validation error response."""
    response = Mock()
    response.status_code = 422
    response.text = "Validation failed"
    success, user_id, error = users._evaluate_user_response(response, TEST_USERNAME)
    assert success is False
    assert user_id is None
    assert "422" in error


def test_create_single_user_success(mocker):
    """Test creating a single user successfully."""
    mock_response = Mock()
    mock_response.status_code = 201
    mock_response.json.return_value = {"id": 7}
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.gitlab_request",
        return_value=(True, mock_response, ""),
    )
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, user_id = users._create_single_user(TEST_TOKEN, row)
    assert success is True
    assert error == ""
    assert user_id == 7


def test_create_single_user_request_failure(mocker):
    """Test creating a user when HTTP request fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.gitlab_request",
        return_value=(False, None, "connection refused"),
    )
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, user_id = users._create_single_user(TEST_TOKEN, row)
    assert success is False
    assert "connection refused" in error
    assert user_id is None


def test_create_user_and_pat_new_user(mocker):
    """Test _create_user_and_pat creates a PAT for a newly created user."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        return_value=(True, "", 42),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.create_user_pat",
        return_value=(True, TEST_TOKEN),
    )
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, token = users._create_user_and_pat(TEST_TOKEN, row)
    assert success is True
    assert error == ""
    assert token == TEST_TOKEN


def test_create_user_and_pat_existing_user(mocker):
    """Test _create_user_and_pat skips PAT for already-existing user."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        return_value=(True, "", None),
    )
    pat_mock = mocker.patch("dtaas_services.pkg.services.gitlab.users.create_user_pat")
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, _, token = users._create_user_and_pat(TEST_TOKEN, row)
    assert success is True
    assert token == ""
    pat_mock.assert_not_called()


def test_create_user_and_pat_user_creation_fails(mocker):
    """Test _create_user_and_pat propagates user creation failure."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        return_value=(False, "bad request", None),
    )
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, _ = users._create_user_and_pat(TEST_TOKEN, row)
    assert success is False
    assert "bad request" in error


def test_create_users_from_rows_success(mocker):
    """Test creating users from CSV rows."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_user_and_pat",
        return_value=(True, "", TEST_TOKEN),
    )
    rows = [
        {"username": "user1", "email": "u1@x.com", "password": "pass1"},  # noqa: S105 # NOSONAR
        {"username": "user2", "email": "u2@x.com", "password": "pass2"},  # noqa: S105 # NOSONAR
    ]
    success, error, tokens = users._create_users_from_rows(TEST_TOKEN, iter(rows))
    assert success is True
    assert error == ""
    assert tokens == {"user1": TEST_TOKEN, "user2": TEST_TOKEN}


def test_create_users_from_rows_failure_stops(mocker):
    """Test that row processing stops on first failure."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_user_and_pat",
        side_effect=[(True, "", TEST_TOKEN), (False, "user2 failed", "")],
    )
    rows = [
        {"username": "user1", "email": "u1@x.com", "password": "pass1"},  # noqa: S105 # NOSONAR
        {"username": "user2", "email": "u2@x.com", "password": "pass2"},  # noqa: S105 # NOSONAR
        {"username": "user3", "email": "u3@x.com", "password": "pass3"},  # noqa: S105 # NOSONAR
    ]
    success, error, _ = users._create_users_from_rows(TEST_TOKEN, iter(rows))
    assert success is False
    assert "user2 failed" in error


def test_process_credentials_success(mocker, tmp_path):
    """Test processing credentials file successfully."""
    creds_file = tmp_path / "credentials.csv"
    creds_file.write_text(
        "username,password,email\nuser1,pass1,u1@x.com\n",
        encoding="utf-8",  # noqa: S105
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_users_from_rows",
        return_value=(True, "", {"user1": TEST_TOKEN}),
    )
    success, _, tokens = users._process_credentials(TEST_TOKEN, creds_file)
    assert success is True
    assert tokens == {"user1": TEST_TOKEN}


def test_process_credentials_file_not_found():
    """Test processing credentials when file does not exist."""
    success, error, tokens = users._process_credentials(
        TEST_TOKEN, Path("/nonexistent/creds.csv")
    )
    assert success is False
    assert "Error reading credentials file" in error
    assert tokens == {}


def test_load_gitlab_prerequisites_success(mocker, tmp_path):
    """Test loading prerequisites with PAT and credentials file."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_pat_from_tokens",
        return_value=(True, TEST_TOKEN),
    )
    creds_file = tmp_path / "credentials.csv"
    creds_file.write_text("username,password,email\n", encoding="utf-8")  # noqa: S105
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


def test_setup_gitlab_users_saves_tokens(mocker, tmp_path):
    """Test that setup_gitlab_users saves user PATs when tokens are returned."""
    mocker.patch("dtaas_services.pkg.services.gitlab.users.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_gitlab_prerequisites",
        return_value=(True, TEST_TOKEN, Path("/test/creds.csv")),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._process_credentials",
        return_value=(True, "", {"user1": TEST_TOKEN}),
    )
    tokens_file = tmp_path / "config" / "gitlab_user_tokens.json"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._get_user_tokens_path",
        return_value=tokens_file,
    )
    success, msg = users.setup_gitlab_users()
    assert success is True
    assert "Tokens saved" in msg
    assert tokens_file.exists()
    saved = json.loads(tokens_file.read_text(encoding="utf-8"))
    assert saved == {"user1": TEST_TOKEN}


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
        return_value=(False, "API error for user2", {}),
    )
    success, msg = users.setup_gitlab_users()
    assert success is False
    assert "API error" in msg
