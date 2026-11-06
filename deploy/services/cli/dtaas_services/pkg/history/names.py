"""Names of groups, twins and the accounts made for them.

The pattern and the reserved names come from the naming convention of DTaaS
(docs/developer/plans/naming/index.md).
"""

import re

NAME = re.compile(r"^[a-z][a-z0-9_]{2,31}$")
RESERVED = {
    "dtaas", "dtaas_admin", "admin", "root", "postgres", "thingsboard",
    "guest", "grafana", "influxdb", "mongodb", "rabbitmq", "gitlab",
    "keycloak", "public",
}  # fmt: skip
SIGNALS_RO = "dtaas_signals_ro"


def validate_name(kind: str, name: str) -> tuple[bool, str]:
    """Check a group or twin name against the naming convention.

    Returns:
        Tuple of (valid, error message if any)
    """
    if not NAME.match(name or ""):
        return False, f"Invalid {kind} name {name!r}: use ^[a-z][a-z0-9_]{{2,31}}$"
    if name in RESERVED:
        return False, f"The {kind} name {name!r} is reserved"
    return True, ""


def telegraf_account(group: str) -> str:
    """The account that Telegraf uses for one group, in RabbitMQ and PostgreSQL."""
    return f"{group}_telegraf"


def view_account(group: str) -> str:
    """The read-only PostgreSQL account of the Grafana data source of a group."""
    return f"{group}_view_ro"


def telegraf_client_id(group: str, twin: str) -> str:
    """The MQTT client ID of the Telegraf input of one twin."""
    return f"{group}_telegraf_{twin}"
