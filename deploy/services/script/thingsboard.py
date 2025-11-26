#!/usr/bin/env python3
import json
import ssl
import urllib.request
import urllib.error
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # script/ -> project root
CONFIG_ENV_PATH = BASE_DIR / "config" / "services.env"

# Load credentials from the env file
def load_env(path: Path) -> dict:
    env = {}
    if not path.is_file():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env

class ThingsboardClient:
    def __init__(self, base_url: str, verify_tls: bool = True):
        self.base_url = base_url.rstrip("/")
        if not verify_tls:
            self.ssl_ctx = ssl._create_unverified_context()
        else:
            self.ssl_ctx = ssl.create_default_context()

    def _request(self, method: str, path: str, token: str | None = None, body: dict | None = None):
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["X-Authorization"] = f"Bearer {token}"

        data_bytes = None
        if body is not None:
            data_bytes = json.dumps(body).encode("utf-8")

        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, context=self.ssl_ctx) as resp:
                raw = resp.read().decode("utf-8")
                if not raw:
                    return {}
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return raw
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            print(f"[ERROR] HTTP {e.code} {e.reason} for {method} {path}")
            print(err_body)
            raise
        except urllib.error.URLError as e:
            print(f"[ERROR] URL error for {method} {path}: {e}")
            raise

    def login(self, username: str, password: str) -> str:
        resp = self._request(
            "POST",
            "/api/auth/login",
            body={"username": username, "password": password},
        )
        if not isinstance(resp, dict) or "token" not in resp:
            raise RuntimeError(f"Login failed for {username}: {resp}")
        return resp["token"]

    def change_password(self, token: str, current: str, new: str) -> None:
        body = {"currentPassword": current, "newPassword": new}
        self._request("POST", "/api/auth/changePassword", token=token, body=body)

    def create_tenant(self, sysadmin_token: str, title: str) -> str:
        body = {"title": title}
        resp = self._request("POST", "/api/tenant", token=sysadmin_token, body=body)
        if not isinstance(resp, dict) or "id" not in resp or "id" not in resp["id"]:
            raise RuntimeError(f"Failed to create tenant '{title}': {resp}")
        return resp["id"]["id"]

    def find_tenant_by_title(self, sysadmin_token: str, title: str) -> str | None:
        resp = self._request(
            "GET",
            f"/api/tenants?pageSize=50&page=0&textSearch={title}",
            token=sysadmin_token,
        )
        if not isinstance(resp, dict) or "data" not in resp:
            return None
        for t in resp["data"]:
            if t.get("title") == title and "id" in t and "id" in t["id"]:
                return t["id"]["id"]
        return None

    def create_tenant_admin_user(self, sysadmin_token: str, tenant_id: str, email: str) -> str:
        body = {
            "email": email,
            "authority": "TENANT_ADMIN",
            "tenantId": {"entityType": "TENANT", "id": tenant_id},
            "firstName": "DTaaS",
            "lastName": "Admin",
            "name": "DTaaS Admin",
        }
        resp = self._request(
            "POST",
            "/api/user?sendActivationMail=false",
            token=sysadmin_token,
            body=body,
        )
        if not isinstance(resp, dict) or "id" not in resp or "id" not in resp["id"]:
            raise RuntimeError(f"Failed to create tenant admin user {email}: {resp}")
        return resp["id"]["id"]

    def get_activation_link(self, sysadmin_token: str, user_id: str) -> str:
        resp = self._request(
            "GET",
            f"/api/user/{user_id}/activationLink",
            token=sysadmin_token,
        )
        if isinstance(resp, dict) and "activationLink" in resp:
            return resp["activationLink"]
        if isinstance(resp, str):
            return resp.strip()
        raise RuntimeError(f"Unexpected activationLink response: {resp}")

    def activate_user(self, activate_token: str, password: str):
        body = {"activateToken": activate_token, "password": password}
        return self._request("POST", "/api/noauth/activate", body=body)


def build_tb_url(env: dict) -> str:
    if "TB_URL" in env:
        return env["TB_URL"]
    host = env.get("HOSTNAME", "localhost")
    port = env.get("THINGSBOARD_PORT", "8089")
    return f"https://{host}:{port}"


def main():
    env = load_env(CONFIG_ENV_PATH)

    tb_url = build_tb_url(env)
    print(f"Using ThingsBoard URL: {tb_url}")

    sys_email = env.get("TB_SYSADMIN_EMAIL")
    sys_default_pw = env.get("TB_SYSADMIN_DEFAULT_PASSWORD")
    sys_new_pw = env.get("TB_SYSADMIN_NEW_PASSWORD", sys_default_pw)

    tenant_title = env.get("TB_TENANT_TITLE", "DTaaS")
    tenant_admin_email = env.get("TB_TENANT_ADMIN_EMAIL")
    tenant_admin_password = env.get("TB_TENANT_ADMIN_PASSWORD")

    client = ThingsboardClient(tb_url, verify_tls=True)

    # 1) Login as sysadmin; try default, then new
    print(f"Logging in as sysadmin ({sys_email})...")
    sys_token = None
    logged_with = None
    try:
        sys_token = client.login(sys_email, sys_default_pw)
        logged_with = "DEFAULT"
        print("Logged in with default sysadmin password.")
    except Exception:
        print("Default sysadmin password failed, trying new password...")
        try:
            sys_token = client.login(sys_email, sys_new_pw)
            logged_with = "NEW"
            print("Logged in with new sysadmin password.")
        except Exception as e:
            print("ERROR: Failed to log in as sysadmin with both default and new passwords.")
            raise e

    # 2) Change sysadmin password if currently default and a new one is configured
    if logged_with == "DEFAULT" and sys_default_pw != sys_new_pw:
        print("Changing sysadmin password...")
        client.change_password(sys_token, sys_default_pw, sys_new_pw)
        sys_token = client.login(sys_email, sys_new_pw)
        print("Sysadmin password changed and re-verified.")
    else:
        print("Skipping sysadmin password change (already using new or unchanged password).")

    # 3) Create tenant
    print(f"\nEnsuring tenant '{tenant_title}' exists...")
    tenant_id = client.find_tenant_by_title(sys_token, tenant_title)
    if tenant_id:
        print(f"Tenant '{tenant_title}' already exists with id {tenant_id}, reusing.")
    else:
        tenant_id = client.create_tenant(sys_token, tenant_title)
        print(f"Created tenant '{tenant_title}' with id {tenant_id}.")

    # 4) Create tenant admin user
    print(f"\nCreating tenant admin '{tenant_admin_email}'...")
    user_id = client.create_tenant_admin_user(sys_token, tenant_id, tenant_admin_email)
    print(f"Tenant admin user created with id {user_id}.")

    # 5) Get activation link and token
    activation_link = client.get_activation_link(sys_token, user_id)
    print(f"Activation link: {activation_link}")
    if "activateToken=" in activation_link:
        activate_token = activation_link.split("activateToken=", 1)[1]
    else:
        activate_token = activation_link  # fallback if server returns raw token
    print(f"Using activateToken: {activate_token}")

    # 6) Activate tenant admin with password from env
    client.activate_user(activate_token, tenant_admin_password)
    print(f"Tenant admin '{tenant_admin_email}' activated with configured password.")

    print("\nThingsBoard bootstrap complete.")


if __name__ == "__main__":
    main()
