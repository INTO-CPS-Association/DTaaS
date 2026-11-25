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


def _ensure_signals_user() -> tuple[bool, str]:
    """Create dtaas_signals, or set its password, from its secret file."""
    try:
        password = ensure_password(SIGNALS_CONSUMER, "rabbitmq", SIGNALS_ACCOUNT)
    except OSError as e:
        return False, f"Cannot write the secret file: {type(e).__name__}"
    return ensure_user(SIGNALS_ACCOUNT, password)


def setup_signals_account(projects: list[str]) -> tuple[bool, str]:
    """Create or update dtaas_signals for exactly the given projects.

    The topic permissions are replaced, so a project left out of the list
    can no longer be read through the gateway. Returns (success, message).
    """
    success, error_msg = validate_projects(projects)
    # Each step runs only when the one before it succeeded.
    if success:
        success, error_msg = _ensure_signals_user()
    if success:
        success, error_msg = grant_mqtt_account(
            SIGNALS_ACCOUNT,
            command_write_pattern(projects),
            project_read_pattern(projects),
        )
    if not success:
        return False, error_msg
    served = ", ".join(sorted(projects))
    return True, f"{SIGNALS_ACCOUNT} reads {served} and writes their cmd topics"
