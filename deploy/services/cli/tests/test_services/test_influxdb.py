# pylint: disable=redefined-outer-name
# pylint: disable=W0613
"""Tests for InfluxDB user management"""

import json
from pathlib import Path
from unittest.mock import patch, Mock, mock_open
import pytest
from dtaas_services.pkg.services.influxdb import (
    _parse_json_response,
    _execute_influxdb_command,
    _create_influxdb_user,
    _get_influxdb_users,
    _get_existing_orgs,
    _setup_user_org_bucket,
    _setup_user_organizations,
    _fetch_influxdb_data,
    _execute_setup_steps,
    setup_influxdb_users,
    permissions_influxdb,
)
from dtaas_services.pkg.utils import create_users_from_credentials


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.services.influxdb.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "INFLUX_UID": "999",
            "INFLUX_GID": "999",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


@pytest.fixture
def mock_process_credentials():
    """Mock process credentials file utility"""
    with patch("dtaas_services.pkg.services.influxdb.process_credentials_file") as mock:
        yield mock


def test_parse_json_response_key_error():
    """Test JSON parsing with KeyError"""
    # This tests the KeyError exception path (though it's unlikely with valid JSON)
    with patch("json.loads", side_effect=KeyError("missing key")):
        success, data, error = _parse_json_response('{"test": "value"}')
        assert success is False
        assert data is None
        assert "Unexpected data format" in error


def test_execute_influxdb_command_success():
    """Test successful InfluxDB command execution"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (True, "success output")
        success, error = _execute_influxdb_command(
            ["influx", "user", "list"], "Failed to list users"
        )
        assert success is True
        assert error == ""


def test_execute_influxdb_command_failure():
    """Test failed InfluxDB command execution"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (False, "command failed")
        success, error = _execute_influxdb_command(
            ["influx", "user", "list"], "Failed to list users"
        )
        assert success is False
        assert "Failed to list users" in error


def test_create_influxdb_user_success():
    """Test successful InfluxDB user creation"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (True, "success")
        success, error = _create_influxdb_user("testuser", "testpass")
        assert success is True
        assert error == ""


def test_create_influxdb_user_failure():
    """Test failed InfluxDB user creation"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (False, "user exists")
        success, error = _create_influxdb_user("testuser", "testpass")
        assert success is False
        assert "Failed to create user testuser" in error


def test_get_influxdb_users_success():
    """Test successful retrieval of InfluxDB users"""
    users_data = [{"name": "user1", "id": "id1"}, {"name": "user2", "id": "id2"}]
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (True, json.dumps(users_data))
        success, users_dict, error = _get_influxdb_users()
        assert success is True
        assert users_dict == {"user1": "id1", "user2": "id2"}
        assert error == ""


def test_get_influxdb_users_command_failure():
    """Test get users when command fails"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (False, "connection error")
        success, users_dict, error = _get_influxdb_users()
        assert success is False
        assert users_dict == {}
        assert "Failed to retrieve user list" in error


def test_get_influxdb_users_json_parse_error():
    """Test get users with JSON parse error"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (True, "{invalid json")
        success, users_dict, error = _get_influxdb_users()
        assert success is False
        assert users_dict == {}
        assert "Failed to parse JSON" in error


def test_get_existing_orgs_success():
    """Test successful retrieval of existing organizations"""
    orgs_data = [{"name": "org1"}, {"name": "org2"}]
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (True, json.dumps(orgs_data))
        success, org_names, error = _get_existing_orgs()
        assert success is True
        assert org_names == {"org1", "org2"}
        assert error == ""


def test_get_existing_orgs_command_failure():
    """Test get orgs when command fails"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (False, "connection error")
        success, org_names, error = _get_existing_orgs()
        assert success is False
        assert org_names == set()
        assert "Failed to retrieve org list" in error


def test_get_existing_orgs_json_parse_error():
    """Test get orgs with JSON parse error"""
    with patch(
        "dtaas_services.pkg.services.influxdb.execute_docker_command"
    ) as mock_exec:
        mock_exec.return_value = (True, "{invalid json")
        success, org_names, error = _get_existing_orgs()
        assert success is False
        assert org_names == set()
        assert "Failed to parse JSON" in error


def test_setup_user_org_bucket_existing_org():
    """Test setup user org and bucket when org already exists"""
    with patch(
        "dtaas_services.pkg.services.influxdb._execute_influxdb_command"
    ) as mock_exec:
        mock_exec.return_value = (True, "")
        success, error = _setup_user_org_bucket("testuser", "userid123", {"testuser"})
        assert success is True
        assert error == ""
        # Should skip org creation, only add member and create bucket
        assert mock_exec.call_count == 2


def test_setup_user_org_bucket_create_org_fails():
    """Test setup when org creation fails"""
    with patch(
        "dtaas_services.pkg.services.influxdb._execute_influxdb_command"
    ) as mock_exec:
        mock_exec.return_value = (False, "org creation failed")
        success, error = _setup_user_org_bucket("testuser", "userid123", set())
        assert success is False
        assert "org creation failed" in error


def test_setup_user_org_bucket_add_member_fails():
    """Test setup when adding member fails"""
    with patch(
        "dtaas_services.pkg.services.influxdb._execute_influxdb_command"
    ) as mock_exec:
        # First call (create org) succeeds, second (add member) fails
        mock_exec.side_effect = [(True, ""), (False, "add member failed")]
        success, error = _setup_user_org_bucket("testuser", "userid123", set())
        assert success is False
        assert "add member failed" in error


def test_setup_user_org_bucket_create_bucket_fails():
    """Test setup when bucket creation fails"""
    with patch(
        "dtaas_services.pkg.services.influxdb._execute_influxdb_command"
    ) as mock_exec:
        # First two succeed, third (create bucket) fails
        mock_exec.side_effect = [(True, ""), (True, ""), (False, "bucket failed")]
        success, error = _setup_user_org_bucket("testuser", "userid123", set())
        assert success is False
        assert "bucket failed" in error


def test_setup_user_organizations_success():
    """Test setting up organizations for all users"""
    users_dict = {"user1": "id1", "user2": "id2"}
    existing_orgs = set()

    with patch(
        "dtaas_services.pkg.services.influxdb._setup_user_org_bucket"
    ) as mock_setup:
        mock_setup.return_value = (True, "")
        success, error = _setup_user_organizations(users_dict, existing_orgs)
        assert success is True
        assert error == ""
        assert mock_setup.call_count == 2


def test_setup_user_organizations_failure():
    """Test setting up organizations when one fails"""
    users_dict = {"user1": "id1", "user2": "id2"}
    existing_orgs = set()

    with patch(
        "dtaas_services.pkg.services.influxdb._setup_user_org_bucket"
    ) as mock_setup:
        mock_setup.return_value = (False, "setup failed")
        success, error = _setup_user_organizations(users_dict, existing_orgs)
        assert success is False
        assert "setup failed" in error


def test_fetch_influxdb_data_success():
    """Test successful data fetching"""

    with patch(
        "dtaas_services.pkg.services.influxdb._get_influxdb_users"
    ) as mock_users, patch(
        "dtaas_services.pkg.services.influxdb._get_existing_orgs"
    ) as mock_orgs:
        mock_users.return_value = (True, {"user1": "id1"}, "")
        mock_orgs.return_value = (True, {"org1"}, "")
        success, users_dict, existing_orgs, error = _fetch_influxdb_data()
        assert success is True
        assert users_dict == {"user1": "id1"}
        assert existing_orgs == {"org1"}
        assert error == ""


def test_fetch_influxdb_data_users_failure():
    """Test data fetching when get users fails"""
    with patch(
        "dtaas_services.pkg.services.influxdb._get_influxdb_users"
    ) as mock_users:
        mock_users.return_value = (False, {}, "failed to get users")
        success, _, _, error = _fetch_influxdb_data()
        assert success is False
        assert "failed to get users" in error


def test_fetch_influxdb_data_orgs_failure():
    """Test data fetching when get orgs fails"""
    with patch(
        "dtaas_services.pkg.services.influxdb._get_influxdb_users"
    ) as mock_users, patch(
        "dtaas_services.pkg.services.influxdb._get_existing_orgs"
    ) as mock_orgs:
        mock_users.return_value = (True, {"user1": "id1"}, "")
        mock_orgs.return_value = (False, set(), "failed to get orgs")
        success, _, _, error = _fetch_influxdb_data()
        assert success is False
        assert "failed to get orgs" in error


def test_execute_setup_steps_success():
    """Test successful execution of all setup steps"""
    csv_data = "username,password\nuser1,pass1\n"
    mock_file = mock_open(read_data=csv_data)()

    with patch(
        "dtaas_services.pkg.services.influxdb.create_users_from_credentials"
    ) as mock_create, patch(
        "dtaas_services.pkg.services.influxdb._fetch_influxdb_data"
    ) as mock_fetch, patch(
        "dtaas_services.pkg.services.influxdb._setup_user_organizations"
    ) as mock_setup:
        mock_create.return_value = (True, "")
        mock_fetch.return_value = (True, {"user1": "id1"}, {"org1"}, "")
        mock_setup.return_value = (True, "")
        success, error = _execute_setup_steps(mock_file)
        assert success is True
        assert error == ""


def test_execute_setup_steps_create_users_fails():
    """Test setup steps when user creation fails"""
    csv_data = "username,password\nuser1,pass1\n"
    mock_file = mock_open(read_data=csv_data)()

    with patch(
        "dtaas_services.pkg.services.influxdb.create_users_from_credentials"
    ) as mock_create:
        mock_create.return_value = (False, "creation failed")
        success, error = _execute_setup_steps(mock_file)
        assert success is False
        assert "creation failed" in error


def test_execute_setup_steps_fetch_data_fails():
    """Test setup steps when data fetching fails"""
    csv_data = "username,password\nuser1,pass1\n"
    mock_file = mock_open(read_data=csv_data)()

    with patch(
        "dtaas_services.pkg.services.influxdb.create_users_from_credentials"
    ) as mock_create, patch(
        "dtaas_services.pkg.services.influxdb._fetch_influxdb_data"
    ) as mock_fetch:
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


def test_permissions_influxdb_success_windows(mock_config):
    """Test successful InfluxDB permissions setup on Windows"""
    with patch("dtaas_services.pkg.services.influxdb.Config") as mock_cfg, patch(
        "dtaas_services.pkg.services.influxdb.set_service_cert_permissions",
        return_value=(True, "privkey set"),
    ), patch("pathlib.Path.exists", return_value=True):
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "INFLUX_UID": "1000",
            "INFLUX_GID": "1000",
        }.get(key, "default")
        mock_cfg.return_value = mock_instance
        mock_cfg.get_base_dir.return_value = Path("/test/base")

        with patch("shutil.copy2"):
            success, _ = permissions_influxdb()
            assert success is True


def test_permissions_influxdb_os_error(mock_config):
    """Test InfluxDB permissions setup with OSError"""
    with patch("platform.system", return_value="Linux"), patch(
        "pathlib.Path.exists", return_value=True
    ), patch("shutil.copy2", side_effect=OSError("Copy failed")):
        success, message = permissions_influxdb()
        assert success is False
        assert "Error setting permissions for InfluxDB" in message
