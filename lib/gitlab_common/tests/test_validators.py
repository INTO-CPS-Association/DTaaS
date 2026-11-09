"""Tests for shared GitLab input validation (gitlab_common/validators.py)."""

import pytest
from gitlab_common import is_http_url, is_namespace_path, validators
# pylint: disable=W0212

TEST_EMAIL = "test@example.com"
TEST_USERNAME = "testuser"
TEST_PASSWORD = "UserP@ss123"  # noqa: S105 # NOSONAR


def test_validate_username_accepts_valid():
    """Test username validation accepts a standard username."""
    assert validators._validate_username(TEST_USERNAME) is None


def test_validate_username_rejects_empty():
    """Test username validation rejects an empty string."""
    assert (
        validators._validate_username("") == "Invalid user input: username is required."
    )


def test_validate_username_rejects_spaces():
    """Test username validation rejects usernames containing spaces."""
    assert validators._validate_username("bad user") is not None


def test_validate_email_accepts_basic_address():
    """Test email validation accepts a standard address."""
    assert validators._validate_email(TEST_EMAIL) is None


def test_validate_email_rejects_multiple_at_signs():
    """Test email validation rejects addresses with multiple at signs."""
    assert (
        validators._validate_email("test@@example.com")
        == validators.INVALID_EMAIL_ERROR
    )


def test_validate_email_rejects_missing_domain_dot():
    """Test email validation rejects addresses without a dotted domain."""
    assert validators._validate_email("test@example") == validators.INVALID_EMAIL_ERROR


def test_validate_email_rejects_missing_local_part():
    """Test email validation rejects addresses with an empty local part."""
    assert validators._validate_email("@example.com") == validators.INVALID_EMAIL_ERROR


def test_validate_email_rejects_missing_domain():
    """Test email validation rejects addresses with an empty domain."""
    assert validators._validate_email("test@") == validators.INVALID_EMAIL_ERROR


def test_validate_email_rejects_whitespace():
    """Test email validation rejects addresses containing whitespace."""
    assert (
        validators._validate_email("test @example.com")
        == validators.INVALID_EMAIL_ERROR
    )


def test_validate_email_rejects_empty():
    """Test email validation rejects an empty string."""
    assert validators._validate_email("") == "Invalid user input: email is required."


def test_validate_password_accepts_valid():
    """Test password validation accepts a standard password."""
    assert validators._validate_password(TEST_PASSWORD) is None


def test_validate_password_rejects_empty():
    """Test password validation rejects an empty string."""
    assert (
        validators._validate_password("") == "Invalid user input: password is required."
    )


def test_validate_password_rejects_control_characters():
    """Test password validation rejects passwords containing control characters."""
    assert validators._validate_password("pass\x01word") is not None


def test_validate_user_row_valid_inputs():
    """Test row validation passes for all-valid inputs."""
    ok, err = validators.validate_user_row(TEST_USERNAME, TEST_EMAIL, TEST_PASSWORD)
    assert ok is True
    assert err == ""


def test_validate_user_row_invalid_username():
    """Test row validation fails when username is invalid."""
    ok, err = validators.validate_user_row("bad user", TEST_EMAIL, TEST_PASSWORD)
    assert ok is False
    assert "Invalid user input" in err


def test_validate_user_row_invalid_email():
    """Test row validation fails when email is invalid."""
    ok, err = validators.validate_user_row(TEST_USERNAME, "notanemail", TEST_PASSWORD)
    assert ok is False
    assert "Invalid user input" in err


@pytest.mark.parametrize(
    "value",
    ["dtaas", "my-org/dt_templates", "a.b/c/d", "_x", "a" * 255],
    ids=["group", "subgroup", "nested", "underscore-first", "longest-segment"],
)
def test_a_gitlab_group_path_is_accepted(value):
    """Letters, digits, _ . and -, with / between nested groups."""
    assert is_namespace_path(value)


@pytest.mark.parametrize(
    "value",
    [
        "",
        "-dtaas",
        "dtaas/",
        "/dtaas",
        "dt aas",
        "https://gitlab.com/dtaas",
        "dtaas.git",
        "dtaas/x.atom",
        "dtaas\n",
        "a" * 256,
        "a" * 20000 + "!",
        42,
    ],
    ids=[
        "empty",
        "dash-first",
        "trailing-slash",
        "leading-slash",
        "space",
        "url",
        "git-suffix",
        "atom-suffix",
        "newline",
        "segment-too-long",
        "long-hostile",
        "not-a-string",
    ],
)
def test_anything_else_is_refused(value):
    """Whatever GitLab would refuse as a group path, and a very long value
    is answered at once (the pattern is linear)."""
    assert not is_namespace_path(value)


@pytest.mark.parametrize(
    "value",
    [
        "https://gitlab.com",
        "http://git.example.org:8080/gitlab/",
        "HTTPS://GitLab.COM/a_b/c~d",
    ],
    ids=["host", "port-and-path", "upper-case"],
)
def test_an_http_url_is_accepted(value):
    """http or https, a host, an optional port and an optional path."""
    assert is_http_url(value)


@pytest.mark.parametrize(
    "value",
    [
        "",
        "gitlab.com",
        "ftp://gitlab.com",
        "git@gitlab.com:dtaas",
        "https://gitlab.com/a b",
        "https://user:pw@gitlab.com",
        "https://gitlab.com\n",
        "https://" + "a" * 20000 + "!",
        None,
    ],
    ids=[
        "empty",
        "no-scheme",
        "ftp",
        "ssh",
        "space",
        "credentials",
        "newline",
        "long-hostile",
        "not-a-string",
    ],
)
def test_anything_but_an_http_url_is_refused(value):
    """Other schemes, credentials in the URL, and a very long value are
    refused at once (the pattern is linear)."""
    assert not is_http_url(value)
