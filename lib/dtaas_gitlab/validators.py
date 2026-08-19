"""Input validation helpers for GitLab user management."""

import re
from typing import Tuple

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$")
INVALID_EMAIL_ERROR = "Invalid user input: email format is invalid."


def _validate_username(username: str) -> str | None:
    """Validate username input."""
    if not username:
        return "Invalid user input: username is required."
    if not USERNAME_PATTERN.fullmatch(username):
        return "Invalid user input: username contains invalid characters or length."
    return None


def _is_email_length_or_whitespace_invalid(email: str) -> bool:
    """Return whether the email fails basic length or whitespace checks."""
    return len(email) > 50 or any(char.isspace() for char in email)


def _has_invalid_email_parts(local_part: str, domain: str) -> bool:
    """Return whether the split email parts are incomplete."""
    return not all((local_part, domain))


def _has_multiple_at_signs(domain: str) -> bool:
    """Return whether an additional at-sign remains in the domain part."""
    return "@" in domain


def _split_email_parts(email: str) -> tuple[str, str] | None:
    """Split an email into local-part and domain after validating the separator."""
    local_part, separator, domain = email.partition("@")
    if separator != "@" or _has_multiple_at_signs(domain):
        return None
    if _has_invalid_email_parts(local_part, domain):
        return None
    return local_part, domain


def _has_valid_email_domain(domain: str) -> bool:
    """Return whether the domain contains a name and a dotted suffix."""
    domain_name, dot, suffix = domain.rpartition(".")
    return bool(dot and domain_name and suffix)


def _is_email_format_invalid(email: str) -> bool:
    """Return whether the email fails structural validation."""
    if _is_email_length_or_whitespace_invalid(email):
        return True

    email_parts = _split_email_parts(email)
    if email_parts is None:
        return True

    _, domain = email_parts
    return not _has_valid_email_domain(domain)


def _validate_email(email: str) -> str | None:
    """Validate email input."""
    if not email:
        return "Invalid user input: email is required."
    if _is_email_format_invalid(email):
        return INVALID_EMAIL_ERROR
    return None


def _validate_password(password: str) -> str | None:
    """Validate password input."""
    if not password:
        return "Invalid user input: password is required."
    if len(password) > 55 or any(ord(char) < 32 for char in password):
        return "Invalid user input: password format is invalid."
    return None


def validate_user_row(username: str, email: str, password: str) -> Tuple[bool, str]:
    """Validate user inputs before calling the GitLab API."""
    validation_error = next(
        (
            error
            for error in (
                _validate_username(username),
                _validate_email(email),
                _validate_password(password),
            )
            if error
        ),
        "",
    )
    if validation_error:
        return False, validation_error
    return True, ""
