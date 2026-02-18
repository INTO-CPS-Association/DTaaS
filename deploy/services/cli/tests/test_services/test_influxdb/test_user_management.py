# pylint: disable=redefined-outer-name
"""Tests for InfluxDB user management (user_management.py)"""

import json
from unittest.mock import patch
from dtaas_services.pkg.services.influxdb.user_management import (
    create_influxdb_user,
    get_influxdb_users,
    get_existing_orgs,
    setup_user_org_bucket,
    setup_user_organizations,
)

UM_PATH = "dtaas_services.pkg.services.influxdb.user_management"


def test_create_influxdb_user_success():
    """Test successful InfluxDB user creation"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (True, "")
        success, error = create_influxdb_user("testuser", "testpass")
        assert success is True
        assert error == ""


def test_create_influxdb_user_already_exists():
    """Test user creation when user already exists"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (
            False,
            "Failed to create user testuser: user already exists",
        )
        success, error = create_influxdb_user("testuser", "testpass")
        assert success is True
        assert error == ""


def test_create_influxdb_user_failure():
    """Test failed InfluxDB user creation"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (
            False,
            "Failed to create user testuser: connection refused",
        )
        success, error = create_influxdb_user("testuser", "testpass")
        assert success is False
        assert "Failed to create user testuser" in error


def test_get_influxdb_users_success():
    """Test successful retrieval of InfluxDB users"""
    users_data = [{"name": "user1", "id": "id1"}, {"name": "user2", "id": "id2"}]
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (True, json.dumps(users_data))
        success, users_dict, error = get_influxdb_users()
        assert success is True
        assert users_dict == {"user1": "id1", "user2": "id2"}
        assert error == ""


def test_get_influxdb_users_command_failure():
    """Test get users when command fails"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (
            False,
            "Failed to retrieve user list: connection error",
        )
        success, users_dict, error = get_influxdb_users()
        assert success is False
        assert users_dict == {}
        assert "Failed to retrieve user list" in error


def test_get_influxdb_users_json_parse_error():
    """Test get users with JSON parse error"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (True, "{invalid json")
        success, users_dict, error = get_influxdb_users()
        assert success is False
        assert users_dict == {}
        assert "Failed to parse JSON" in error


def test_get_existing_orgs_success():
    """Test successful retrieval of existing organizations"""
    orgs_data = [{"name": "org1"}, {"name": "org2"}]
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (True, json.dumps(orgs_data))
        success, org_names, error = get_existing_orgs()
        assert success is True
        assert org_names == {"org1", "org2"}
        assert error == ""


def test_get_existing_orgs_command_failure():
    """Test get orgs when command fails"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (
            False,
            "Failed to retrieve org list: connection error",
        )
        success, org_names, error = get_existing_orgs()
        assert success is False
        assert org_names == set()
        assert "Failed to retrieve org list" in error


def test_get_existing_orgs_json_parse_error():
    """Test get orgs with JSON parse error"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (True, "{invalid json")
        success, org_names, error = get_existing_orgs()
        assert success is False
        assert org_names == set()
        assert "Failed to parse JSON" in error


def test_setup_user_org_bucket_existing_org():
    """Test setup user org and bucket when org already exists"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (True, "")
        success, error = setup_user_org_bucket("testuser", "userid123", {"testuser"})
        assert success is True
        assert error == ""
        # org already exists: skip creation, only add member and create bucket
        assert mock_exec.call_count == 2


def test_setup_user_org_bucket_create_org_fails():
    """Test setup when org creation fails"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        mock_exec.return_value = (
            False,
            "Failed to create organization testuser: org creation failed",
        )
        success, error = setup_user_org_bucket("testuser", "userid123", set())
        assert success is False
        assert "org creation failed" in error


def test_setup_user_org_bucket_add_member_fails():
    """Test setup when adding member fails"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        # First call (create org) succeeds, second (add member) fails
        mock_exec.side_effect = [(True, ""), (False, "add member failed")]
        success, error = setup_user_org_bucket("testuser", "userid123", set())
        assert success is False
        assert "add member failed" in error


def test_setup_user_org_bucket_create_bucket_fails():
    """Test setup when bucket creation fails"""
    with patch(f"{UM_PATH}.execute_influxdb_command") as mock_exec:
        # First two succeed, third (create bucket) fails
        mock_exec.side_effect = [(True, ""), (True, ""), (False, "bucket failed")]
        success, error = setup_user_org_bucket("testuser", "userid123", set())
        assert success is False
        assert "bucket failed" in error


def test_setup_user_organizations_success():
    """Test setting up organizations for all users"""
    users_dict = {"user1": "id1", "user2": "id2"}
    existing_orgs = set()
    with patch(f"{UM_PATH}.setup_user_org_bucket") as mock_setup:
        mock_setup.return_value = (True, "")
        success, error = setup_user_organizations(users_dict, existing_orgs)
        assert success is True
        assert error == ""
        assert mock_setup.call_count == 2


def test_setup_user_organizations_failure():
    """Test setting up organizations when one fails"""
    users_dict = {"user1": "id1", "user2": "id2"}
    existing_orgs = set()
    with patch(f"{UM_PATH}.setup_user_org_bucket") as mock_setup:
        mock_setup.return_value = (False, "setup failed")
        success, error = setup_user_organizations(users_dict, existing_orgs)
        assert success is False
        assert "setup failed" in error
