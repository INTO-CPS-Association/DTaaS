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
        "users": {"add": ["user1", "user2"], "delete": ["user3"]},
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
                "users": {
                    "add": ["user1", "user2"],
                    "delete": ["user3"],
                    "username1": {"email": "test@example.com"},
                },
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


def test_get_string_list_from_users_missing_key(mock_utils, mock_toml_data):
    """Test getStringListFromUsers with missing key"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    result, err = cfg.get_string_list_from_users("missing_key")
    assert result is None
    assert err is not None


def test_get_string_list_from_users_empty_list(mock_utils):
    """Test getStringListFromUsers with empty list"""
    data = {"users": {"add": []}}
    mock_utils.return_value = (data, None)
    cfg = config.Config()
    result, err = cfg.get_string_list_from_users("add")
    assert result is None
    assert err is not None
    assert "list is empty" in str(err)


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


def test_get_add_users_list_success(mock_utils, mock_toml_data):
    """Test getAddUsersList retrieves add list"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    add_list, err = cfg.get_add_users_list()
    assert err is None
    assert add_list == ["user1", "user2"]


def test_get_delete_users_list_success(mock_utils, mock_toml_data):
    """Test getDeleteUsersList retrieves delete list"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    delete_list, err = cfg.get_delete_users_list()
    assert err is None
    assert delete_list == ["user3"]


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


def test_get_string_list_from_users_when_no_users_section(mock_utils):
    """get_string_list_from_users returns error when 'users' section is absent."""
    mock_utils.return_value = ({"common": {}}, None)
    cfg = config.Config()
    result, err = cfg.get_string_list_from_users("add")
    assert result is None
    assert err is not None


def test_get_string_list_from_users_not_a_list(mock_utils):
    """get_string_list_from_users returns error when the value is not a list."""
    mock_utils.return_value = ({"users": {"add": "not-a-list"}}, None)
    cfg = config.Config()
    result, err = cfg.get_string_list_from_users("add")
    assert result is None
    assert err is not None
    assert "must be a list" in str(err)


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
