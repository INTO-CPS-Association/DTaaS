"""Tests for find_user_id (gitlab_common/users.py)."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from gitlab.exceptions import GitlabListError
from gitlab_common import find_user_id
from tests.test_users.conftest import DROPPED, TEST_USERNAME


def _gl_listing(*usernames):
    """Mock client whose user listing yields accounts named *usernames*,
    with ids 1, 2, ..."""
    gl = MagicMock()
    gl.users.list.return_value = iter(
        SimpleNamespace(id=index, username=name)
        for index, name in enumerate(usernames, 1)
    )
    return gl


def test_the_account_with_that_exact_username_is_found():
    """Only an exact match counts, wherever it is in the listing."""
    gl = _gl_listing(f"{TEST_USERNAME}2", TEST_USERNAME)

    assert find_user_id(gl, TEST_USERNAME) == (2, "")
    gl.users.list.assert_called_once_with(username=TEST_USERNAME, iterator=True)


@pytest.mark.parametrize(
    "listed", [(), (f"{TEST_USERNAME}2",), (TEST_USERNAME.upper(),)]
)
def test_no_exact_match_is_reported(listed):
    """No account, or only a similar name, is never taken for the account."""
    user_id, error = find_user_id(_gl_listing(*listed), TEST_USERNAME)

    assert user_id is None
    assert error == f"GitLab has no user named '{TEST_USERNAME}'."


@pytest.mark.parametrize("failure", [GitlabListError("403 Forbidden", 403), DROPPED])
def test_a_failed_lookup_is_reported(failure):
    """A refused or dropped request is reported, never raised."""
    gl = MagicMock()
    gl.users.list.side_effect = failure

    user_id, error = find_user_id(gl, TEST_USERNAME)

    assert user_id is None
    assert error.startswith(f"Failed to look up GitLab user '{TEST_USERNAME}': ")
    assert str(failure) in error
