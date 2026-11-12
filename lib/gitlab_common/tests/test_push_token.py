"""Tests for the check of a user's own token before their project is made
(push_token.py). The client python-gitlab builds for the token is patched,
so no request leaves the test."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
import requests
from gitlab.exceptions import GitlabAuthenticationError, GitlabGetError, GitlabHttpError
from gitlab_common import ProjectRequest, with_hint
from gitlab_common.push_token import push_problem
from tests.test_errors import ERROR_PAGE, SHORT_PAGE

USER_TOKEN = "fake-alice-token"  # noqa: S105 # NOSONAR
RERUN = "dtaas user add alice"
REQUEST = ProjectRequest(
    42, "alice", "common", "https://gitlab.com/dtaas/common.git", RERUN, USER_TOKEN
)
CAN_PUSH = {
    "active": True,
    "user_id": 42,
    "scopes": ["read_repository", "write_repository"],
}
FIX = (
    "Nothing was created. Replace the token saved for alice with a working "
    f"one with the write_repository scope, then run '{RERUN}' again."
)
# pylint: disable=redefined-outer-name


@pytest.fixture
def api():
    """The token's own client (python-gitlab patched), answering a record of
    a token of alice's that can push, and an admin client whose lookup of
    the owner answers a regular user."""
    with patch("gitlab_common.push_token.gitlab.Gitlab") as client:
        client.return_value.http_get.return_value = dict(CAN_PUSH)
        admin = SimpleNamespace(
            url="https://gitlab.example.com/gitlab",
            ssl_verify="/certs/ca.pem",
            timeout=30,
            users=MagicMock(),
        )
        admin.users.get.return_value = SimpleNamespace(id=42, username="alice")
        yield SimpleNamespace(client=client, admin=admin, as_owner=client.return_value)


@pytest.mark.parametrize(
    "scopes", [["write_repository"], ["api"]], ids=["write_repository", "api"]
)
def test_a_token_of_the_owner_that_can_push_passes(api, scopes):
    """The token's record is read with the token itself, through the admin
    client's URL, TLS setting and timeout, and the owner is looked up by id."""
    api.as_owner.http_get.return_value = {**CAN_PUSH, "scopes": scopes}

    assert push_problem(api.admin, REQUEST) == ""
    api.client.assert_called_once_with(
        "https://gitlab.example.com/gitlab",
        private_token=USER_TOKEN,
        ssl_verify="/certs/ca.pem",
        timeout=30,
    )
    api.as_owner.http_get.assert_called_once_with("/personal_access_tokens/self")
    api.admin.users.get.assert_called_once_with(42)


@pytest.mark.parametrize(
    "change,problem",
    [
        ({"active": False}, "alice's token is not active."),
        (
            {"user_id": 1},
            "alice's token belongs to GitLab user 1, not to alice (user 42).",
        ),
        (
            {"scopes": ["read_repository", "read_api"]},
            "alice's token has neither the write_repository nor the api scope, "
            "so it cannot push.",
        ),
        (
            {"scopes": "write_repository"},
            "alice's token has neither the write_repository nor the api scope, "
            "so it cannot push.",
        ),
    ],
    ids=["inactive", "another-account", "no-push-scope", "scopes-not-a-list"],
)
def test_a_token_that_cannot_push_as_the_owner_is_refused(api, change, problem):
    """An inactive token, another account's token (a stale or an admin's
    one saved under the name) and a token without a push scope are each
    named, with how to finish, and the owner is not even looked up."""
    api.as_owner.http_get.return_value = {**CAN_PUSH, **change}

    assert push_problem(api.admin, REQUEST) == with_hint(problem, FIX)
    api.admin.users.get.assert_not_called()


@pytest.mark.parametrize(
    "failure,detail",
    [
        (GitlabAuthenticationError("401 Unauthorized", 401), "401: 401 Unauthorized"),
        (requests.ConnectionError("connection reset"), "connection reset"),
        (GitlabHttpError(ERROR_PAGE, 500), SHORT_PAGE),
    ],
    ids=["expired-or-revoked", "unreachable", "error-page"],
)
def test_a_token_that_cannot_be_checked_is_refused(api, failure, detail):
    """GitLab answers 401 for a token that expired or was revoked: the
    check fails with GitLab's words (an error page shortened), never
    raises."""
    api.as_owner.http_get.side_effect = failure

    assert push_problem(api.admin, REQUEST) == with_hint(
        f"alice's token could not be checked ({detail}). GitLab answers 401 "
        "for a token that expired or was revoked.",
        FIX,
    )


def test_an_answer_without_a_record_is_refused(api):
    """An answer that is not a token record never passes the check."""
    api.as_owner.http_get.return_value = MagicMock()

    assert push_problem(api.admin, REQUEST) == with_hint(
        "GitLab gave no details of alice's token.", FIX
    )


def test_an_administrator_gets_no_project(api):
    """An administrator's own token passes, but no project is made for an
    administrator, so nothing a push sets off runs as one."""
    api.admin.users.get.return_value = SimpleNamespace(id=42, is_admin=True)

    assert push_problem(api.admin, REQUEST) == with_hint(
        "alice is a GitLab administrator. Projects are only made for regular "
        "users, so that nothing a push sets off runs as an administrator.",
        "Nothing was created.",
    )


def test_an_owner_who_cannot_be_looked_up_gets_no_project(api):
    """A failed lookup of the owner is reported, never raised."""
    api.admin.users.get.side_effect = GitlabGetError("404 User Not Found", 404)

    assert push_problem(api.admin, REQUEST) == with_hint(
        "Failed to look up GitLab user 42: 404: 404 User Not Found",
        "Nothing was created.",
    )
