"""RabbitMQ user management for DTaaS services"""
import csv
import shutil
import platform
from typing import Tuple
from .utils import get_credentials_path, execute_docker_command
from .config import Config


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

    # Add user
    success, output = execute_docker_command(
        "rabbitmq",
        ["rabbitmqctl", "add_user", username, password]
    )
    if not success:
        return False, f"Failed to add user {username}: {output}"

    # Add vhost
    success, output = execute_docker_command(
        "rabbitmq",
        ["rabbitmqctl", "add_vhost", vhost]
    )
    if not success:
        return False, f"Failed to add vhost {vhost}: {output}"

    # Set permissions on user's own vhost only
    success, output = execute_docker_command(
        "rabbitmq",
        ["rabbitmqctl", "set_permissions", "-p", vhost, username, ".*", ".*", ".*"]
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
    credentials_file = get_credentials_path()
    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        with credentials_file.open(
            mode="r", newline="", encoding="utf-8"
        ) as creds_file:
            credentials = csv.DictReader(creds_file, delimiter=",")

            for credential in credentials:
                username = credential["username"]
                password = credential["password"]
                success, error_msg = _add_rabbitmq_user(username, password)
                if not success:
                    return False, error_msg

        return True, "RabbitMQ users created successfully"

    except (OSError, KeyError) as e:
        return False, f"Error adding RabbitMQ users: {e}"


def permissions_rabbitmq() -> Tuple[bool, str]:
    """Copy privkey.pem -> privkey-rabbitmq.pem and sets owner.
    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        os_type = platform.system().lower()
        host_name = config.get_value("HOSTNAME")
        certs_dir = base_dir / "certs" / host_name
        privkey_path = certs_dir / "privkey.pem"
        rabbit_key_path = certs_dir / "privkey-rabbitmq.pem"
        rabbit_uid = int(config.get_value("RABBIT_UID"))
        shutil.copy2(privkey_path, rabbit_key_path)
        if os_type in ("linux", "darwin"):
            shutil.chown(rabbit_key_path, user=rabbit_uid)
        msg = (
            f"{rabbit_key_path} created and ownership set to user "
            f"{rabbit_uid}."
        )
        return True, msg
    except OSError as e:
        return False, f"Error setting permissions for RabbitMQ: {e}"
