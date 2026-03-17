"""Tests for GitLab input validation helpers (_validators.py)."""

from dtaas_services.pkg.services.gitlab import validators
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
