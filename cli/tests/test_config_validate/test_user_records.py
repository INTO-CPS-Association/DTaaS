"""Tests for the [[users]] checks of config_validate."""

import copy
from src.pkg.config_validate import collect_errors


def test_users_must_be_a_list(base):
    """[[users]], when present, must be an array of tables."""
    data = copy.deepcopy(base)
    data["users"] = {"u1": {"email": "u1@intocps.org"}}
    errors = collect_errors(data)
    assert "users must be an array of tables ([[users]])" in errors

    data["users"] = []  # empty list is allowed
    assert collect_errors(data) == []

    del data["users"]  # absent key is allowed
    assert collect_errors(data) == []


def test_duplicate_username_rejected(base):
    """Two [[users]] records may not share the same username."""
    data = copy.deepcopy(base)
    data["users"] = [
        {"username": "u1", "email": "u1@intocps.org"},
        {"username": "u1", "email": "other@intocps.org"},
    ]
    errors = collect_errors(data)
    assert "users: duplicate username 'u1'" in errors


def test_email_validation(base):
    """Each [[users]] record must carry a valid email."""
    data = copy.deepcopy(base)
    data["users"] = [
        {"username": "u1", "email": "not-an-email"},
        {"username": "u2"},  # missing email
    ]
    errors = collect_errors(data)
    assert "users.u1.email is not a valid email address" in errors
    assert "users.u2.email is not a valid email address" in errors


def test_email_validation_rejects_malformed_addresses(base):
    """email-validator catches cases a minimal regex would wrongly accept."""
    for bad in ("foo@@bar.com", "foo@bar", "foo@.com", 123):
        data = copy.deepcopy(base)
        data["users"] = [{"username": "u1", "email": bad}]
        assert "users.u1.email is not a valid email address" in collect_errors(data)


def test_username_validation(base):
    """A missing or invalid username is reported."""
    data = copy.deepcopy(base)
    data["users"] = [{"email": "u1@intocps.org"}]
    errors = collect_errors(data)
    assert "users: each entry requires a valid 'username'" in errors


def test_groups_and_load_balance_validation(base):
    """Per-user groups must be a string list and load_balance a boolean."""
    data = copy.deepcopy(base)
    data["users"] = [
        {
            "username": "u1",
            "email": "u1@intocps.org",
            "groups": "notalist",
            "load_balance": "yes",
        }
    ]
    errors = collect_errors(data)
    assert "users.u1.groups must be a list of strings" in errors
    assert "users.u1.load_balance must be true or false" in errors


def test_password_validation(base):
    """The optional password field, when present, must be a string."""
    data = copy.deepcopy(base)
    data["users"] = [{"username": "u1", "email": "u1@intocps.org", "password": 123}]
    assert "users.u1.password must be a string" in collect_errors(data)
