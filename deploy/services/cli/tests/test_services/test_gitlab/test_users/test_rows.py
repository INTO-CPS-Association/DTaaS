"""Tests for the rows of the credentials CSV in the GitLab step (users.py):
every row is attempted, failures are collected, and the accounts in place
go on to the token file and the project step."""

from pathlib import Path
from unittest.mock import MagicMock

import pytest
from dtaas_services.pkg.services.gitlab import users
from dtaas_services.pkg.services.gitlab.user_projects import Account
from tests.test_services.test_gitlab.test_users.conftest import (
    ADMIN_TOKEN,
    MODULE,
    TEST_TOKEN,
    csv_rows,
)
# pylint: disable=W0212, W0621


@pytest.mark.parametrize(
    "answers,ok,errors,kept",
    [
        ([True, True], True, [], ["user1", "user2"]),
        ([True, False, True], False, ["user2: user2 failed"], ["user1", "user3"]),
        ([False, False], False, ["user1: user1 failed", "user2: user2 failed"], []),
        ([None, True], False, ["user1: user1 failed"], ["user1", "user2"]),
    ],
    ids=["all-succeed", "one-fails", "all-fail", "failed-but-in-place"],
)
def test_every_row_is_processed_and_failures_collected(
    mocker, answers, ok, errors, kept
):
    """A failed row never stops the next: the accounts in place are kept
    for the token file and the project step (also one whose row failed, as
    when its record could not be saved), and every error is named. None
    stands for a failed row whose account is in place."""
    names = [f"user{index}" for index in range(1, len(answers) + 1)]
    mocker.patch(
        f"{MODULE}.create_account",
        side_effect=[
            (
                bool(good),
                "" if good else f"{name} failed",
                Account(name, 1, TEST_TOKEN) if good is not False else None,
            )
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
        side_effect=lambda run, reader: (
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
