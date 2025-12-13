#!/usr/bin/env python3
import os
import sys
import json
from urllib.parse import urlparse, parse_qs

import requests


def load_env_file(path: str) -> None:
    """Loads process environment variables from a file."""
    if not os.path.exists(path):
        print(f"env file not found: {path}")
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip('"').strip("'")
            os.environ[key] = value


def build_base_url() -> str:
    hostname = os.getenv("HOSTNAME", "localhost")
    port = os.getenv("THINGSBOARD_PORT", "8080")
    scheme = os.getenv("THINGSBOARD_SCHEME", "https")
    return f"{scheme}://{hostname}:{port}".rstrip("/")


def login(base_url: str, email: str, password: str) -> str | None:
    """Authenticate with ThingsBoard and return a JWT token."""
    url = f"{base_url}/api/auth/login"
    resp = requests.post(
        url,
        json={"username": email, "password": password},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("token")
        if token:
            return token
    elif resp.status_code == 401:
        # invalid credentials – just return None
        return None
    else:
        print(
            f"Unexpected login response {resp.status_code}: "
            f"{resp.text}"
        )
    return None


def change_sysadmin_password_if_needed(
    base_url: str,
    session: requests.Session,
) -> None:
    """Change the sysadmin password."""
    sys_email = "sysadmin@thingsboard.org"
    default_pw = "sysadmin"
    new_pw = os.getenv("TB_SYSADMIN_NEW_PASSWORD")

    if not new_pw:
        print(
            "TB_SYSADMIN_NEW_PASSWORD is not set in config/services.env.",
            "Skipping sysadmin password change.",
        )
        return

    # 1) Try login with new password first – if it works, we're done
    print(
        "Logging in as sysadmin "
        f"'{sys_email}' with new password to check current state..."
    )
    token = login(base_url, sys_email, new_pw)
    if token:
        print("Sysadmin already uses the new password. No change needed.")
        session.headers["X-Authorization"] = f"Bearer {token}"
        return

    # 2) Try with default password
    print("New password did not work, trying default sysadmin password...")
    token = login(base_url, sys_email, default_pw)
    if not token:
        print(
            "Unable to log in as sysadmin with either new or default "
            "password.\n"
            "Check TB_SYSADMIN_EMAIL, TB_SYSADMIN_DEFAULT_PASSWORD, and "
            "TB_SYSADMIN_NEW_PASSWORD in config/services.env and make "
            "sure ThingsBoard is running."
        )
        sys.exit(1)

    print("Logged in with default sysadmin password. Changing to new password...")
    session.headers["X-Authorization"] = f"Bearer {token}"

    url = f"{base_url}/api/auth/changePassword"
    resp = session.post(
        url,
        json={"currentPassword": default_pw, "newPassword": new_pw},
        timeout=10,
    )
    if resp.status_code == 200:
        print("Sysadmin password changed successfully.")
    else:
        print(
            "Failed to change sysadmin password: "
            f"{resp.status_code} {resp.text}"
        )
        sys.exit(1)

    # Log in again with new password to get a clean token
    token = login(base_url, sys_email, new_pw)
    if not token:
        print(
            "Changed password but failed to log in with new sysadmin "
            "password."
        )
        sys.exit(1)

    session.headers["X-Authorization"] = f"Bearer {token}"
    print("Re-logged in as sysadmin with new password.")


def get_or_create_tenant(base_url: str, session: requests.Session) -> dict:
    """Create new tenant in DTaaS name."""
    tenant_title = os.getenv("TB_TENANT_TITLE", "DTaaS")
    print(f"Ensuring tenant '{tenant_title}' exists...")

    # Try to find existing tenant via textSearch
    params = {"pageSize": 100, "page": 0, "textSearch": tenant_title}
    resp = session.get(f"{base_url}/api/tenants", params=params, timeout=10)
    if resp.status_code == 200:
        body = resp.json()
        for t in body.get("data", []):
            if t.get("title") == tenant_title:
                print(
                    "Tenant already exists: "
                    f"'{tenant_title}' "
                    f"(id={t.get('id', {}).get('id')})"
                )
                return t
    else:
        print(f"Failed to list tenants: {resp.status_code} {resp.text}")

    # Not found – create
    print(f"Creating tenant '{tenant_title}'...")
    create_payload = {"title": tenant_title}
    resp = session.post(f"{base_url}/api/tenant", json=create_payload, timeout=10)
    if resp.status_code not in (200, 201):
        print(f"Failed to create tenant: {resp.status_code} {resp.text}")
        sys.exit(1)

    tenant = resp.json()
    print(f"Tenant created: '{tenant_title}' (id={tenant.get('id', {}).get('id')})")
    return tenant


def ensure_tenant_admin(
    base_url: str,
    session: requests.Session,
    tenant: dict
) -> None:
    """Create/activate tenant admin user and set password."""
    admin_email = os.getenv("TB_TENANT_ADMIN_EMAIL")
    admin_pw = os.getenv("TB_TENANT_ADMIN_PASSWORD")

    if not admin_email or not admin_pw:
        print(
            "TB_TENANT_ADMIN_EMAIL or TB_TENANT_ADMIN_PASSWORD not set. "
            "Skipping tenant admin creation."
        )
        return

    print(
        "Ensuring tenant admin user "
        f"'{admin_email}' exists and has a password..."
    )

    # First, check if we can already log in as that tenant admin.
    print("Trying to log in as tenant admin to see if it already exists...")
    token = login(base_url, admin_email, admin_pw)
    if token:
        print("Tenant admin already exists and password matches. "
              "Nothing to do."
        )
        return

    # Otherwise, we create a tenant admin and activate it via activation link.
    tenant_id_obj = tenant.get("id") or {}
    tenant_id = tenant_id_obj.get("id")
    if not tenant_id:
        print(
            "Invalid tenant object, missing id: "
            f"{json.dumps(tenant, indent=2)}"
        )
        sys.exit(1)

    # Create user with sendActivationMail=false so we can activate via API.
    user_payload = {
        "email": admin_email,
        "authority": "TENANT_ADMIN",
        "tenantId": {"id": tenant_id, "entityType": "TENANT"},
        # You can optionally add firstName/lastName if you want:
        # "firstName": "DTaaS",
        # "lastName": "Admin",
    }

    print(
        f"Creating tenant admin user '{admin_email}' "
        "(sendActivationMail=false)..."
    )
    resp = session.post(
        f"{base_url}/api/user",
        params={"sendActivationMail": "false"},
        json=user_payload,
        timeout=10,
    )
    if resp.status_code not in (200, 201):
        print(
            "Failed to create tenant admin user: "
            f"{resp.status_code} {resp.text}"
        )
        sys.exit(1)

    user = resp.json()
    user_id_obj = user.get("id") or {}
    user_id = user_id_obj.get("id")
    if not user_id:
        print(
            "Created user response missing id: "
            f"{json.dumps(user, indent=2)}"
        )
        sys.exit(1)

    print(
        f"Tenant admin user created (id={user_id}). "
        "Fetching activation link..."
    )

    # Get activation link for this user
    resp = session.get(
        f"{base_url}/api/user/{user_id}/activationLink",
        timeout=10,
    )
    if resp.status_code != 200:
        print(
            "Failed to get activation link: "
            f"{resp.status_code} {resp.text}"
        )
        sys.exit(1)

    activation_link = resp.text.strip().strip('"')
    print(f"Activation link: {activation_link}")

    # Extract activateToken from activation link
    parsed = urlparse(activation_link)
    qs = parse_qs(parsed.query)
    tokens = qs.get("activateToken") or qs.get("activateToken".lower())
    if not tokens:
        print("Could not extract activateToken from activation link.")
        sys.exit(1)

    activate_token = tokens[0]
    print("Got activateToken, calling /api/noauth/activate to set password...")

    activate_payload = {
        "activateToken": activate_token,
        "password": admin_pw,
    }
    resp = requests.post(
        f"{base_url}/api/noauth/activate",
        json=activate_payload,
        timeout=10,
    )
    if resp.status_code != 200:
        print(
            "Failed to activate tenant admin user: "
            f"{resp.status_code} {resp.text}"
        )
        sys.exit(1)

    print("Tenant admin user activated and password set successfully.")

    # Final sanity check: try login as tenant admin
    token = login(base_url, admin_email, admin_pw)
    if token:
        print("Verified: can log in as tenant admin with configured password.")
    else:
        print(
            "Activation returned 200 but login as tenant admin "
            "still failed. Check ThingsBoard logs."
        )


def main() -> None:
    # 1) Load env file so everything comes from config/services.env
    load_env_file("config/services.env")

    base_url = build_base_url()
    print(f"Using ThingsBoard URL: {base_url}")

    session = requests.Session()
    # We keep TLS verification ON for security. If you ever need a custom CA, you can
    # set REQUESTS_CA_BUNDLE in the environment instead of disabling verification.

    # 2) Ensure sysadmin password is updated
    change_sysadmin_password_if_needed(base_url, session)

    # 3) Ensure tenant exists
    tenant = get_or_create_tenant(base_url, session)

    # 4) Ensure tenant admin exists and has a password
    ensure_tenant_admin(base_url, session, tenant)

    print("\nDone. Sysadmin password, tenant, and tenant admin are configured.")


if __name__ == "__main__":
    main()
