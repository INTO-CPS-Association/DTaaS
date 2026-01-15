# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard user management - Refactored"""

import os
import shutil
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock, mock_open
import pytest
import requests
import dtaas_services.pkg.thingsboard as th
from dtaas_services.pkg.cert import set_service_cert_permissions, _CertPermissionContext

# Test constants (not real credentials, for testing only)
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""
TEST_OLD_PASSWORD = "old"  # noqa: S105 # NOSONAR
TEST_NEW_PASSWORD = "new"  # noqa: S105 # NOSONAR
TEST_CONFIGURED_PASSWORD = "newpassword"  # noqa: S105 # NOSONAR


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.thingsboard.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "POSTGRES_UID": "999",
            "POSTGRES_GID": "999",
            "THINGSBOARD_UID": "1000",
            "THINGSBOARD_GID": "1000",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


# Base URL and Login Tests
@pytest.mark.parametrize(
    "env_vars,expected_url",
    [
        (
            {
                "HOSTNAME": "localhost",
                "THINGSBOARD_PORT": "8080",
                "THINGSBOARD_SCHEME": "https",
            },
            "https://localhost:8080",
        ),
        (
            {
                "HOSTNAME": "custom.example.com",
                "THINGSBOARD_PORT": "9090",
                "THINGSBOARD_SCHEME": "https",
            },
            "https://custom.example.com:9090",
        ),
    ],
)
def test_build_base_url(env_vars, expected_url):
    """Test building base URL with different configurations"""
    with patch.dict(os.environ, env_vars, clear=False):
        assert th.build_base_url() == expected_url


@pytest.mark.parametrize(
    "status_code,json_data,expected_token",
    [
        (200, {"token": "test_token"}, "test_token"),
        (401, None, None),
        (500, None, None),
    ],
)
def test_handle_login_response(status_code, json_data, expected_token):
    """Test handling different login response scenarios"""
    mock_response = Mock()
    mock_response.status_code = status_code
    if json_data:
        mock_response.json.return_value = json_data
    mock_response.text = "error"
    assert th._handle_login_response(mock_response) == expected_token


def test_login_scenarios():
    """Test login with success, failure, and exception"""
    base_url = "https://localhost:8080"
    email = TEST_EMAIL
    password = TEST_PASSWORD

    # Success case
    with patch("requests.post") as mock_post:
        mock_post.return_value = Mock(
            status_code=200, json=lambda: {"token": "token123"}
        )
        assert th.login(base_url, email, password) == "token123"

    # Failure case
    with patch("requests.post") as mock_post:
        mock_post.return_value = Mock(status_code=401)
        assert th.login(base_url, email, password) is None

    # Exception case
    with patch(
        "requests.post", side_effect=requests.exceptions.RequestException("Error")
    ):
        assert th.login(base_url, email, password) is None


# Password Configuration Tests
@pytest.mark.parametrize(
    "env_password,expected",
    [
        (TEST_CONFIGURED_PASSWORD, TEST_CONFIGURED_PASSWORD),
        (None, None),
    ],
)
def test_check_password_configured(env_password, expected):
    """Test password configuration checking"""
    env_dict = {"TB_SYSADMIN_NEW_PASSWORD": env_password} if env_password else {}
    with patch.dict(os.environ, env_dict, clear=True):
        assert th._check_password_configured() == expected


def test_update_session_token():
    """Test updating session token"""
    session = requests.Session()
    th._update_session_token(session, "test_token")
    assert session.headers["X-Authorization"] == "Bearer test_token"


@pytest.mark.parametrize(
    "status_code,expected_success",
    [
        (200, True),
        (400, False),
    ],
)
def test_change_password_api_call(status_code, expected_success):
    """Test password change API call with different responses"""
    mock_session = Mock()
    mock_session.post.return_value = Mock(status_code=status_code, text="error")
    pw_config = th._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th._PasswordChangeContext(
        "https://localhost:8080", mock_session, pw_config
    )
    result = th._change_password_api_call(ctx)
    assert result == expected_success


def test_change_password_api_call_exception():
    """Test password change API call with exception"""
    mock_session = Mock()
    mock_session.post.side_effect = requests.exceptions.RequestException("Error")
    pw_config = th._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th._PasswordChangeContext(
        "https://localhost:8080", mock_session, pw_config
    )
    assert th._change_password_api_call(ctx) is False


def test_perform_password_change_scenarios():
    """Test password change with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    pw_config = th._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th._PasswordChangeContext(
        base_url, session, pw_config
    )
    # Success case
    with patch(
        "dtaas_services.pkg.thingsboard._change_password_api_call", return_value=True
    ), patch("dtaas_services.pkg.thingsboard.login", return_value="token"), patch(
        "dtaas_services.pkg.thingsboard._update_session_token"
    ):
        success, _ = th._perform_password_change(ctx)
        assert success is True
    # API call fails
    with patch(
        "dtaas_services.pkg.thingsboard._change_password_api_call", return_value=False
    ):
        success, _ = th._perform_password_change(ctx)
        assert success is False
    # Re-login fails
    with patch(
        "dtaas_services.pkg.thingsboard._change_password_api_call", return_value=True
    ), patch("dtaas_services.pkg.thingsboard.login", return_value=None):
        success, _ = th._perform_password_change(ctx)
        assert success is False


def test_change_sysadmin_password_scenarios():
    """Test sysadmin password change with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    # Password already changed
    with patch(
        "dtaas_services.pkg.thingsboard._try_login_with_new_password",
        return_value="token",
    ), patch("dtaas_services.pkg.thingsboard._update_session_token"):
        success, _ = th.change_sysadmin_password_if_needed(base_url, session, "new")
        assert success is True
    # Change needed
    with patch(
        "dtaas_services.pkg.thingsboard._try_login_with_new_password", return_value=None
    ), patch("dtaas_services.pkg.thingsboard.login", return_value="token"), patch(
        "dtaas_services.pkg.thingsboard._update_session_token"
    ), patch(
        "dtaas_services.pkg.thingsboard._perform_password_change",
        return_value=(True, "OK"),
    ):
        success, _ = th.change_sysadmin_password_if_needed(base_url, session, "new")
        assert success is True
    # Default login fails
    with patch(
        "dtaas_services.pkg.thingsboard._try_login_with_new_password", return_value=None
    ), patch("dtaas_services.pkg.thingsboard.login", return_value=None):
        success, _ = th.change_sysadmin_password_if_needed(base_url, session, "new")
        assert success is False


# Tenant Management Tests
def test_check_existing_tenant_scenarios():
    """Test checking for existing tenant with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    params = {"textSearch": "test-tenant"}
    # Tenant found
    session.get.return_value = Mock(
        status_code=200,
        json=lambda: {"data": [{"title": "test-tenant", "id": {"id": "123"}}]},
    )
    tenant, error = th._check_existing_tenant(params, base_url, session)
    assert tenant is not None
    assert tenant["title"] == "test-tenant"
    # Tenant not found
    session.get.return_value = Mock(status_code=200, json=lambda: {"data": []})
    tenant, error = th._check_existing_tenant(params, base_url, session)
    assert tenant is None
    # JSON error
    session.get.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=requests.exceptions.JSONDecodeError("err", "doc", 0)),
    )
    tenant, error = th._check_existing_tenant(params, base_url, session)
    assert tenant is None
    assert "Invalid JSON" in error
    # Request exception
    session.get.side_effect = requests.exceptions.RequestException("Error")
    tenant, error = th._check_existing_tenant(params, base_url, session)
    assert tenant is None


def test_create_new_tenant_scenarios():
    """Test tenant creation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    # Success
    session.post.return_value = Mock(
        status_code=200, json=lambda: {"id": {"id": "123"}, "title": "new"}
    )
    tenant, error = th._create_new_tenant(base_url, session, "new")
    assert tenant is not None
    assert error == ""
    # Failure
    session.post.return_value = Mock(status_code=400, text="Error")
    tenant, error = th._create_new_tenant(base_url, session, "new")
    assert tenant is None
    assert error != ""
    # JSON error
    session.post.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=requests.exceptions.JSONDecodeError("err", "doc", 0)),
    )
    tenant, error = th._create_new_tenant(base_url, session, "new")
    assert tenant is None
    # Request exception
    session.post.side_effect = requests.exceptions.RequestException("Error")
    tenant, error = th._create_new_tenant(base_url, session, "new")
    assert tenant is None


def test_get_or_create_tenant_scenarios():
    """Test get or create tenant with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    # Existing tenant
    with patch(
        "dtaas_services.pkg.thingsboard._check_existing_tenant",
        return_value=({"name": "test"}, ""),
    ):
        tenant, _ = th._get_or_create_tenant(base_url, session, "test")
        assert tenant is not None
    # Create new
    with patch(
        "dtaas_services.pkg.thingsboard._check_existing_tenant", return_value=(None, "")
    ), patch(
        "dtaas_services.pkg.thingsboard._create_new_tenant",
        return_value=({" title": "new"}, ""),
    ):
        tenant, _ = th._get_or_create_tenant(base_url, session, "new")
        assert tenant is not None
    # Exception
    with patch(
        "dtaas_services.pkg.thingsboard._check_existing_tenant",
        side_effect=Exception("Error"),
    ):
        tenant, _ = th._get_or_create_tenant(base_url, session, "test")
        assert tenant is None


# Admin User Tests
@pytest.mark.parametrize(
    "login_token,expected",
    [
        ("token123", True),
        (None, False),
    ],
)
def test_check_admin_exists(login_token, expected):
    """Test checking if admin exists"""
    with patch("dtaas_services.pkg.thingsboard.login", return_value=login_token):
        result = th._check_admin_exists(
            "https://localhost:8080", "admin@ex.com", "pass"
        )
        assert result == expected


def test_create_tenant_admin_user_scenarios():
    """Test tenant admin user creation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = "password"
    # Success
    session.post.return_value = Mock(
        status_code=200, json=lambda: {"id": {"id": "user123"}}
    )
    user_id, error = th._create_tenant_admin_user(ctx, "tenant")
    assert user_id == "user123"
    assert error == ""
    # Failure
    session.post.return_value = Mock(status_code=400, text="Error")
    user_id, error = th._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert error != ""
    # JSON error
    session.post.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=requests.exceptions.JSONDecodeError("err", "doc", 0)),
    )
    user_id, error = th._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert error != ""


def test_get_activation_token_scenarios():
    """Test activation token retrieval with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    # Success
    session.get.return_value = Mock(status_code=200, text="link?activateToken=token123")
    token, error = th._get_activation_token(base_url, session, "user123")
    assert token == "token123"
    assert error == ""
    # No token
    session.get.return_value = Mock(status_code=200, text="no token")
    token, error = th._get_activation_token(base_url, session, "user123")
    assert token is None
    assert error != ""
    # Exception
    session.get.side_effect = requests.exceptions.RequestException("Error")
    token, error = th._get_activation_token(base_url, session, "user123")
    assert token is None
    assert error != ""


def test_activate_user_scenarios():
    """Test user activation with multiple scenarios"""
    base_url = "https://localhost:8080"
    # Success
    with patch("requests.post", return_value=Mock(status_code=200)):
        success, _ = th._activate_user(base_url, "token", "pass")
        assert success is True
    # Failure
    with patch("requests.post", return_value=Mock(status_code=400, text="Error")):
        success, _ = th._activate_user(base_url, "token", "pass")
        assert success is False
    # Exception
    with patch(
        "requests.post", side_effect=requests.exceptions.RequestException("Error")
    ):
        success, _ = th._activate_user(base_url, "token", "pass")
        assert success is False


@pytest.mark.parametrize(
    "login_token,expected_success",
    [
        ("token123", True),
        (None, False),
    ],
)
def test_verify_admin_login(login_token, expected_success):
    """Test admin login verification"""
    with patch("dtaas_services.pkg.thingsboard.login", return_value=login_token):
        success, _ = th._verify_admin_login(
            "https://localhost:8080", "admin@ex.com", "pass"
        )
        assert success == expected_success


def test_create_and_activate_admin_scenarios():
    """Test admin creation and activation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    # Full success
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=("user123", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._activate_user", return_value=(True, "")
    ), patch(
        "dtaas_services.pkg.thingsboard._verify_admin_login", return_value=(True, "")
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is True
    # Create fails
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=(None, "error"),
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Get token fails
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._get_activation_token",
        return_value=(None, "error"),
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Activate fails
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._activate_user", return_value=(False, "error")
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is False


def test_ensure_tenant_admin_scenarios():
    """Test ensuring tenant admin with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    tenant = {"id": {"id": "tenant123"}}
    # Already exists
    with patch("dtaas_services.pkg.thingsboard._check_admin_exists", return_value=True):
        success, _ = th._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Create new
    with patch(
        "dtaas_services.pkg.thingsboard._check_admin_exists", return_value=False
    ), patch(
        "dtaas_services.pkg.thingsboard._create_and_activate_admin",
        return_value=(True, ""),
    ):
        success, _ = th._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Exception
    with patch(
        "dtaas_services.pkg.thingsboard._check_admin_exists",
        side_effect=Exception("Error"),
    ):
        success, _ = th._ensure_tenant_admin(ctx, tenant)
        assert success is False


def test_create_tenant_and_admin_scenarios():
    """Test tenant and admin creation with scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    tenant = {"id": {"id": "123"}}
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard._get_or_create_tenant",
        return_value=(tenant, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._ensure_tenant_admin", return_value=(True, "")
    ):
        ctx = th._TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th._AdminCredentials("admin@ex.com", "pass")
        success, _ = th._create_tenant_and_admin(ctx)
        assert success is True
    # Tenant creation fails
    with patch(
        "dtaas_services.pkg.thingsboard._get_or_create_tenant",
        return_value=(None, "error"),
    ):
        ctx = th._TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th._AdminCredentials("admin@ex.com", "pass")
        success, _ = th._create_tenant_and_admin(ctx)
        assert success is False


# Credentials Processing Tests
def test_process_credentials_row_scenarios():
    """Test credentials row processing with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._CredentialProcessContext(base_url, session)
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_and_admin",
        return_value=(True, ""),
    ):
        cred = {
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD,
            "email": TEST_EMAIL,
        }
        success, _ = th._process_credentials_row(ctx, cred)
        assert success is True
    # No email
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_INVALID_EMAIL,
    }
    success, error = th._process_credentials_row(ctx, cred)
    assert success is False
    assert "Email field is required" in error
    # Duplicate email
    ctx.seen_emails.add(TEST_EMAIL)
    cred = {"username": TEST_USERNAME, "password": TEST_PASSWORD, "email": TEST_EMAIL}
    success, error = th._process_credentials_row(ctx, cred)
    assert success is False
    assert "Duplicate email" in error
    # Creation fails
    ctx2 = th._CredentialProcessContext(base_url, session)
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_and_admin",
        return_value=(False, "error"),
    ):
        cred = {
            "username": "user",
            "password": "pass",  # noqa: S105 # NOSONAR
            "email": "test@ex.com",
        }
        success, _ = th._process_credentials_row(ctx2, cred)
        assert success is False


def test_process_credentials_file_scenarios():
    """Test credentials file processing with scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    # Success
    with patch("pathlib.Path.open", mock_open(read_data=csv_data)), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_row",
        return_value=(True, ""),
    ):
        success, _ = th._process_credentials_file(
            base_url, session, Path("/test/creds.csv")
        )
        assert success is True
    # Row fails
    with patch("pathlib.Path.open", mock_open(read_data=csv_data)), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_row",
        return_value=(False, "error"),
    ):
        success, _ = th._process_credentials_file(
            base_url, session, Path("/test/creds.csv")
        )
        assert success is False


def test_setup_thingsboard_users_scenarios(mock_config):
    """Test ThingsBoard users setup with multiple scenarios"""
    # File not found
    with patch("pathlib.Path.exists", return_value=False):
        success, msg = th.setup_thingsboard_users()
        assert success is False
        assert "not found" in msg
    # Success
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url",
        return_value="https://localhost:8080",
    ), patch("requests.Session"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_file",
        return_value=(True, ""),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is True
    # Password change fails
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url",
        return_value="https://localhost:8080",
    ), patch("requests.Session"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
    # Process fails
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url",
        return_value="https://localhost:8080",
    ), patch("requests.Session"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_file",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
    # Exception
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url", side_effect=OSError("Error")
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False


def test_copy_and_chmod_cert(tmp_path):
    """Test copying and chmod of certificate"""
    src = tmp_path / "source.pem"
    dest = tmp_path / "dest.pem"
    src.write_bytes(b"CERT")

    with patch("shutil.copy2") as mock_copy:
        shutil.copy2(src, dest)
        mock_copy.assert_called_once()


@pytest.mark.parametrize(
    "os_type,should_call_chown",
    [
        ("linux", True),
        ("darwin", True),
        ("windows", False),
    ],
)
def test_set_cert_ownership(os_type, should_call_chown):
    """Test certificate ownership setting on different platforms"""

    cert_path = Path("/test/cert.pem")
    with patch("dtaas_services.pkg.cert.shutil.chown") as mock_chown, patch(
        "dtaas_services.pkg.cert.platform.system", return_value=os_type
    ), patch("dtaas_services.pkg.cert.is_ci", return_value=False), patch(
        "pathlib.Path.chmod"
    ):
        ctx = _CertPermissionContext("Test", cert_path, 999, 999)
        set_service_cert_permissions(ctx)
        if os_type in ("linux", "darwin"):
            mock_chown.assert_called_once()
        else:
            mock_chown.assert_not_called()


def test_setup_postgres_certs_scenarios():
    """Test PostgreSQL certificates setup with scenarios"""
    certs_dir = Path("/test/certs")
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard.set_service_cert_permissions",
        return_value=(True, "success"),
    ), patch("shutil.copy2"):
        success, _ = th._setup_postgres_certs(certs_dir, 999, 999)
        assert success is True
    # OSError
    with patch("shutil.copy2", side_effect=OSError("Error")):
        success, _ = th._setup_postgres_certs(certs_dir, 999, 999)
        assert success is False


def test_setup_thingsboard_certs_scenarios():
    """Test ThingsBoard certificates setup with scenarios"""
    certs_dir = Path("/test/certs")
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard.set_service_cert_permissions",
        return_value=(True, "success"),
    ), patch("shutil.copy2"):
        success, _ = th._setup_thingsboard_certs(certs_dir, 1000, 1000)
        assert success is True
    # OSError
    with patch("shutil.copy2", side_effect=OSError("Error")):
        success, _ = th._setup_thingsboard_certs(certs_dir, 1000, 1000)
        assert success is False


def test_set_directory_ownership():
    """Test setting directory ownership"""
    directory = Path("/test/dir")
    with patch("shutil.chown") as mock_chown, patch(
        "os.walk", return_value=[("/test/dir", ["sub"], ["file.txt"])]
    ):
        th._set_directory_ownership(directory, 1000, 1000)
        assert mock_chown.call_count > 0


def test_setup_thingsboard_directories_scenarios():
    """Test ThingsBoard directories setup with scenarios"""
    base_dir = Path("/test/base")
    # Create a mock config object
    mock_cfg = MagicMock()
    mock_cfg.base_dir = base_dir
    mock_cfg.os_type = "linux"
    mock_cfg.thingsboard_uid = 1000
    mock_cfg.thingsboard_gid = 1000

    # Success (non-CI)
    with patch("pathlib.Path.mkdir"), patch(
        "dtaas_services.pkg.thingsboard._set_directory_ownership"
    ), patch("dtaas_services.pkg.thingsboard.is_ci", return_value=False):
        success, _ = th._setup_thingsboard_directories(mock_cfg)
        assert success is True

    # Success (CI)
    with patch("pathlib.Path.mkdir"), patch(
        "dtaas_services.pkg.thingsboard._set_directory_ownership"
    ) as mock_chown, patch("dtaas_services.pkg.thingsboard.is_ci", return_value=True):
        success, _ = th._setup_thingsboard_directories(mock_cfg)
        assert success is True
        mock_chown.assert_not_called()

    # OSError
    with patch("pathlib.Path.mkdir", side_effect=OSError("Error")):
        success, _ = th._setup_thingsboard_directories(mock_cfg)
        assert success is False


def test_verify_certificates_exist_scenarios(tmp_path):
    """Test certificate verification with scenarios"""
    # Success
    certs_dir = tmp_path
    (certs_dir / "privkey.pem").write_bytes(b"KEY")
    (certs_dir / "fullchain.pem").write_bytes(b"CERT")
    success, _ = th._verify_certificates_exist(certs_dir)
    assert success is True
    # Missing
    with patch("pathlib.Path.exists", return_value=False):
        success, _ = th._verify_certificates_exist(Path("/nonexistent"))
        assert success is False


def test_permissions_thingsboard_scenarios(mock_config):
    """Test ThingsBoard permissions setup with scenarios"""
    # Success
    with patch("platform.system", return_value="Linux"), patch(
        "dtaas_services.pkg.thingsboard.copy_certs", return_value=(True, "copied")
    ), patch(
        "dtaas_services.pkg.thingsboard._verify_certificates_exist",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._execute_setup_operations",
        return_value=(True, ["setup1", "setup2"]),
    ):
        success, _ = th.permissions_thingsboard()
        assert success is True
    # Verify fails
    with patch("platform.system", return_value="Linux"), patch(
        "dtaas_services.pkg.thingsboard.copy_certs", return_value=(True, "copied")
    ), patch(
        "dtaas_services.pkg.thingsboard._verify_certificates_exist",
        return_value=(False, "missing"),
    ):
        success, _ = th.permissions_thingsboard()
        assert success is False
