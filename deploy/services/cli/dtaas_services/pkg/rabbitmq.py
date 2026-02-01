"""RabbitMQ service and user management."""

import shutil
from typing import Tuple
from .utils import (
    process_credentials_file,
    create_users_from_credentials,
    execute_docker_command,
)
from .config import Config
from .cert import set_service_cert_permissions, CertPermissionContext


def _execute_rabbitmq_command(
    container: str, command: list, error_context: str
) -> tuple[bool, str]:
    """Execute a RabbitMQ docker command and return error if it fails.
    Args:
        container: Container name
        command: Command list to execute
        error_context: Error message context
    Returns:
        Tuple of (success, error message if any)
    """
    success, output = execute_docker_command(container, command)
    if not success:
        return False, f"{error_context}: {output}"
    return True, ""


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
    # Add user (ignore if already exists) - don't print output to avoid clutter
    success, output = execute_docker_command(
        "rabbitmq",
        ["rabbitmqctl", "add_user", username, password],
        verbose=False,
    )
    if not success:
        if "already exists" in output:
            print(f"User '{username}' already exists, skipping...")
        else:
            error_msg = f"Failed to add user {username}: {output}"
            print(error_msg)  # Print manually if it's a real error
            return False, error_msg

    # Add vhost (ignore if already exists)
    success, output = execute_docker_command(
        "rabbitmq",
        ["rabbitmqctl", "add_vhost", vhost],
        verbose=False,
    )
    if not success:
        if "already exists" in output:
            print(f"Vhost '{vhost}' already exists, skipping...")
        else:
            error_msg = f"Failed to add vhost {vhost}: {output}"
            print(error_msg)
            return False, error_msg

    # Set permissions on user's own vhost only
    success, output = execute_docker_command(
        "rabbitmq",
        ["rabbitmqctl", "set_permissions", "-p", vhost, username, ".*", ".*", ".*"],
        verbose=True,
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
