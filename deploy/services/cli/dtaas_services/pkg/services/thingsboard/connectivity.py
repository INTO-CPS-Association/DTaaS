"""ThingsBoard device connectivity: the ports the "Check connectivity" page names."""

# pylint: disable=W1203
import logging
import os
from typing import Tuple
import httpx

logger = logging.getLogger(__name__)

SETTINGS_PATH = "/api/admin/settings/connectivity"
SAVE_PATH = "/api/admin/settings"


def _published_ports() -> dict[str, str]:
    """The published HTTPS and MQTT-over-TLS ports, from config/services.env."""
    return {
        "https": os.getenv("THINGSBOARD_PORT", "").strip(),
        "mqtts": os.getenv("THINGSBOARD_MQTT_SSL_PORT", "").strip(),
    }


def _with_published_ports(value: dict, ports: dict[str, str]) -> dict:
    """Offer only HTTPS and MQTT over TLS, each on its published port."""
    for name in ("http", "mqtt"):
        value.setdefault(name, {})["enabled"] = False
    for name, port in ports.items():
        value.setdefault(name, {}).update(enabled=True, port=port)
    return value


def apply_device_connectivity(base_url: str, session: httpx.Client) -> Tuple[bool, str]:
    """Store the published ports in the connectivity settings of ThingsBoard.

    ThingsBoard copies the DEVICE_CONNECTIVITY_* variables into its database
    only when it is installed, so an installation that already exists keeps
    its old ports until they are written here. The session must be
    authenticated as sysadmin.

    Returns:
        Tuple of (success, message)
    """
    ports = _published_ports()
    if not all(ports.values()):
        return False, (
            "THINGSBOARD_PORT and THINGSBOARD_MQTT_SSL_PORT must be set in "
            "config/services.env."
        )
    response = session.get(f"{base_url}{SETTINGS_PATH}")
    response.raise_for_status()
    settings = response.json()
    settings["jsonValue"] = _with_published_ports(settings.get("jsonValue") or {}, ports)
    session.post(f"{base_url}{SAVE_PATH}", json=settings).raise_for_status()
    return True, (
        f"Devices are pointed to HTTPS on {ports['https']} and MQTT over TLS "
        f"on {ports['mqtts']}."
    )
