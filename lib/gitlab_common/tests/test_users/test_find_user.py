"""Tests for find_user (gitlab_common/users.py)."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from gitlab.exceptions import GitlabListError
from gitlab_common import UserInfo, find_user
from tests.test_users.conftest import DROPPED, TEST_USERNAME

CREATED_AT = "2026-11-10T09:14:31.123Z"


def _gl_listing(*accounts):
    """Mock client whose user listing yields *accounts*, each a username
    or a SimpleNamespace, with ids 1, 2, ..."""
    gl = MagicMock()
    gl.users.list.return_value = iter(
        account
        if isinstance(account, SimpleNamespace)
        else SimpleNamespace(id=index, username=account, created_at=CREATED_AT)
        for index, account in enumerate(accounts, 1)
    )
    return gl


def test_the_account_with_that_exact_username_is_found():
    """Only an exact match counts, wherever it is in the listing, with its
    id and creation time."""
    gl = _gl_listing(f"{TEST_USERNAME}2", TEST_USERNAME)

    assert find_user(gl, TEST_USERNAME) == (UserInfo(2, CREATED_AT), "")
    gl.users.list.assert_called_once_with(username=TEST_USERNAME, iterator=True)


@pytest.mark.parametrize(
    "fields,expected",
    [
        ({"is_admin": True}, UserInfo(9, CREATED_AT, True)),
        ({"is_admin": "yes"}, UserInfo(9, CREATED_AT)),
        ({"created_at": None}, UserInfo(9, "")),
    ],
    ids=["administrator", "not-a-bool", "no-creation-time"],
)
def test_the_admin_flag_and_creation_time_are_read_strictly(fields, expected):
    """Only a true is_admin marks an administrator, and a creation time
    that is not text reads as none."""
    account = SimpleNamespace(
        id=9, username=TEST_USERNAME, **{"created_at": CREATED_AT, **fields}
    )

    assert find_user(_gl_listing(account), TEST_USERNAME) == (expected, "")


@pytest.mark.parametrize(
    "listed,wanted",
    [
        ((TEST_USERNAME.upper(),), TEST_USERNAME),
        ((TEST_USERNAME,), TEST_USERNAME.capitalize()),
    ],
    ids=["account-in-capitals", "name-in-capitals"],
)
def test_the_account_is_found_whatever_the_case(listed, wanted):
    """GitLab allows one account per name in any case and looks names up
    ignoring case, so a name that differs only in case is that account."""
    assert find_user(_gl_listing(*listed), wanted) == (UserInfo(1, CREATED_AT), "")


@pytest.mark.parametrize("listed", [(), (f"{TEST_USERNAME}2",)])
def test_no_exact_match_is_reported(listed):
    """No account, or only a similar name, is never taken for the account."""
    user, error = find_user(_gl_listing(*listed), TEST_USERNAME)

    assert user is None
    assert error == f"GitLab has no user named '{TEST_USERNAME}'."


@pytest.mark.parametrize("failure", [GitlabListError("403 Forbidden", 403), DROPPED])
def test_a_failed_lookup_is_reported(failure):
    """A refused or dropped request is reported, never raised."""
    gl = MagicMock()
    gl.users.list.side_effect = failure

    user, error = find_user(gl, TEST_USERNAME)

    assert user is None
    assert error.startswith(f"Failed to look up GitLab user '{TEST_USERNAME}': ")
    assert str(failure) in error
