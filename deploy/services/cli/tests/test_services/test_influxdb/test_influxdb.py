# pylint: disable=redefined-outer-name
# pylint: disable=W0613
"""Tests for InfluxDB service management (influxdb.py)"""

from pathlib import Path
from unittest.mock import Mock, mock_open
import pytest
from dtaas_services.pkg.services.influxdb.influxdb import (
    _fetch_influxdb_data,
    _execute_setup_steps,
    setup_influxdb_users,
    permissions_influxdb,
)

INFLUXDB_PATH = "dtaas_services.pkg.services.influxdb.influxdb"


@pytest.fixture
def mock_config(mocker):
    """Mock Config class"""
    mock = mocker.patch(f"{INFLUXDB_PATH}.Config")
    mock_instance = Mock()
    mock_instance.get_value.side_effect = lambda key: {
        "HOSTNAME": "test.example.com",
        "INFLUX_UID": "999",
        "INFLUX_GID": "999",
    }.get(key, "default")
    mock.return_value = mock_instance
    mock.get_base_dir.return_value = Path("/test/base")
    return mock


@pytest.fixture
def mock_process_credentials(mocker):
    """Mock process credentials file utility"""
    return mocker.patch(f"{INFLUXDB_PATH}.process_credentials_file")


def test_fetch_influxdb_data_success(mocker):
    """Test successful data fetching"""
    mock_users = mocker.patch(f"{INFLUXDB_PATH}.get_influxdb_users")
    mock_orgs = mocker.patch(f"{INFLUXDB_PATH}.get_existing_orgs")
    mock_users.return_value = (True, {"user1": "id1"}, "")
    mock_orgs.return_value = (True, {"org1"}, "")
    success, users_dict, existing_orgs, error = _fetch_influxdb_data()
    assert success is True
    assert users_dict == {"user1": "id1"}
    assert existing_orgs == {"org1"}
    assert error == ""


def test_fetch_influxdb_data_users_failure(mocker):
    """Test data fetching when get users fails"""
    mock_users = mocker.patch(f"{INFLUXDB_PATH}.get_influxdb_users")
    mock_users.return_value = (False, {}, "failed to get users")
    success, _, _, error = _fetch_influxdb_data()
    assert success is False
    assert "failed to get users" in error


def test_fetch_influxdb_data_orgs_failure(mocker):
    """Test data fetching when get orgs fails"""
    mock_users = mocker.patch(f"{INFLUXDB_PATH}.get_influxdb_users")
    mock_orgs = mocker.patch(f"{INFLUXDB_PATH}.get_existing_orgs")
    mock_users.return_value = (True, {"user1": "id1"}, "")
    mock_orgs.return_value = (False, set(), "failed to get orgs")
    success, _, _, error = _fetch_influxdb_data()
    assert success is False
    assert "failed to get orgs" in error


def test_execute_setup_steps_success(mocker):
    """Test successful execution of all setup steps"""
    mock_file = mock_open(read_data="username,password\nuser1,pass1\n")()
    mock_create = mocker.patch(f"{INFLUXDB_PATH}.create_users_from_credentials")
    mock_fetch = mocker.patch(f"{INFLUXDB_PATH}._fetch_influxdb_data")
    mock_setup = mocker.patch(f"{INFLUXDB_PATH}.setup_user_organizations")
    mock_create.return_value = (True, "")
    mock_fetch.return_value = (True, {"user1": "id1"}, {"org1"}, "")
    mock_setup.return_value = (True, "")
    success, error = _execute_setup_steps(mock_file)
    assert success is True
    assert error == ""


def test_execute_setup_steps_create_users_fails(mocker):
    """Test setup steps when user creation fails"""
    mock_file = mock_open(read_data="username,password\nuser1,pass1\n")()
    mock_create = mocker.patch(f"{INFLUXDB_PATH}.create_users_from_credentials")
    mock_create.return_value = (False, "creation failed")
    success, error = _execute_setup_steps(mock_file)
    assert success is False
    assert "creation failed" in error


def test_execute_setup_steps_fetch_data_fails(mocker):
    """Test setup steps when data fetching fails"""
    mock_file = mock_open(read_data="username,password\nuser1,pass1\n")()
    mock_create = mocker.patch(f"{INFLUXDB_PATH}.create_users_from_credentials")
    mock_fetch = mocker.patch(f"{INFLUXDB_PATH}._fetch_influxdb_data")
    mock_create.return_value = (True, "")
    mock_fetch.return_value = (False, {}, set(), "fetch failed")
    success, error = _execute_setup_steps(mock_file)
    assert success is False
    assert "fetch failed" in error


def test_setup_influxdb_users_success(mock_process_credentials):
    """Test successful InfluxDB users setup"""
    mock_process_credentials.return_value = (
        True,
        "InfluxDB users created successfully",
    )
    success, message = setup_influxdb_users()
    assert success is True
    assert "InfluxDB users created successfully" in message


def test_permissions_influxdb_success(mock_config, mocker):
    """Test successful InfluxDB permissions setup"""
    mock_cfg = mocker.patch(f"{INFLUXDB_PATH}.Config")
    mocker.patch(
        f"{INFLUXDB_PATH}.set_service_cert_permissions",
        return_value=(True, "privkey set"),
    )
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("shutil.copy2")
    mock_instance = Mock()
    mock_instance.get_value.side_effect = lambda key: {
        "HOSTNAME": "test.example.com",
        "INFLUX_UID": "1000",
        "INFLUX_GID": "1000",
    }.get(key, "default")
    mock_cfg.return_value = mock_instance
    mock_cfg.get_base_dir.return_value = Path("/test/base")
    success, _ = permissions_influxdb()
    assert success is True


def test_permissions_influxdb_os_error(mock_config, mocker):
    """Test InfluxDB permissions setup with OSError"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("shutil.copy2", side_effect=OSError("Copy failed"))
    success, message = permissions_influxdb()
    assert success is False
    assert "Error setting permissions for InfluxDB" in message
