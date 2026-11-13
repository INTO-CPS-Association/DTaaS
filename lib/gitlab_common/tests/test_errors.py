"""Tests for describe_api_error (gitlab_common/errors.py) and its callers."""

from unittest.mock import MagicMock

import pytest
import requests
from gitlab.exceptions import GitlabCreateError, GitlabHttpError
from gitlab_common import (
    create_user,
    create_user_pat,
    create_user_project,
    describe_api_error,
    find_user,
    find_user_project,
    revoke_user_pats,
)
from tests.test_users.conftest import TEST_EMAIL, TEST_PASSWORD, TEST_USERNAME

REQUEST_ID = "01M72Q9KFH2D3BPPXZXZW0Q4QD"
ERROR_PAGE = (
    "<!DOCTYPE html>\n<html>\n<head><title>Something went wrong (500)</title>"
    "</head>\n<body>\n<h1>500: We're sorry, something went wrong on our end</h1>"
    f"\n<p>Request ID: <code>{REQUEST_ID}</code></p>\n</body>\n</html>\n"
)
SHORT_PAGE = f"500: GitLab error page (request ID {REQUEST_ID})"


def _field_errors():
    """A create error whose JSON message is a dict, as python-gitlab passes it."""
    exc = GitlabCreateError("", 400)
    setattr(exc, "error_message", {"username": ["has already been taken"]})
    return exc


@pytest.mark.parametrize(
    "exc,expected",
    [
        (GitlabHttpError(ERROR_PAGE, 500), SHORT_PAGE),
        (GitlabHttpError(ERROR_PAGE), f"GitLab error page (request ID {REQUEST_ID})"),
        (GitlabHttpError("<html><body>Bad gateway</body></html>", 502),
         "502: GitLab error page"),
        (GitlabHttpError("500 Internal Server Error", 500),
         "500: 500 Internal Server Error"),
        (_field_errors(), "400: {'username': ['has already been taken']}"),
        (requests.ConnectionError("refused"), "refused"),
    ],
    ids=[
        "page-with-id",
        "page-without-status",
        "page-without-id",
        "json-message",
        "json-dict",
        "unreachable",
    ],
)
def test_describe_api_error(exc, expected):
    """An HTML error page shrinks to one line with its request ID, after
    the HTTP status when there is one (never 'None'). Every other error
    reads exactly as python-gitlab or requests print it."""
    assert describe_api_error(exc) == expected


def _lookup_project(gl, exc):
    gl.users.get.return_value.projects.list.side_effect = exc
    return find_user_project(gl, 5, "common").error


def _create_project(gl, exc):
    gl.users.get.return_value.projects.create.side_effect = exc
    return create_user_project(gl, 5, "common")[1]


def _create_user(gl, exc):
    gl.users.create.side_effect = exc
    return create_user(
        gl, username=TEST_USERNAME, email=TEST_EMAIL, password=TEST_PASSWORD
    ).error


def _create_pat(gl, exc):
    gl.users.get.side_effect = exc
    return create_user_pat(gl, 5, TEST_USERNAME)[1]


def _revoke_pats(gl, exc):
    gl.personal_access_tokens.list.side_effect = exc
    return revoke_user_pats(gl, 5)[1]


def _find_user(gl, exc):
    gl.users.list.side_effect = exc
    return find_user(gl, TEST_USERNAME)[1]


@pytest.mark.parametrize(
    "call,exc_type",
    [
        (_lookup_project, GitlabHttpError),
        (_create_project, GitlabCreateError),
        (_create_user, GitlabCreateError),
        (_create_user, GitlabHttpError),
        (_create_pat, GitlabHttpError),
        (_revoke_pats, GitlabHttpError),
        (_find_user, GitlabHttpError),
    ],
    ids=[
        "find_user_project",
        "create_user_project",
        "create_user-create-error",
        "create_user-other-error",
        "create_user_pat",
        "revoke_user_pats",
        "find_user",
    ],
)
def test_no_message_carries_an_error_page(call, exc_type):
    """Whatever API call fails on an HTML error page, its message holds the
    short line and none of the page."""
    error = call(MagicMock(), exc_type(ERROR_PAGE, 500))
    assert error.endswith(SHORT_PAGE)
    assert "<" not in error
