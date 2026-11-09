"""Tests for Config: the [[users]] starting user records."""

from src.pkg import config
from src.pkg.config import Config


def test_get_users_when_data_is_none():
    """get_users propagates the 'Config not initialised' error rather than crashing."""
    cfg = Config.__new__(Config)
    cfg.data = None
    users, err = cfg.get_users()
    assert users is None
    assert err is not None


def test_get_users_rejects_non_table_entry(mock_utils):
    """get_users errors when any [[users]] entry is not a table."""
    mock_utils.return_value = ({"users": [{"username": "user1"}, "oops"]}, None)
    cfg = config.Config()
    users, err = cfg.get_users()
    assert users is None
    assert err is not None
    assert "each [[users]] entry must be a table" in str(err)


def test_get_starting_users_success(mock_utils, mock_toml_data):
    """get_starting_users returns the usernames from [[users]]"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    usernames, err = cfg.get_starting_users()
    assert err is None
    assert usernames == ["user1", "user2"]


def test_get_starting_users_propagates_users_error(mock_utils):
    """get_starting_users returns the error from get_users rather than crashing."""
    mock_utils.return_value = ({"users": {"add": ["user1"]}}, None)
    cfg = config.Config()
    usernames, err = cfg.get_starting_users()
    assert usernames is None
    assert err is not None


def test_get_user_emails_success(mock_utils, mock_toml_data):
    """get_user_emails returns a {username: email} mapping from [[users]]"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    emails, err = cfg.get_user_emails()
    assert err is None
    assert emails == {"user1": "user1@x.io", "user2": "user2@x.io"}


def test_get_user_emails_propagates_users_error(mock_utils):
    """get_user_emails returns the error from get_users rather than crashing."""
    mock_utils.return_value = ({"users": {"add": ["user1"]}}, None)
    cfg = config.Config()
    emails, err = cfg.get_user_emails()
    assert emails is None
    assert err is not None
