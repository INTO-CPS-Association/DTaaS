"""Tests for the GitLab account step: accounts and their PATs from the
credentials CSV (users.py)."""

from pathlib import Path
from unittest.mock import MagicMock, Mock

import pytest
from gitlab.exceptions import GitlabCreateError, GitlabError
from dtaas_services.pkg.services.gitlab import users
from dtaas_services.pkg.services.gitlab.user_projects import Account
from tests.test_services.test_gitlab.test_users.conftest import (
    ADMIN_TOKEN,
    MODULE,
    ROW,
    TEST_TOKEN,
    TEST_USERNAME,
    csv_rows,
)
# pylint: disable=W0212, W0621


def test_create_single_user_success():
    """Test creating a single user successfully."""
    gl = MagicMock()
    gl.users.create.return_value = Mock(id=7)
    assert users._create_single_user(gl, ROW) == (True, "", 7)


def test_create_single_user_already_exists():
    """A user that already exists is a success with no id."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError(response_code=409)
    assert users._create_single_user(gl, ROW) == (True, "", None)


def test_create_single_user_request_failure():
    """Test creating a user when API request fails."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabError("connection refused")
    success, error, user_id = users._create_single_user(gl, ROW)
    assert success is False
    assert "connection refused" in error
    assert user_id is None


@pytest.mark.parametrize(
    "row",
    [
        {**ROW, "username": "bad user"},
        {"username": None, "email": None, "password": None},
    ],
    ids=["invalid-username", "none-values"],
)
def test_create_single_user_rejects_bad_rows_before_any_call(row):
    """Invalid or missing values are refused before the API is called."""
    gl = MagicMock()
    success, error, user_id = users._create_single_user(gl, row)
    assert (success, user_id) == (False, None)
    assert "Invalid user input" in error
    gl.users.create.assert_not_called()


@pytest.fixture
def created(mocker):
    """Patch _create_single_user and create_user_pat of users.py."""

    def patch(single, pat=(True, TEST_TOKEN)):
        mocker.patch(f"{MODULE}._create_single_user", return_value=single)
        return mocker.patch(f"{MODULE}.create_user_pat", return_value=pat)

    return patch


def test_a_new_user_gets_a_pat_and_an_account_with_id_and_token(created):
    """The account carries the id and token the project step pushes with."""
    created((True, "", 42))
    assert users._create_user_and_pat(MagicMock(), ROW) == (
        True,
        "",
        Account(TEST_USERNAME, 42, TEST_TOKEN),
    )


def test_an_existing_user_gets_no_pat(created):
    """No token is issued for an account this run did not create."""
    pat = created((True, "", None))
    assert users._create_user_and_pat(MagicMock(), ROW) == (
        True,
        "",
        Account(TEST_USERNAME),
    )
    pat.assert_not_called()


@pytest.mark.parametrize(
    "single,pat,error",
    [
        ((False, "bad request", None), (True, TEST_TOKEN), "bad request"),
        ((True, "", 42), (False, "PAT refused"), "PAT refused"),
    ],
    ids=["account-fails", "pat-fails"],
)
def test_a_failed_account_or_pat_fails_the_row(created, single, pat, error):
    """Either half failing fails the row, with no token for the project step."""
    created(single, pat)
    assert users._create_user_and_pat(MagicMock(), ROW) == (
        False,
        error,
        Account(TEST_USERNAME),
    )


@pytest.mark.parametrize(
    "answers,ok,errors,kept",
    [
        ([True, True], True, [], ["user1", "user2"]),
        ([True, False, True], False, ["user2: user2 failed"], ["user1", "user3"]),
        ([False, False], False, ["user1: user1 failed", "user2: user2 failed"], []),
    ],
    ids=["all-succeed", "one-fails", "all-fail"],
)
def test_every_row_is_processed_and_failures_collected(
    mocker, answers, ok, errors, kept
):
    """A failed row never stops the next: the accounts in place are kept
    for the token file and the project step, and every error is named."""
    names = [f"user{index}" for index in range(1, len(answers) + 1)]
    mocker.patch(
        f"{MODULE}._create_user_and_pat",
        side_effect=[
            (good, "" if good else f"{name} failed", Account(name, 1, TEST_TOKEN))
            for good, name in zip(answers, names)
        ],
    )
    success, error, accounts = users._create_users_from_rows(
        MagicMock(), iter(csv_rows(*names))
    )
    assert (success, error) == (ok, "\n".join(errors))
    assert [account.username for account in accounts] == kept


def test_process_credentials_reads_the_csv(mocker, tmp_path):
    """Each CSV row is handed to the account step."""
    creds_file = tmp_path / "credentials.csv"
    creds_file.write_text(
        "username,password,email\nuser1,pass1,u1@x.com\n", encoding="utf-8"
    )
    mocker.patch(
        f"{MODULE}._create_users_from_rows",
        side_effect=lambda gl, reader: (
            True,
            "",
            [Account(row["username"], 1, TEST_TOKEN) for row in reader],
        ),
    )
    success, _, accounts = users._process_credentials(MagicMock(), creds_file)
    assert success is True
    assert accounts == [Account("user1", 1, TEST_TOKEN)]


def test_process_credentials_file_not_found():
    """A credentials file that cannot be read gives no account."""
    success, error, accounts = users._process_credentials(
        MagicMock(), Path("/nonexistent/creds.csv")
    )
    assert success is False
    assert "Error reading credentials file" in error
    assert not accounts


def test_load_gitlab_prerequisites_success(mocker, tmp_path):
    """Test loading prerequisites with PAT and credentials file."""
    mocker.patch(f"{MODULE}._load_pat_from_tokens", return_value=(True, ADMIN_TOKEN))
    creds_file = tmp_path / "credentials.csv"
    creds_file.write_text("username,password,email\n", encoding="utf-8")
    mocker.patch(f"{MODULE}.get_credentials_path", return_value=creds_file)
    assert users._load_gitlab_prerequisites() == (True, ADMIN_TOKEN, creds_file)


def test_load_gitlab_prerequisites_no_pat(mocker):
    """Test loading prerequisites when PAT is missing."""
    mocker.patch(
        f"{MODULE}._load_pat_from_tokens",
        return_value=(False, "Token file not found"),
    )
    success, msg, _ = users._load_gitlab_prerequisites()
    assert success is False
    assert "Token file not found" in msg


def test_load_gitlab_prerequisites_no_credentials_file(mocker, tmp_path):
    """A missing credentials file is named."""
    mocker.patch(f"{MODULE}._load_pat_from_tokens", return_value=(True, ADMIN_TOKEN))
    missing = tmp_path / "credentials.csv"
    mocker.patch(f"{MODULE}.get_credentials_path", return_value=missing)
    assert users._load_gitlab_prerequisites() == (
        False,
        f"Credentials file not found: {missing}",
        Path(),
    )
