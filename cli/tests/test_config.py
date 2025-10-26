import pytest
from src.pkg import config
from unittest.mock import patch
import click


@pytest.fixture
def mock_toml_data():
    """Mock TOML configuration data"""
    return {
        "common": {"path": "/test/path", "server-dns": "localhost"},
        "users": {"add": ["user1", "user2"], "delete": ["user3"]},
    }


@pytest.fixture
def mock_utils():
    """Mock utils.importToml"""
    with patch("src.pkg.config.utils.importToml") as mock_import:
        yield mock_import


def test_config_init_error(mock_utils):
    """Test Config initialization with error"""
    mock_utils.return_value = (None, Exception("File not found"))
    with pytest.raises(click.ClickException):
        config.Config()


def test_get_config_not_initialized():
    """Test getConfig when data is None"""
    cfg = config.Config.__new__(config.Config)
    cfg.data = None
    _, err = cfg.getConfig()
    assert err is not None


def test_get_from_config_missing_key(mock_utils, mock_toml_data):
    """Test getFromConfig with missing key"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    result, err = cfg.getFromConfig("missing_key")
    assert result is None
    assert err is not None
    assert "Missing missing_key tag" in str(err)


def test_get_string_from_common_missing_key(mock_utils, mock_toml_data):
    """Test getStringFromCommon with missing key"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    result, err = cfg.getStringFromCommon("missing_key")
    assert result is None
    assert err is not None


def test_get_users_success(mock_utils, mock_toml_data):
    """Test getUsers retrieves users section"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    users, err = cfg.getUsers()
    assert err is None
    assert users == mock_toml_data["users"]


# getStringListFromUsers tests
def test_get_string_list_from_users_success(mock_utils, mock_toml_data):
    """Test getStringListFromUsers retrieves list"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    add_list, err = cfg.getStringListFromUsers("add")
    assert err is None
    assert add_list == ["user1", "user2"]


def test_get_string_list_from_users_missing_key(mock_utils, mock_toml_data):
    """Test getStringListFromUsers with missing key"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    result, err = cfg.getStringListFromUsers("missing_key")
    assert result is None
    assert err is not None


def test_get_string_list_from_users_empty_list(mock_utils):
    """Test getStringListFromUsers with empty list"""
    data = {"users": {"add": []}}
    mock_utils.return_value = (data, None)
    cfg = config.Config()
    result, err = cfg.getStringListFromUsers("add")
    assert result is None
    assert err is not None
    assert "list is empty" in str(err)


# Specific getter tests
def test_get_path_success(mock_utils, mock_toml_data):
    """Test getPath retrieves path"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    path, err = cfg.getPath()
    assert err is None
    assert path == "/test/path"


def test_get_server_dns_success(mock_utils, mock_toml_data):
    """Test getServerDNS retrieves server DNS"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    server, err = cfg.getServerDNS()
    assert err is None
    assert server == "localhost"


def test_get_add_users_list_success(mock_utils, mock_toml_data):
    """Test getAddUsersList retrieves add list"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    add_list, err = cfg.getAddUsersList()
    assert err is None
    assert add_list == ["user1", "user2"]


def test_get_delete_users_list_success(mock_utils, mock_toml_data):
    """Test getDeleteUsersList retrieves delete list"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    delete_list, err = cfg.getDeleteUsersList()
    assert err is None
    assert delete_list == ["user3"]
