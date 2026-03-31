"""ThingsBoard tenant management and sysadmin email operations."""

# pylint: disable=W1203, R0903
import logging
import os
from typing import Tuple
import httpx
from .tb_utility import is_json_parse_error
from rich.console import Console

logger = logging.getLogger(__name__)

# ThingsBoard platform default sysadmin email (created during DB init)
_DEFAULT_SYSADMIN_EMAIL = "sysadmin@thingsboard.org"


def _find_tenant_in_response(body: dict, tenant_name: str) -> dict | None:
    """Find tenant by name in response body."""
    for tenant in body.get("data", []):
        if tenant.get("title") == tenant_name:
            logger.info(f"  Tenant '{tenant_name}' already exists")
            return tenant
    return None


def _check_existing_tenant(
    params: dict, base_url: str, session: httpx.Client
) -> Tuple[dict | None, str]:
    """Check if tenant already exists."""
    try:
        resp = session.get(f"{base_url}/api/tenants", params=params, timeout=20)
        if resp.status_code != 200:
            return None, f"Failed to get tenants: {resp.status_code}"

        body = resp.json()
        tenant_name = params.get("textSearch", "")
        return _find_tenant_in_response(body, tenant_name), ""
    except Exception as e:
        error_type = "Invalid JSON" if is_json_parse_error(e) else "Network error"
        return None, f"{error_type} checking tenant: {e}"


def _create_new_tenant(
    base_url: str, session: httpx.Client, tenant_name: str
) -> Tuple[dict | None, str]:
    """Create a new tenant."""
    logger.info(f"  Creating tenant '{tenant_name}'...")
    create_payload = {"title": tenant_name}
    try:
        resp = session.post(f"{base_url}/api/tenant", json=create_payload, timeout=20)

        if resp.status_code not in (200, 201):
            return None, f"Failed to create tenant: {resp.status_code}"

        tenant = resp.json()
        logger.info(f"  Tenant '{tenant_name}' created")
        return tenant, ""
    except Exception as e:
        error_type = "Invalid JSON" if is_json_parse_error(e) else "Network error"
        return None, f"{error_type} creating tenant: {e}"


def get_or_create_tenant(
    base_url: str, session: httpx.Client, tenant_name: str
) -> Tuple[dict | None, str]:
    """Get existing tenant or create a new one."""
    try:
        params = {"pageSize": 100, "page": 0, "textSearch": tenant_name}
        tenant, error_msg = _check_existing_tenant(params, base_url, session)

        if error_msg:
            return None, error_msg

        # Return existing tenant or create new one
        return (
            (tenant, "")
            if tenant
            else _create_new_tenant(base_url, session, tenant_name)
        )
    except Exception as e:
        return None, f"Exception getting/creating tenant: {e}"


def _get_current_user(base_url: str, session: httpx.Client) -> dict | None:
    """Get current authenticated user profile."""
    try:
        resp = session.get(f"{base_url}/api/auth/user", timeout=10)
        if resp.status_code == 200:
            return resp.json()
        return None
    except (httpx.HTTPError, ValueError):
        return None


def _save_user(base_url: str, session: httpx.Client, user: dict) -> Tuple[bool, str]:
    """Save user profile update."""
    try:
        resp = session.post(
            f"{base_url}/api/user",
            params={"sendActivationMail": "false"},
            json=user,
            timeout=10,
        )
        if resp.status_code in (200, 201):
            return True, ""
        return False, f"Failed to save user: {resp.status_code}"
    except httpx.HTTPError as e:
        return False, f"Network error saving user: {e}"


def change_sysadmin_email(
    base_url: str, session: httpx.Client, new_email: str
) -> Tuple[bool, str]:
    """Change sysadmin email to the configured value."""
    user = _get_current_user(base_url, session)
    if not user:
        return False, "Failed to get current user profile"

    current_email = user.get("email", "")
    if current_email == new_email:
        logger.info("Sysadmin email already matches configured value.")
        return True, "Email already updated"

    logger.info(f"Changing sysadmin email from '{current_email}' to '{new_email}'...")
    user["email"] = new_email
    return _save_user(base_url, session, user)


def update_sysadmin_email_in_db(console: Console, docker) -> None:
    """Update sysadmin email in PostgreSQL directly after DB install.

    Reads TB_SYSADMIN_EMAIL from environment. If it differs from the
    ThingsBoard platform default, runs a SQL UPDATE against the tb_user table.
    """
    new_email = os.getenv("TB_SYSADMIN_EMAIL", "").strip()
    if not new_email:
        console.print(
            "[yellow]Warning: TB_SYSADMIN_EMAIL is not set in "
            "config/services.env. Skipping email update.[/yellow]"
        )
        return
    if new_email == _DEFAULT_SYSADMIN_EMAIL:
        return

    escaped = new_email.replace("'", "''")
    sql = f"UPDATE tb_user SET email = '{escaped}' WHERE authority = 'SYS_ADMIN';"
    pg_user = os.getenv("POSTGRES_USER", "postgres")
    pg_db = os.getenv("POSTGRES_DB", "thingsboard")
    try:
        docker.execute(
            "postgres",
            ["psql", "-U", pg_user, "-d", pg_db, "-c", sql],
        )
        console.print(f"[green]Updated sysadmin email to {new_email}[/green]")
    except Exception as e:
        console.print(f"[yellow]Warning: Could not update sysadmin email: {e}[/yellow]")
