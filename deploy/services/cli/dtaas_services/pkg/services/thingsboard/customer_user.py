"""Customer and customer user creation for ThingsBoard."""

# pylint: disable=W1203, R0903
import logging
from typing import Tuple
import httpx
from .tb_utility import is_json_parse_error
from .activation import get_activation_token, activate_user

logger = logging.getLogger(__name__)

_INVALID_JSON = "Invalid JSON"


class CustomerUserContext:
    """Context for customer user creation operations."""

    def __init__(self, base_url: str, session: httpx.Client, customer_name: str):
        self.base_url = base_url
        self.session = session
        self.customer_name = customer_name
        self.user_email = ""
        self.user_password = ""


def _find_customer_in_response(body: dict, customer_name: str) -> dict | None:
    """Find customer by title in API response body."""
    for customer in body.get("data", []):
        if customer.get("title") == customer_name:
            logger.info(f"  Customer '{customer_name}' already exists")
            return customer
    return None


def _check_existing_customer(
    base_url: str, session: httpx.Client, customer_name: str
) -> Tuple[dict | None, str]:
    """Check if a customer with the given name already exists."""
    params = {"pageSize": 100, "page": 0, "textSearch": customer_name}
    try:
        resp = session.get(f"{base_url}/api/customers", params=params, timeout=20)
        if resp.status_code != 200:
            return None, f"Failed to get customers: {resp.status_code}"
        return _find_customer_in_response(resp.json(), customer_name), ""
    except Exception as e:
        error_type = _INVALID_JSON if is_json_parse_error(e) else "Network error"
        return None, f"{error_type} checking customer: {e}"


def _create_new_customer(
    base_url: str, session: httpx.Client, customer_name: str
) -> Tuple[dict | None, str]:
    """Create a new customer via ThingsBoard API."""
    logger.info(f"  Creating customer '{customer_name}'...")
    try:
        resp = session.post(
            f"{base_url}/api/customer",
            json={"title": customer_name},
            timeout=20,
        )
        if resp.status_code not in (200, 201):
            return None, f"Failed to create customer: {resp.status_code}"
        logger.info(f"  Customer '{customer_name}' created")
        return resp.json(), ""
    except Exception as e:
        error_type = _INVALID_JSON if is_json_parse_error(e) else "Network error"
        return None, f"{error_type} creating customer: {e}"


def get_or_create_customer(
    base_url: str, session: httpx.Client, customer_name: str
) -> Tuple[dict | None, str]:
    """Get existing customer or create a new one."""
    customer, error_msg = _check_existing_customer(base_url, session, customer_name)
    if error_msg:
        return None, error_msg
    if customer:
        return customer, ""
    return _create_new_customer(base_url, session, customer_name)


def _create_user_api_call(
    ctx: CustomerUserContext, payload: dict
) -> Tuple[httpx.Response | None, str]:
    """Make API call to create a customer user."""
    try:
        resp = ctx.session.post(
            f"{ctx.base_url}/api/user",
            params={"sendActivationMail": "false"},
            json=payload,
            timeout=10,
        )
        return resp, ""
    except httpx.HTTPError as e:
        return None, f"Network error creating customer user: {e}"


def _handle_user_already_exists(resp: httpx.Response) -> Tuple[str | None, str]:
    """Handle 400 response when user may already exist."""
    try:
        error_data = resp.json()
        if "already" in error_data.get("message", "").lower():
            logger.info("  Customer user already exists, skipping...")
            return None, ""
    except Exception:
        pass
    return None, f"Failed to create customer user: {resp.status_code}"


def _extract_user_id(resp: httpx.Response) -> Tuple[str | None, str]:
    """Extract user ID from successful create user response."""
    try:
        user = resp.json()
        user_id = user.get("id", {}).get("id")
        if user_id:
            return user_id, ""
        return None, "Created user response missing id"
    except Exception as e:
        error_type = _INVALID_JSON if is_json_parse_error(e) else "Unexpected error"
        return None, f"{error_type} in customer user response: {e}"


def _handle_create_response(resp: httpx.Response) -> Tuple[str | None, str]:
    """Route create user response to appropriate handler."""
    if resp.status_code == 400:
        return _handle_user_already_exists(resp)
    if resp.status_code not in (200, 201):
        return None, f"Failed to create customer user: {resp.status_code}"
    return _extract_user_id(resp)


def _create_customer_user(
    ctx: CustomerUserContext, customer_id: str
) -> Tuple[str | None, str]:
    """Create a customer user under a customer."""
    logger.info(f"  Creating customer user '{ctx.user_email}'...")
    payload = {
        "email": ctx.user_email,
        "authority": "CUSTOMER_USER",
        "customerId": {"id": customer_id, "entityType": "CUSTOMER"},
    }
    resp, error_msg = _create_user_api_call(ctx, payload)
    if not resp:
        return None, error_msg
    return _handle_create_response(resp)


def _activate_customer_user(ctx: CustomerUserContext, user_id: str) -> Tuple[bool, str]:
    """Activate a customer user account."""
    token, error_msg = get_activation_token(ctx.base_url, ctx.session, user_id)
    if not token:
        return False, error_msg
    success, error_msg = activate_user(ctx.base_url, token, ctx.user_password)
    if not success:
        return False, error_msg
    logger.info(f"  Customer user '{ctx.user_email}' created and activated")
    return True, ""


def _get_customer_id(customer: dict) -> str | None:
    """Extract customer ID from customer dictionary."""
    return (customer.get("id") or {}).get("id")


def _handle_missing_user_id(error_msg: str) -> Tuple[bool, str]:
    """Handle case when user creation returned no ID (user may already exist)."""
    if error_msg == "":
        return True, ""
    return False, error_msg


def _ensure_customer_user(ctx: CustomerUserContext, customer: dict) -> Tuple[bool, str]:
    """Create and activate a customer user under a customer."""
    customer_id = _get_customer_id(customer)
    if not customer_id:
        return False, "Invalid customer object, missing id"
    user_id, error_msg = _create_customer_user(ctx, customer_id)
    if not user_id:
        return _handle_missing_user_id(error_msg)
    return _activate_customer_user(ctx, user_id)


def create_customer_and_user(ctx: CustomerUserContext) -> Tuple[bool, str]:
    """Create a customer and a customer user under it.

    Args:
        ctx: Context with base_url, session, customer_name, user_email, user_password

    Returns:
        Tuple of (success, error_message)
    """
    customer, error_msg = get_or_create_customer(
        ctx.base_url, ctx.session, ctx.customer_name
    )
    if not customer:
        return False, error_msg
    return _ensure_customer_user(ctx, customer)
