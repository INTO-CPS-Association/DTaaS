"""RabbitMQ program accounts that read and write MQTT topics in vhost '/'.

All MQTT traffic goes through the vhost '/' and the MQTT plugin publishes to
the exchange amq.topic, with '.' in the routing key for each '/' of the
topic. An account is limited twice: its queue permissions let it touch only
the session queues of its own client IDs and its topic permissions decide
which routing keys it may publish and subscribe to
(https://www.rabbitmq.com/docs/access-control#topic-authorisation).
"""

import json
import re
import subprocess
import time

RABBITMQ_CONTAINER = "rabbitmq"
MQTT_VHOST = "/"
TOPIC_EXCHANGE = "amq.topic"
# A topic level keeps the spelling of the site, but never holds '.', '/',
# '+', '#' or a leading '$', so it is safe inside a regular expression.
TOPIC_LEVEL = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
# A topic write pattern that matches no routing key at all
NOTHING = "^$"
TIMEOUT_SECONDS = 60


def validate_projects(projects: list[str]) -> tuple[bool, str]:
    """Check that every project is a valid first topic level.

    Returns:
        Tuple of (valid, error message if any)
    """
    if not projects:
        return False, "Give at least one project"
    for project in projects:
        if not TOPIC_LEVEL.match(project):
            return False, f"Invalid project name: {project!r}"
    return True, ""


def project_read_pattern(projects: list[str]) -> str:
    """Routing keys of every topic of the given projects."""
    return rf"^({'|'.join(sorted(projects))})\."


def command_write_pattern(projects: list[str]) -> str:
    """Routing keys of the command topics of the given projects only.

    A command topic is the eight-level device topic with cmd/<command> in
    place of the quantity: <project>/<six levels>/cmd/<command>.
    """
    return rf"^({'|'.join(sorted(projects))})(\.[^.]+){{6}}\.cmd\.[^.]+$"


def rabbitmqctl(args: list[str], stdin: str = "") -> tuple[bool, str]:
    """Run rabbitmqctl in the RabbitMQ container and return (success, output).

    A password goes through stdin, which rabbitmqctl reads when the password
    argument is left out, so it never shows in a process list or a history.
    """
    cmd = ["docker", "exec", "-i", RABBITMQ_CONTAINER, "rabbitmqctl", *args]
    try:
        result = subprocess.run(
            cmd,
            input=stdin,
            capture_output=True,
            text=True,
            check=False,
            timeout=TIMEOUT_SECONDS,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        return False, f"rabbitmqctl {args[0]} failed: {type(e).__name__}"
    if result.returncode == 0:
        return True, result.stdout
    lines = [line for line in result.stderr.splitlines() if line.strip()]
    detail = lines[-1] if lines else f"exit code {result.returncode}"
    return False, f"rabbitmqctl {args[0]} failed: {detail}"


def _user_exists(username: str) -> tuple[bool, bool, str]:
    """Return (success, exists, error message)."""
    success, output = rabbitmqctl(["list_users", "--quiet", "--no-table-headers"])
    if not success:
        return False, False, output
    names = {line.split("\t")[0] for line in output.splitlines()}
    return True, username in names, ""


def ensure_user(username: str, password: str) -> tuple[bool, str]:
    """Create the user, or set its password when it already exists.

    Returns:
        Tuple of (success, error message if any)
    """
    success, exists, error_msg = _user_exists(username)
    if not success:
        return False, error_msg
    verb = "change_password" if exists else "add_user"
    success, output = rabbitmqctl([verb, username], stdin=f"{password}\n")
    return (True, "") if success else (False, output)


def grant_mqtt_account(
    username: str, topic_write: str, topic_read: str
) -> tuple[bool, str]:
    """Give an account its queue and topic permissions in vhost '/'.

    The account may declare, bind and read only the session queues of the
    client IDs that start with its own name, mqtt-subscription-<client ID>
    qos0 and qos1, and may use amq.topic, where the MQTT plugin publishes.

    Returns:
        Tuple of (success, error message if any)
    """
    queues = f"mqtt-subscription-{username}_.*"
    resources = rf"^(amq\.topic|{queues})$"
    success, output = rabbitmqctl(
        ["set_permissions", "-p", MQTT_VHOST, username]
        + [f"^{queues}$", resources, resources]
    )
    if not success:
        return False, output
    success, output = rabbitmqctl(
        ["set_topic_permissions", "-p", MQTT_VHOST, username, TOPIC_EXCHANGE]
        + [topic_write, topic_read]
    )
    return (True, "") if success else (False, output)


def limit_session_queues(account: str, max_length: int) -> tuple[bool, str]:
    """Cap the MQTT session queues of an account and drop the oldest first.

    A stalled reader with a persistent QoS 1 session keeps its queue growing,
    and a full disk makes RabbitMQ block every publisher with a disk alarm
    (https://www.rabbitmq.com/docs/maxlength). The policy is named after the
    account, so each account has one and setting it again replaces it.

    Returns:
        Tuple of (success, error message if any)
    """
    definition = json.dumps({"max-length": max_length, "overflow": "drop-head"})
    success, output = rabbitmqctl(
        ["set_policy", "-p", MQTT_VHOST, "--apply-to", "queues"]
        + [f"{account}-sessions", f"^mqtt-subscription-{account}_.*$", definition]
    )
    return (True, "") if success else (False, output)


def _queue_consumers(queue: str) -> tuple[bool, int | None, str]:
    """Return (success, consumers or None when the queue is gone, error)."""
    success, output = rabbitmqctl(
        ["list_queues", "-p", MQTT_VHOST, "name", "consumers"]
        + ["--quiet", "--no-table-headers"]
    )
    if not success:
        return False, None, output
    for line in output.splitlines():
        name, _, consumers = line.partition("\t")
        if name == queue:
            return True, int(consumers or 0), ""
    return True, None, ""


def delete_session_queue(client_id: str, wait_seconds: int = 60) -> tuple[bool, str]:
    """Delete the QoS 1 session queue of an MQTT client once it is idle.

    This waits until the client has left the queue, since deleting a queue
    that a client still reads would only make it subscribe again.
    """
    queue = f"mqtt-subscription-{client_id}qos1"
    deadline = time.monotonic() + wait_seconds
    while True:
        success, consumers, error_msg = _queue_consumers(queue)
        if not success:
            return False, error_msg
        if consumers is None:
            return True, f"No session queue {queue}"
        if consumers == 0:
            break
        if time.monotonic() > deadline:
            return False, f"{queue} still has a consumer, run the command again"
        time.sleep(2)
    success, output = rabbitmqctl(
        ["delete_queue", "-p", MQTT_VHOST, queue, "--if-unused"]
    )
    return (True, f"Deleted {queue}") if success else (False, output)
