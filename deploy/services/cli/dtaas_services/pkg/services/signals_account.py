"""MQTT account of the DTaaS signals gateway, dtaas_signals.

The gateway reads the topics of the projects it serves, to stream live
samples, and publishes only to the command topics of those projects, to send
data to a twin. Every request is checked against the person's own rights in
the gateway first, so this account is the outer limit.
"""

from ..secret_files import ensure_password
from .rabbitmq_accounts import (
    command_write_pattern,
    ensure_user,
    grant_mqtt_account,
    project_read_pattern,
    validate_projects,
)

SIGNALS_ACCOUNT = "dtaas_signals"
# The gateway's container mounts secrets/signals as /run/secrets
SIGNALS_CONSUMER = "signals"


def setup_signals_account(projects: list[str]) -> tuple[bool, str]:
    """Create or update dtaas_signals for exactly the given projects.

    The topic permissions are replaced, so a project left out of the list
    can no longer be read through the gateway. Returns (success, message).
    """
    valid, error_msg = validate_projects(projects)
    if not valid:
        return False, error_msg
    try:
        password = ensure_password(SIGNALS_CONSUMER, "rabbitmq", SIGNALS_ACCOUNT)
    except OSError as e:
        return False, f"Cannot write the secret file: {type(e).__name__}"
    success, error_msg = ensure_user(SIGNALS_ACCOUNT, password)
    if not success:
        return False, error_msg
    success, error_msg = grant_mqtt_account(
        SIGNALS_ACCOUNT,
        command_write_pattern(projects),
        project_read_pattern(projects),
    )
    served = ", ".join(sorted(projects))
    message = f"{SIGNALS_ACCOUNT} reads {served} and writes their cmd topics"
    return (True, message) if success else (False, error_msg)
