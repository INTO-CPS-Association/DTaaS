"""Tests for config module."""

from unittest.mock import patch
import pytest
from src.pkg import config
from src.pkg.config import Config
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_toml_data():
    """Mock TOML configuration data"""
    return {
        "common": {"path": "/test/path", "server-dns": "localhost"},
        "users": [
            {"username": "user1", "email": "user1@x.io"},
            {"username": "user2", "email": "user2@x.io"},
        ],
    }


@pytest.fixture
def mock_utils():
    """Mock utils.import_toml"""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        yield mock_import


@pytest.fixture
def mock_config():
    """Create a mock config object with test data"""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        mock_import.return_value = (
            {
                "common": {
                    "server-dns": "localhost",
                    "path": "/test/path",
                    "resources": {
                        "cpus": 4,
                        "mem_limit": "4G",
                        "pids_limit": 4960,
                        "shm_size": "512m",
                    },
                },
                "users": [
                    {"username": "username1", "email": "test@example.com"},
                ],
            },
            None,
        )
        yield config.Config()


def test_config_init_error(mock_utils):
    """Test Config initialization with error raises RuntimeError"""
    mock_utils.return_value = (None, Exception("File not found"))
    with pytest.raises(RuntimeError):
        config.Config()


def test_get_string_from_common_missing_key(mock_utils, mock_toml_data):
    """Test getStringFromCommon with missing key"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    result, err = cfg.get_string_from_common("missing_key")
    assert result is None
    assert err is not None


def test_get_path_success(mock_utils, mock_toml_data):
    """Test getPath retrieves path"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    path, err = cfg.get_path()
    assert err is None
    assert path == "/test/path"


def test_get_server_dns_success(mock_utils, mock_toml_data):
    """Test getServerDNS retrieves server DNS"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    server, err = cfg.get_server_dns()
    assert err is None
    assert server == "localhost"


def test_get_users_success(mock_utils, mock_toml_data):
    """get_users returns the [[users]] list of dicts"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    users, err = cfg.get_users()
    assert err is None
    assert users == mock_toml_data["users"]


def test_get_users_missing_defaults_to_empty_list(mock_utils):
    """get_users returns [] with no error when 'users' is absent"""
    mock_utils.return_value = ({"common": {}}, None)
    cfg = config.Config()
    users, err = cfg.get_users()
    assert err is None
    assert users == []


def test_get_users_not_a_list_errors(mock_utils):
    """get_users errors when 'users' is not an array of tables"""
    mock_utils.return_value = ({"users": {"add": ["user1"]}}, None)
    cfg = config.Config()
    users, err = cfg.get_users()
    assert users is None
    assert err is not None
    assert "array of tables" in str(err)


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


def test_get_starting_users_skips_missing_username(mock_utils):
    """get_starting_users omits records with a blank/missing username."""
    mock_utils.return_value = (
        {"users": [{"username": "user1"}, {"email": "no-name@x.io"}]},
        None,
    )
    cfg = config.Config()
    usernames, err = cfg.get_starting_users()
    assert err is None
    assert usernames == ["user1"]


def test_get_user_emails_success(mock_utils, mock_toml_data):
    """get_user_emails returns a {username: email} mapping from [[users]]"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    emails, err = cfg.get_user_emails()
    assert err is None
    assert emails == {"user1": "user1@x.io", "user2": "user2@x.io"}


def test_get_user_emails_skips_missing_username(mock_utils):
    """get_user_emails omits records with a blank/missing username."""
    mock_utils.return_value = (
        {"users": [{"username": "user1", "email": "u1@x.io"}, {"email": "x@x.io"}]},
        None,
    )
    cfg = config.Config()
    emails, err = cfg.get_user_emails()
    assert err is None
    assert emails == {"user1": "u1@x.io"}


def test_get_resources_success(mock_config):
    """Test getResources retrieves resources section"""
    cfg = mock_config
    resources, err = cfg.get_resource_limits()
    assert err is None
    assert resources == {
        "cpus": 4,
        "mem_limit": "4G",
        "pids_limit": 4960,
        "shm_size": "512m",
    }


def test_get_resource_limits_missing():
    """Test getting resource limits when resources section is missing"""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        mock_import.return_value = ({"common": {}}, None)
        cfg = Config()
        result, err = cfg.get_resource_limits()
        assert result is None
        assert err is not None
        assert "Missing default resources limits" in str(err)


def test_get_tls_success_true():
    """Test getTLS retrieves tls flag when set to true"""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        mock_import.return_value = (
            {"common": {"security": {"tls": True}}},
            None,
        )
        cfg = Config()
        tls, err = cfg.get_tls()
        assert err is None
        assert tls is True


def test_get_set_limits_defaults_to_true():
    """set_limits defaults to True when absent so limits stay enforced."""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        mock_import.return_value = ({"common": {"resources": {"cpus": 4}}}, None)
        cfg = Config()
        set_limits, err = cfg.get_set_limits()
        assert err is None
        assert set_limits is True


def test_get_set_limits_reads_false():
    """An explicit set_limits=false disables resource limits."""
    with patch("src.pkg.config.utils.import_toml") as mock_import:
        mock_import.return_value = (
            {"common": {"resources": {"set_limits": False}}},
            None,
        )
        cfg = Config()
        set_limits, err = cfg.get_set_limits()
        assert err is None
        assert set_limits is False


def test_get_set_limits_when_no_common_section(mock_utils):
    """get_set_limits returns True with error when 'common' section is absent."""
    mock_utils.return_value = ({"users": {}}, None)
    cfg = config.Config()
    set_limits, err = cfg.get_set_limits()
    assert set_limits is True
    assert err is not None


def test_get_set_limits_resources_not_dict(mock_utils):
    """get_set_limits returns True with error when resources is not a dict."""
    mock_utils.return_value = ({"common": {"resources": "nope"}}, None)
    cfg = config.Config()
    set_limits, err = cfg.get_set_limits()
    assert set_limits is True
    assert err is not None
    assert "resources section is not a dict" in str(err)


def test_get_from_config_when_data_is_none():
    """get_from_config returns error when config is uninitialised."""
    cfg = Config.__new__(Config)
    cfg.data = None
    result, err = cfg.get_from_config("any_key")
    assert result is None
    assert err is not None


def test_get_string_from_common_when_no_common_section(mock_utils):
    """get_string_from_common returns error when 'common' section is absent."""
    mock_utils.return_value = ({"users": {}}, None)
    cfg = config.Config()
    result, err = cfg.get_string_from_common("path")
    assert result is None
    assert err is not None


def test_get_resource_limits_when_no_common_section(mock_utils):
    """get_resource_limits returns error when 'common' section is absent."""
    mock_utils.return_value = ({"users": {}}, None)
    cfg = config.Config()
    result, err = cfg.get_resource_limits()
    assert result is None
    assert err is not None


def test_get_tls_when_no_common_section(mock_utils):
    """get_tls returns False with error when 'common' section is absent."""
    mock_utils.return_value = ({"users": {}}, None)
    cfg = config.Config()
    tls, err = cfg.get_tls()
    assert tls is False
    assert err is not None


def test_get_tls_security_not_dict(mock_utils):
    """get_tls returns False with error when security section is not a dict."""
    mock_utils.return_value = ({"common": {"security": "not-a-dict"}}, None)
    cfg = config.Config()
    tls, err = cfg.get_tls()
    assert tls is False
    assert err is not None
    assert "security section is not a dict" in str(err)
