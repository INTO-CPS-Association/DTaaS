from unittest.mock import patch
import pytest
import click
from src.pkg import config
from src.pkg.config import Config


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
    with patch("src.pkg.config.utils.import_toml") as mockImport:
        yield mockImport


@pytest.fixture
def mock_config():
    """Create a mock config object with test data"""
    with patch("src.pkg.config.utils.import_toml") as mockImport:
        mockImport.return_value = ({
            "common": {
                "server-dns": "localhost",
                "path": "/test/path",
                "resources": {
                    "cpus": 4,
                    "mem_limit": "4G",
                    "pids_limit": 4960,
                    "shm_size": "512m"
                }
            },
            "users": {
                "add": ["user1", "user2"],
                "delete": ["user3"],
                "username1": {"email": "test@example.com"}
            }
        }, None)
        yield config.Config()


def test_config_init_error(mock_utils):
    """Test Config initialization with error"""
    mock_utils.return_value = (None, Exception("File not found"))
    with pytest.raises(click.ClickException):
        config.Config()


def test_get_config_not_initialized():
    """Test getConfig when data is None"""
    cfg = config.Config.__new__(config.Config)
    cfg.data = None
    _, err = cfg.get_config()
    assert err is not None


def test_get_from_config_missing_key(mock_utils, mock_toml_data):
    """Test getFromConfig with missing key"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    result, err = cfg.get_from_config("missing_key")
    assert result is None
    assert err is not None
    assert "Missing missing_key tag" in str(err)


def test_get_string_from_common_missing_key(mock_utils, mock_toml_data):
    """Test getStringFromCommon with missing key"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    result, err = cfg.get_string_from_common("missing_key")
    assert result is None
    assert err is not None


def test_get_users_success(mock_utils, mock_toml_data):
    """Test getUsers retrieves users section"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    users, err = cfg.get_users()
    assert err is None
    assert users == mock_toml_data["users"]


def test_get_string_list_from_users_success(mock_utils, mock_toml_data):
    """Test getStringListFromUsers retrieves list"""
    mock_utils.return_value = (mock_toml_data, None)
    cfg = config.Config()
    add_list, err = cfg.get_string_list_from_users("add")
    assert err is None
    assert add_list == ["user1", "user2"]


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
    with patch("src.pkg.config.utils.import_toml") as mockImport:
        mockImport.return_value = ({"common": {}}, None)
        cfg = Config()
        result, err = cfg.get_resource_limits()
        assert result is None
        assert err is not None
        assert "Missing default resources limits" in str(err)
