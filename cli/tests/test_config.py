from unittest.mock import patch
import pytest
import click
from src.pkg import config
from src.pkg.config import Config


@pytest.fixture
def mockTomlData():
    """Mock TOML configuration data"""
    return {
        "common": {"path": "/test/path", "server-dns": "localhost"},
        "users": {"add": ["user1", "user2"], "delete": ["user3"]},
    }


@pytest.fixture
def mockUtils():
    """Mock utils.importToml"""
    with patch("src.pkg.config.utils.importToml") as mockImport:
        yield mockImport


@pytest.fixture
def mockConfig():
    """Create a mock config object with test data"""
    with patch("src.pkg.config.utils.importToml") as mockImport:
        mockImport.return_value = ({
            "common": {
                "server-dns": "localhost",
                "path": "/test/path",
                "resources": {
                    "cpus": 4,
                    "mem_limit": "4g",
                    "pids_limit": 4800,
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


def testConfigInitError(mockUtils):
    """Test Config initialization with error"""
    mockUtils.return_value = (None, Exception("File not found"))
    with pytest.raises(click.ClickException):
        config.Config()


def testGetConfigNotInitialized():
    """Test getConfig when data is None"""
    cfg = config.Config.__new__(config.Config)
    cfg.data = None
    _, err = cfg.getConfig()
    assert err is not None


def testGetFromConfigMissingKey(mockUtils, mockTomlData):
    """Test getFromConfig with missing key"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    result, err = cfg.getFromConfig("missing_key")
    assert result is None
    assert err is not None
    assert "Missing missing_key tag" in str(err)


def testGetStringFromCommonMissingKey(mockUtils, mockTomlData):
    """Test getStringFromCommon with missing key"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    result, err = cfg.getStringFromCommon("missing_key")
    assert result is None
    assert err is not None


def testGetUsersSuccess(mockUtils, mockTomlData):
    """Test getUsers retrieves users section"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    users, err = cfg.getUsers()
    assert err is None
    assert users == mockTomlData["users"]


def testGetStringListFromUsersSuccess(mockUtils, mockTomlData):
    """Test getStringListFromUsers retrieves list"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    addList, err = cfg.getStringListFromUsers("add")
    assert err is None
    assert addList == ["user1", "user2"]


def testGetStringListFromUsersMissingKey(mockUtils, mockTomlData):
    """Test getStringListFromUsers with missing key"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    result, err = cfg.getStringListFromUsers("missing_key")
    assert result is None
    assert err is not None


def testGetStringListFromUsersEmptyList(mockUtils):
    """Test getStringListFromUsers with empty list"""
    data = {"users": {"add": []}}
    mockUtils.return_value = (data, None)
    cfg = config.Config()
    result, err = cfg.getStringListFromUsers("add")
    assert result is None
    assert err is not None
    assert "list is empty" in str(err)


def testGetPathSuccess(mockUtils, mockTomlData):
    """Test getPath retrieves path"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    path, err = cfg.getPath()
    assert err is None
    assert path == "/test/path"


def testGetServerDnsSuccess(mockUtils, mockTomlData):
    """Test getServerDNS retrieves server DNS"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    server, err = cfg.getServerDNS()
    assert err is None
    assert server == "localhost"


def testGetAddUsersListSuccess(mockUtils, mockTomlData):
    """Test getAddUsersList retrieves add list"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    addList, err = cfg.getAddUsersList()
    assert err is None
    assert addList == ["user1", "user2"]


def testGetDeleteUsersListSuccess(mockUtils, mockTomlData):
    """Test getDeleteUsersList retrieves delete list"""
    mockUtils.return_value = (mockTomlData, None)
    cfg = config.Config()
    deleteList, err = cfg.getDeleteUsersList()
    assert err is None
    assert deleteList == ["user3"]


def testGetResourcesSuccess(mockConfig):
    """Test getResources retrieves resources section"""
    cfg = mockConfig
    resources, err = cfg.getResourceLimits()
    assert err is None
    assert resources == {
        "cpus": 4,
        "mem_limit": "4g",
        "pids_limit": 4800,
        "shm_size": "512m",
    }


def testGetResourceLimitsMissing():
    """Test getting resource limits when resources section is missing"""
    with patch("src.pkg.config.utils.importToml") as mockImport:
        mockImport.return_value = ({"common": {}}, None)
        cfg = Config()
        result, err = cfg.getResourceLimits()
        assert result is None
        assert err is not None
        assert "Missing default resources limits" in str(err)


def testGetUserResourceLimitsCustom():
    """Test getting resource limits for user with custom limits"""
    with patch("src.pkg.config.utils.importToml") as mockImport:
        mockImport.return_value = ({
            "common": {
                "resources": {
                    "cpus": 4,
                    "mem_limit": "4g",
                    "pids_limit": 4800,
                    "shm_size": "512m"
                }
            },
            "users": {
                "username1": {
                    "email": "test@example.com",
                    "resources": {
                        "cpus": 2,
                        "mem_limit": "2g"
                    }
                }
            }
        }, None)
        cfg = Config()
        result, err = cfg.getUserResourceLimits("username1")
        assert err is None
        # Should have custom CPU and memory, but default pids and shm
        assert result["cpus"] == 2
        assert result["mem_limit"] == "2g"
        assert result["pids_limit"] == 4800
        assert result["shm_size"] == "512m"


def testGetUserResourceLimitsNonexistentUser(mockConfig):
    """Test getting resource limits for non-existent user"""
    result, err = mockConfig.getUserResourceLimits("nonexistent")
    assert err is None
    # Should return default limits
    assert result is not None
    assert result["cpus"] == 4


def testGetUserResourceLimitsNoResourcesKey():
    """Test user config exists but has no resources key"""
    with patch("src.pkg.config.utils.importToml") as mockImport:
        mockImport.return_value = ({
            "common": {
                "resources": {
                    "cpus": 4,
                    "mem_limit": "4g",
                    "pids_limit": 4800,
                    "shm_size": "512m"
                }
            },
            "users": {
                "username1": {
                    "email": "test@example.com"
                    # No resources key
                }
            }
        }, None)
        cfg = Config()
        result, err = cfg.getUserResourceLimits("username1")
        assert err is None
        # Should return default limits
        assert result["cpus"] == 4
        assert result["mem_limit"] == "4g"
