"""Tests for pkg/password_store.py"""

import pytest
from dtaas_services.pkg import password_store as ps


@pytest.fixture(autouse=True)
def patch_base_dir(tmp_path, mocker):
    """Redirect Config.get_base_dir() to a temp directory for every test."""
    mocker.patch(
        "dtaas_services.pkg.password_store.Config.get_base_dir",
        return_value=tmp_path,
    )
    return tmp_path


def test_get_current_password_missing_file():
    """Returns default when the passwords file does not exist."""
    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == ""
    assert (
        ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD", "fallback")
        == "fallback"
    )


def test_remove_service_passwords_unknown_service():
    """Service name that has no registered keys."""
    ps.save_password("TB_SYSADMIN_CURRENT_PASSWORD", "val")
    ps.remove_service_passwords("unknown_service")
    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == "val"


def test_remove_service_passwords_file_absent():
    """(no error) when the passwords file does not exist."""
    ps.remove_service_passwords("thingsboard")


def test_remove_service_passwords_thingsboard():
    """Removes ThingsBoard keys, leaves others intact."""
    ps.save_password("TB_SYSADMIN_CURRENT_PASSWORD", "syspass")
    ps.save_password("TB_TENANT_ADMIN_CURRENT_PASSWORD", "tenantpass")
    ps.save_password("GITLAB_ROOT_CURRENT_PASSWORD", "gitpass")

    ps.remove_service_passwords("thingsboard")

    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("TB_TENANT_ADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("GITLAB_ROOT_CURRENT_PASSWORD") == "gitpass"


def test_remove_service_passwords_thingsboard_ce_alias():
    """'thingsboard-ce' alias cleans up the same TB keys."""
    ps.save_password("TB_SYSADMIN_CURRENT_PASSWORD", "syspass")
    ps.save_password("TB_TENANT_ADMIN_CURRENT_PASSWORD", "tenantpass")
    ps.save_password("GITLAB_ROOT_CURRENT_PASSWORD", "gitpass")

    ps.remove_service_passwords("thingsboard-ce")

    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("TB_TENANT_ADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("GITLAB_ROOT_CURRENT_PASSWORD") == "gitpass"
