"""RabbitMQ service and user management."""

import time
import shutil
from typing import Tuple
from .utils import (
    process_credentials_file,
    create_users_from_credentials,
    execute_docker_command,
)
from .config import Config
from .cert import set_service_cert_permissions, CertPermissionContext


def _add_rabbitmq_user(username: str, password: str) -> tuple[bool, str]:
    """
    Add a user to RabbitMQ with vhost and permissions.
    Args:
        username: RabbitMQ username
        password: RabbitMQ password
    Returns:
        Tuple of (success, error message if any)
    """
    vhost = username

    # Add user (with retries for timing issues)
    for attempt in range(2):
        success, output = execute_docker_command(
            "rabbitmq",
            ["rabbitmqctl", "add_user", username, password],
            verbose=False,
        )
        if success or "already exists" in output:
            break
        if attempt < 2:
            time.sleep(1)
    else:
        if not success and "already exists" not in output:
            return False, f"Failed to add user {username}: {output}"

    # Add vhost (ignore if already exists)
    for attempt in range(2):
        success, output = execute_docker_command(
            "rabbitmq",
            ["rabbitmqctl", "add_vhost", vhost],
            verbose=False,
        )
        if success or "already exists" in output:
            break
        if attempt < 2:
            time.sleep(1)
    else:
        if not success and "already exists" not in output:
            return False, f"Failed to add vhost {vhost}: {output}"

    # Set permissions on user's own vhost only
    success, output = execute_docker_command(
        "rabbitmq",
        ["rabbitmqctl", "set_permissions", "-p", vhost, username, ".*", ".*", ".*"],
        verbose=False,
    )
    if not success:
        return False, f"Failed to set permissions on vhost {vhost}: {output}"
    return True, ""


def setup_rabbitmq_users() -> tuple[bool, str]:
    """
    Add users to RabbitMQ service.

    Returns:
        Tuple of (success, message)
    """
    return process_credentials_file(
        lambda creds_file: create_users_from_credentials(
            creds_file, _add_rabbitmq_user
        ),
        "RabbitMQ",
        "RabbitMQ users created successfully",
    )


def permissions_rabbitmq() -> Tuple[bool, str]:
    """Copy privkey.pem -> privkey-rabbitmq.pem and sets owner.

    Skips permission changes in CI environments (GITHUB_ACTIONS, GITLAB_CI, CI env vars).

    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        host_name = config.get_value("HOSTNAME")
        certs_dir = base_dir / "certs" / host_name
        privkey_path = certs_dir / "privkey.pem"
        rabbit_key_path = certs_dir / "privkey-rabbitmq.pem"
        rabbit_uid = int(config.get_value("RABBIT_UID"))

        # Verify source file exists before attempting copy
        if not privkey_path.exists():
            return False, f"Source certificate not found: {privkey_path}"

        shutil.copy2(privkey_path, rabbit_key_path)

        # Set permissions on RabbitMQ private key (no group)
        ctx = CertPermissionContext(
            "RabbitMQ", rabbit_key_path, rabbit_uid, None, 0o600
        )
        return set_service_cert_permissions(ctx)
    except OSError as e:
        return False, f"Error setting permissions for RabbitMQ: {e}"
