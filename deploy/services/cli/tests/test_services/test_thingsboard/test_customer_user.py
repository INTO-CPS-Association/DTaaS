"""Tests for ThingsBoard customer and customer user creation."""

from unittest.mock import Mock
import httpx
from dtaas_services.pkg.services.thingsboard import customer_user as cu
# pylint: disable=W0212

TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
BASE_URL = "https://localhost:8080"


def _make_ctx(session=None):
    """Create a CustomerUserContext for testing."""
    ctx = cu.CustomerUserContext(BASE_URL, session or Mock(), "testcust")
    ctx.user_email = TEST_EMAIL
    ctx.user_password = TEST_PASSWORD
    return ctx


def test_check_existing_customer_exception():
    """Test checking for existing customer - exception."""
    session = Mock()
    session.get.side_effect = Exception("Network problem")
    cust, err = cu._check_existing_customer(BASE_URL, session, "cust1")
    assert cust is None
    assert "Network error" in err


def test_create_new_customer_failure():
    """Test creating a new customer - failure."""
    session = Mock()
    session.post.return_value = Mock(status_code=500)
    cust, err = cu._create_new_customer(BASE_URL, session, "cust1")
    assert cust is None
    assert "Failed" in err


def test_create_new_customer_exception():
    """Test creating a new customer - exception."""
    session = Mock()
    session.post.side_effect = Exception("Network problem")
    cust, err = cu._create_new_customer(BASE_URL, session, "cust1")
    assert cust is None
    assert "Network error" in err


def test_get_or_create_customer_exists():
    """Test get_or_create_customer - already exists."""
    session = Mock()
    session.get.return_value = Mock(
        status_code=200,
        json=lambda: {"data": [{"title": "cust1", "id": {"id": "c1"}}]},
    )
    cust, err = cu.get_or_create_customer(BASE_URL, session, "cust1")
    assert cust is not None
    assert err == ""


def test_get_or_create_customer_creates():
    """Test get_or_create_customer - creates new."""
    session = Mock()
    session.get.return_value = Mock(status_code=200, json=lambda: {"data": []})
    session.post.return_value = Mock(
        status_code=201, json=lambda: {"id": {"id": "c2"}, "title": "cust2"}
    )
    cust, err = cu.get_or_create_customer(BASE_URL, session, "cust2")
    assert cust is not None
    assert err == ""


def test_get_or_create_customer_error():
    """Test get_or_create_customer - check error."""
    session = Mock()
    session.get.return_value = Mock(status_code=500)
    cust, err = cu.get_or_create_customer(BASE_URL, session, "cust1")
    assert cust is None
    assert "Failed" in err


def test_create_user_api_call_success():
    """Test creating user API call - success."""
    session = Mock()
    session.post.return_value = Mock(status_code=200)
    ctx = _make_ctx(session)
    resp, err = cu._create_user_api_call(ctx, {"email": TEST_EMAIL})
    assert resp is not None
    assert err == ""


def test_create_user_api_call_network_error():
    """Test creating user API call - network error."""
    session = Mock()
    session.post.side_effect = httpx.HTTPError("Connection failed")
    ctx = _make_ctx(session)
    resp, err = cu._create_user_api_call(ctx, {"email": TEST_EMAIL})
    assert resp is None
    assert "Network error" in err


def test_handle_user_already_exists_json_error():
    """Test handler when JSON parsing fails."""
    resp = Mock(status_code=400)
    resp.json.side_effect = Exception("bad json")
    uid, err = cu._handle_user_already_exists(resp)
    assert uid is None
    assert "Failed" in err


def test_extract_user_id_missing():
    """Test extracting user ID - missing."""
    resp = Mock()
    resp.json.return_value = {"id": {}}
    uid, err = cu._extract_user_id(resp)
    assert uid is None
    assert "missing" in err


def test_extract_user_id_json_error():
    """Test extracting user ID - JSON error."""
    resp = Mock()
    resp.json.side_effect = Exception("JSON decode error")
    uid, err = cu._extract_user_id(resp)
    assert uid is None
    assert err != ""


def test_handle_create_response_success():
    """Test routing create response - 200."""
    resp = Mock(status_code=200)
    resp.json.return_value = {"id": {"id": "u1"}}
    uid, _ = cu._handle_create_response(resp)
    assert uid == "u1"


def test_handle_create_response_400():
    """Test routing create response - 400."""
    resp = Mock(status_code=400)
    resp.json.return_value = {"message": "already exists"}
    uid, err = cu._handle_create_response(resp)
    assert uid is None
    assert err == ""


def test_handle_create_response_other():
    """Test routing create response - other status."""
    resp = Mock(status_code=500)
    uid, err = cu._handle_create_response(resp)
    assert uid is None
    assert "Failed" in err


def test_handle_missing_user_id_error():
    """Test handle missing user ID - actual error."""
    success, _ = cu._handle_missing_user_id("some error")
    assert success is False


def test_activate_customer_user_success(mocker):
    """Test activating customer user - success."""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user.get_activation_token",
        return_value=("tok", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user.activate_user",
        return_value=(True, ""),
    )
    ctx = _make_ctx()
    success, _ = cu._activate_customer_user(ctx, "u1")
    assert success is True


def test_activate_customer_user_no_token(mocker):
    """Test activating customer user - no token."""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user.get_activation_token",
        return_value=(None, "error"),
    )
    ctx = _make_ctx()
    success, _ = cu._activate_customer_user(ctx, "u1")
    assert success is False


def test_activate_customer_user_activate_fails(mocker):
    """Test activating customer user - activate fails."""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user.get_activation_token",
        return_value=("tok", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user.activate_user",
        return_value=(False, "fail"),
    )
    ctx = _make_ctx()
    success, _ = cu._activate_customer_user(ctx, "u1")
    assert success is False


def test_ensure_customer_user_no_id():
    """Test ensure customer user - missing customer ID."""
    ctx = _make_ctx()
    success, err = cu._ensure_customer_user(ctx, {"id": {}})
    assert success is False
    assert "missing id" in err


def test_ensure_customer_user_success(mocker):
    """Test ensure customer user - full success."""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user._create_customer_user",
        return_value=("u1", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user._activate_customer_user",
        return_value=(True, ""),
    )
    ctx = _make_ctx()
    success, _ = cu._ensure_customer_user(ctx, {"id": {"id": "c1"}})
    assert success is True


def test_ensure_customer_user_already_exists(mocker):
    """Test ensure customer user - user already exists."""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user._create_customer_user",
        return_value=(None, ""),
    )
    ctx = _make_ctx()
    success, _ = cu._ensure_customer_user(ctx, {"id": {"id": "c1"}})
    assert success is True


def test_create_customer_and_user_success(mocker):
    """Test full create customer and user flow - success."""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user.get_or_create_customer",
        return_value=({"id": {"id": "c1"}}, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user._ensure_customer_user",
        return_value=(True, ""),
    )
    ctx = _make_ctx()
    success, _ = cu.create_customer_and_user(ctx)
    assert success is True


def test_create_customer_and_user_customer_fails(mocker):
    """Test full create customer and user flow - customer fails."""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.customer_user.get_or_create_customer",
        return_value=(None, "error"),
    )
    ctx = _make_ctx()
    success, _ = cu.create_customer_and_user(ctx)
    assert success is False
