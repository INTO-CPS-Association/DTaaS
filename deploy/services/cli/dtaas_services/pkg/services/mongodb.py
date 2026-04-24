"""MongoDB installation, service and user management."""

from typing import Tuple
from ..config import Config
from ..cert import (
    create_combined_cert,
    set_service_cert_permissions,
    CertPermissionContext,
)
from ..utils import (
    process_credentials_file,
    create_users_from_credentials,
)
from ..docker_utils import execute_docker_command, DockerRunOptions
from ..sanitize import escape_js_string

ALREADY_EXISTS_CODE = 51003


def _build_create_user_script(username: str, password: str) -> str:
    """Build a mongosh JavaScript script to create a user.

    Args:
        username: MongoDB username (also used as database name)
        password: MongoDB user password

    Returns:
        JavaScript eval string for mongosh
    """
    safe_user = escape_js_string(username)
    safe_pass = escape_js_string(password)
    return (
        f"try {{ db.getSiblingDB('{safe_user}').createUser("
        f"{{user: '{safe_user}', pwd: '{safe_pass}', "
        f"roles: [{{role: 'readWrite', db: '{safe_user}'}}]}}) }} "
        f"catch(e) {{ if (e.code === {ALREADY_EXISTS_CODE})"
        f" {{ print('already exists'); }} else {{ throw e; }} }}"
    )


def _add_mongodb_user(username: str, password: str) -> tuple[bool, str]:
    """Add a MongoDB user with their own database.

    Args:
        username: MongoDB username (also used as database name)
        password: MongoDB user password

    Returns:
        Tuple of (success, error message if any)
    """
    config = Config()
    admin_user = config.get_value("MONGODB_ADMIN_USERNAME")
    admin_pass = config.get_value("MONGODB_ADMIN_PASSWORD")

    cmd = [
        "mongosh",
        "--tls",
        "--tlsAllowInvalidCertificates",
        "-u",
        admin_user,
        "-p",
        admin_pass,
        "--authenticationDatabase",
        "admin",
        "--eval",
        _build_create_user_script(username, password),
    ]
    success, output = execute_docker_command(
        "mongodb", cmd, DockerRunOptions(max_attempts=3)
    )
    if success:
        if "already exists" in output:
            print(f"User {username} already exists, skipped")
        return True, ""
    return False, f"Failed to add MongoDB user {username}: {output}"


def setup_mongodb_users() -> tuple[bool, str]:
    """Add users to MongoDB service.

    Returns:
        Tuple of (success, message)
    """
    return process_credentials_file(
        lambda creds_file: create_users_from_credentials(creds_file, _add_mongodb_user),
        "MongoDB",
        "MongoDB users created successfully",
    )


def permissions_mongodb() -> Tuple[bool, str]:
    """Creates combined.pem and sets permissions for MongoDB.

    Skips permission changes in CI environments (GITHUB_ACTIONS, GITLAB_CI, CI env vars).

    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        certs_dir = base_dir / "certs"
        privkey_path = certs_dir / "privkey.pem"
        fullchain_path = certs_dir / "fullchain.pem"
        combined_path = certs_dir / "combined.pem"
        mongo_uid = int(config.get_value("MONGO_UID"))
        mongo_gid = int(config.get_value("MONGO_GID"))

        certs_dir.mkdir(parents=True, exist_ok=True)

        # Create combined certificate
        success, msg = create_combined_cert(privkey_path, fullchain_path, combined_path)
        if not success:
            return False, msg

        # Set permissions on combined certificate
        ctx = CertPermissionContext(
            "MongoDB", combined_path, mongo_uid, mongo_gid, 0o600
        )
        success, perm_msg = set_service_cert_permissions(ctx)
        return success, perm_msg
    except OSError as e:
        return False, f"Error setting permissions for MongoDB: {e}"
