"""Read-only RabbitMQ service user of the DTaaS signals gateway.

The gateway reads every user vhost with one service user. The permissions
follow servers/signals/DEVELOPER.md: the user declares, binds and reads only
its own queues, named dtaas-signals.<uuid>, reads amq.topic, where the MQTT
plugin publishes, and may publish under no routing key.
"""

import subprocess
from ..config import Config
from ..docker_utils import execute_docker_command, DockerRunOptions

SIGNALS_USER_KEY = "SIGNALS_RABBITMQ_USER"
CONTAINER = "rabbitmq"
OWN_QUEUES = r"^dtaas-signals\..*"
READABLE = r"^(amq\.topic|dtaas-signals\..*)$"
TOPIC_EXCHANGE = "amq.topic"
# A topic write pattern of '^$' matches no routing key, so a leaked gateway
# password cannot forge signals. Reads may bind any topic, because the
# gateway decides for each user which topics it serves.
TOPIC_WRITE = "^$"
TOPIC_READ = ".*"
ALREADY_EXISTS_MSG = "already exists"


def get_signals_user() -> str:
    """Return the service user named in services.env, or "" when it is unset."""
    return Config().env.get(SIGNALS_USER_KEY, "").strip()


def _rabbitmqctl(args: list[str], error_context: str) -> tuple[bool, str]:
    """Run one rabbitmqctl command in the RabbitMQ container.

    Returns:
        Tuple of (success, command output or error message)
    """
    success, output = execute_docker_command(
        CONTAINER, ["rabbitmqctl", *args], DockerRunOptions(verbose=False)
    )
    if not success:
        return False, f"{error_context}: {output}"
    return True, output


def grant_signals_user(username: str, vhost: str) -> tuple[bool, str]:
    """Give the service user the read-only permissions of the gateway on a vhost.

    Returns:
        Tuple of (success, error message if any)
    """
    context = f"Failed to grant {username} on vhost {vhost}"
    success, output = _rabbitmqctl(
        ["set_permissions", "-p", vhost, username, OWN_QUEUES, OWN_QUEUES, READABLE],
        context,
    )
    if not success:
        return False, output
    success, output = _rabbitmqctl(
        ["set_topic_permissions", "-p", vhost, username, TOPIC_EXCHANGE]
        + [TOPIC_WRITE, TOPIC_READ],
        context,
    )
    return (True, "") if success else (False, output)


def grant_signals_on_new_vhost(vhost: str) -> tuple[bool, str]:
    """Grant the configured service user on a new user vhost, when one is set.

    Returns:
        Tuple of (success, error message if any)
    """
    username = get_signals_user()
    if not username:
        return True, ""
    return grant_signals_user(username, vhost)


def _add_user(username: str, password: str) -> tuple[bool, str]:
    """Create the service user, or keep it when it already exists.

    rabbitmqctl reads the password from stdin when the argument is left out,
    so the password never shows in the process list or in a shell history.

    Returns:
        Tuple of (success, error message if any)
    """
    cmd = ["docker", "exec", "-i", CONTAINER, "rabbitmqctl", "add_user", username]
    try:
        result = subprocess.run(
            cmd, input=f"{password}\n", capture_output=True, text=True,
            check=False, timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        return False, f"Failed to add user {username}: {e}"
    output = f"{result.stdout}\n{result.stderr}"
    if result.returncode == 0 or ALREADY_EXISTS_MSG in output:
        return True, ""
    first_line = result.stderr.strip().split("\n")[0]
    return False, f"Failed to add user {username}: {first_line}"


def list_vhosts() -> tuple[bool, list[str], str]:
    """List the names of every vhost of the broker.

    Returns:
        Tuple of (success, vhost names, error message if any)
    """
    success, output = _rabbitmqctl(
        ["list_vhosts", "--quiet", "--no-table-headers"], "Failed to list vhosts"
    )
    if not success:
        return False, [], output
    names = [line.strip() for line in output.splitlines() if line.strip()]
    return True, names, ""


def setup_signals_user(password: str) -> tuple[bool, str]:
    """Create the service user of services.env and grant it on every vhost.

    An existing user keeps its password.

    Returns:
        Tuple of (success, message)
    """
    username = get_signals_user()
    if not username:
        return False, f"Set {SIGNALS_USER_KEY} in config/services.env first"
    success, error_msg = _add_user(username, password)
    if not success:
        return False, error_msg
    success, vhosts, error_msg = list_vhosts()
    if not success:
        return False, error_msg
    for vhost in vhosts:
        success, error_msg = grant_signals_user(username, vhost)
        if not success:
            return False, error_msg
    return True, f"{username} can read {len(vhosts)} vhost(s)"
