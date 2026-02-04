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

ALREADY_EXISTS_MSG = "already exists"


def _execute_with_retry(
    container: str, cmd: list, error_context: str, max_attempts: int = 2
) -> tuple[bool, str]:
    """Execute a docker command with retries for timing issues.

    Args:
        container: Container name
        cmd: Command to execute
        error_context: Error message context
        max_attempts: Maximum number of attempts

    Returns:
        Tuple of (success, error message if any)
    """
    for attempt in range(max_attempts):
        success, output = execute_docker_command(container, cmd, verbose=False)
        if success or ALREADY_EXISTS_MSG in output:
            return True, ""
        if attempt < max_attempts - 1:
            time.sleep(4)

    return False, f"{error_context}: {output}"


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
    success, error_msg = _execute_with_retry(
        "rabbitmq",
        ["rabbitmqctl", "add_user", username, password],
        f"Failed to add user {username}",
    )
    if not success:
        return False, error_msg

    # Add vhost (ignore if already exists)
    success, error_msg = _execute_with_retry(
        "rabbitmq",
        ["rabbitmqctl", "add_vhost", vhost],
        f"Failed to add vhost {vhost}",
    )
    if not success:
        return False, error_msg

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
