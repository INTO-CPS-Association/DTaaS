"""Tests for GitLab user management via python-gitlab (users.py)."""

import json
from pathlib import Path
from unittest.mock import Mock, MagicMock
from gitlab.exceptions import GitlabCreateError, GitlabError
from dtaas_services.pkg.services.gitlab import users
# pylint: disable=W0212, W0621

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_PASSWORD = "UserP@ss123"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"
TEST_EMAIL = "test@example.com"


def _make_gl_mock():
    """Create a mock gitlab.Gitlab client."""
    return MagicMock()


def test_create_single_user_success():
    """Test creating a single user successfully."""
    gl = _make_gl_mock()
    mock_user = Mock()
    mock_user.id = 7
    gl.users.create.return_value = mock_user
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, user_id = users._create_single_user(gl, row)
    assert success is True
    assert error == ""
    assert user_id == 7


def test_create_single_user_already_exists():
    """Test creating a user that already exists (409)."""
    gl = _make_gl_mock()
    exc = GitlabCreateError(response_code=409)
    gl.users.create.side_effect = exc
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, user_id = users._create_single_user(gl, row)
    assert success is True
    assert error == ""
    assert user_id is None


def test_create_single_user_request_failure():
    """Test creating a user when API request fails."""
    gl = _make_gl_mock()
    gl.users.create.side_effect = GitlabError("connection refused")
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, user_id = users._create_single_user(gl, row)
    assert success is False
    assert "connection refused" in error
    assert user_id is None


def test_create_single_user_invalid_username_rejected():
    """Test creating a user rejects invalid usernames before API call."""
    gl = _make_gl_mock()
    row = {
        "username": "bad user",
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    }
    success, error, user_id = users._create_single_user(gl, row)

    assert success is False
    assert "Invalid user input" in error
    assert user_id is None
    gl.users.create.assert_not_called()


def test_create_single_user_none_values_rejected():
    """Test creating a user handles None values safely."""
    gl = _make_gl_mock()
    row = {"username": None, "email": None, "password": None}
    success, error, user_id = users._create_single_user(gl, row)

    assert success is False
    assert "Invalid user input" in error
    assert user_id is None
    gl.users.create.assert_not_called()


def test_create_user_and_pat_new_user(mocker):
    """Test _create_user_and_pat creates a PAT for a newly created user."""
    gl = _make_gl_mock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        return_value=(True, "", 42),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.create_user_pat",
        return_value=(True, TEST_TOKEN),
    )
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, token = users._create_user_and_pat(gl, row)
    assert success is True
    assert error == ""
    assert token == TEST_TOKEN


def test_create_user_and_pat_existing_user(mocker):
    """Test _create_user_and_pat skips PAT for already-existing user."""
    gl = _make_gl_mock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        return_value=(True, "", None),
    )
    pat_mock = mocker.patch("dtaas_services.pkg.services.gitlab.users.create_user_pat")
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, _, token = users._create_user_and_pat(gl, row)
    assert success is True
    assert token == ""
    pat_mock.assert_not_called()


def test_create_user_and_pat_user_creation_fails(mocker):
    """Test _create_user_and_pat propagates user creation failure."""
    gl = _make_gl_mock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_single_user",
        return_value=(False, "bad request", None),
    )
    row = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
    success, error, _ = users._create_user_and_pat(gl, row)
    assert success is False
    assert "bad request" in error


def test_create_users_from_rows_success(mocker):
    """Test creating users from CSV rows."""
    gl = _make_gl_mock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_user_and_pat",
        return_value=(True, "", TEST_TOKEN),
    )
    rows = [
        {"username": "user1", "email": "u1@x.com", "password": "pass1"},  # noqa: S105 # NOSONAR
        {"username": "user2", "email": "u2@x.com", "password": "pass2"},  # noqa: S105 # NOSONAR
    ]
    success, error, tokens = users._create_users_from_rows(gl, iter(rows))
    assert success is True
    assert error == ""
    assert tokens == {"user1": TEST_TOKEN, "user2": TEST_TOKEN}


def test_create_users_from_rows_failure_continues(mocker):
    """Test that row processing continues after a failure and collects errors."""
    gl = _make_gl_mock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_user_and_pat",
        side_effect=[
            (True, "", TEST_TOKEN),
            (False, "user2 failed", ""),
            (True, "", TEST_TOKEN),
        ],
    )
    rows = [
        {"username": "user1", "email": "u1@x.com", "password": "pass1"},  # noqa: S105 # NOSONAR
        {"username": "user2", "email": "u2@x.com", "password": "pass2"},  # noqa: S105 # NOSONAR
        {"username": "user3", "email": "u3@x.com", "password": "pass3"},  # noqa: S105 # NOSONAR
    ]
    success, error, tokens = users._create_users_from_rows(gl, iter(rows))
    assert success is False
    assert "user2 failed" in error
    # user1 and user3 succeeded — their tokens must be present
    assert "user1" in tokens
    assert "user3" in tokens
    assert "user2" not in tokens


def test_create_users_from_rows_multiple_failures_reported(mocker):
    """Test that all row failures are collected into a single error summary."""
    gl = _make_gl_mock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_user_and_pat",
        side_effect=[(False, "u1 bad", ""), (False, "u2 bad", "")],
    )
    rows = [
        {"username": "user1", "email": "u1@x.com", "password": "pass1"},  # noqa: S105 # NOSONAR
        {"username": "user2", "email": "u2@x.com", "password": "pass2"},  # noqa: S105 # NOSONAR
    ]
    success, error, tokens = users._create_users_from_rows(gl, iter(rows))
    assert success is False
    assert "u1 bad" in error
    assert "u2 bad" in error
    assert not tokens


def test_process_credentials_success(mocker, tmp_path):
    """Test processing credentials file successfully."""
    gl = _make_gl_mock()
    creds_file = tmp_path / "credentials.csv"
    creds_file.write_text(
        "username,password,email\nuser1,pass1,u1@x.com\n",
        encoding="utf-8",  # noqa: S105
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._create_users_from_rows",
        return_value=(True, "", {"user1": TEST_TOKEN}),
    )
    success, _, tokens = users._process_credentials(gl, creds_file)
    assert success is True
    assert tokens == {"user1": TEST_TOKEN}


def test_process_credentials_file_not_found():
    """Test processing credentials when file does not exist."""
    gl = _make_gl_mock()
    success, error, tokens = users._process_credentials(
        gl, Path("/nonexistent/creds.csv")
    )
    assert success is False
    assert "Error reading credentials file" in error
    assert not tokens


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
        "dtaas_services.pkg.services.gitlab.users.get_gitlab_client",
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
    """Test user setup persists partial tokens and reports errors when some rows fail."""
    mocker.patch("dtaas_services.pkg.services.gitlab.users.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._load_gitlab_prerequisites",
        return_value=(True, TEST_TOKEN, Path("/test/creds.csv")),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users.get_gitlab_client",
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._process_credentials",
        return_value=(False, "user2: API error", {"user1": TEST_TOKEN}),
    )
    tokens_file = mocker.MagicMock()
    tokens_file.exists.return_value = False
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._get_user_tokens_path",
        return_value=tokens_file,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.users._save_user_tokens",
        return_value=(True, str(tokens_file)),
    )
    success, msg = users.setup_gitlab_users()
    assert success is False
    assert "user2" in msg
    assert "Tokens saved" in msg
