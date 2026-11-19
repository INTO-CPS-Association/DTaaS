"""Register and remove twins.

PostgreSQL refuses a reading of an unknown device and Telegraf then drops the
whole batch, so registration writes the device rows before the Telegraf file
that lets the twin's readings in. The file is checked before anything is
written, so a twin whose file would stop Telegraf leaves no trace.
"""

from pathlib import Path
import psycopg
from psycopg import sql
from ..secret_files import secret_path
from ..services.rabbitmq_accounts import delete_session_queue
from .names import telegraf_account, telegraf_client_id, validate_name
from .pg_admin import connect
from .telegraf_config import check, install, reload_telegraf, render, twin_file
from .twin import Device, Twin, TwinFileError, load_twin

UPSERT_DEVICE = """
INSERT INTO device (device_id, project, building, level, unit_id, area,
                    device_type, ifc_guid, brick_class)
VALUES (%(device_id)s, %(project)s, %(building)s, %(level)s, %(unit_id)s,
        %(area)s, %(device_type)s, %(ifc_guid)s, %(brick_class)s)
ON CONFLICT (device_id) DO UPDATE SET
  project = EXCLUDED.project, building = EXCLUDED.building,
  level = EXCLUDED.level, unit_id = EXCLUDED.unit_id, area = EXCLUDED.area,
  device_type = EXCLUDED.device_type, ifc_guid = EXCLUDED.ifc_guid,
  brick_class = EXCLUDED.brick_class
"""


def _missing_secrets(group: str) -> list[str]:
    account = telegraf_account(group)
    paths = [secret_path("telegraf", service, account)
             for service in ("rabbitmq", "postgresql")]  # fmt: skip
    return [path.name for path in paths if not path.exists()]


def write_devices(conn: psycopg.Connection, devices: tuple[Device, ...]) -> None:
    """Insert or update the device rows of a twin in the open transaction."""
    with conn.cursor() as cursor:
        cursor.executemany(sql.SQL(UPSERT_DEVICE), [d.row() for d in devices])


def _store(twin: Twin, text: str) -> Path:
    """Write the device rows, then move the checked file into place."""
    with connect(twin.group) as conn:
        write_devices(conn, twin.devices)
    destination = twin_file(twin.group, twin.name)
    install(text, destination)
    return destination


def register_twin(path: Path) -> tuple[bool, str]:
    """Register the twin described by a twin file.

    Returns:
        Tuple of (success, message)
    """
    try:
        twin = load_twin(path)
    except TwinFileError as e:
        return False, str(e)
    missing = _missing_secrets(twin.group)
    if missing:
        return False, f"Missing {', '.join(missing)}: run user add-history first"
    text = render(twin)
    passed, error_msg = check(text, twin.group)
    if not passed:
        return False, error_msg
    try:
        destination = _store(twin, text)
    except psycopg.Error as e:
        return False, f"PostgreSQL: {type(e).__name__}: {e}"
    except OSError as e:
        return False, f"Cannot write the Telegraf file: {type(e).__name__}"
    count = len(twin.devices)
    return True, f"Registered {count} device(s) of {twin.name}, file {destination}"


def remove_twin(group: str, twin: str) -> tuple[bool, str]:
    """Remove a twin's Telegraf file and then its MQTT session queue.

    The device rows and the readings stay, since all history is kept.

    Returns:
        Tuple of (success, message)
    """
    for kind, name in (("group", group), ("twin", twin)):
        valid, error_msg = validate_name(kind, name)
        if not valid:
            return False, error_msg
    try:
        twin_file(group, twin).unlink(missing_ok=True)
    except OSError as e:
        return False, f"Cannot delete the Telegraf file: {type(e).__name__}"
    # The reload makes Telegraf leave the session queue so it can be deleted
    reload_telegraf()
    return delete_session_queue(telegraf_client_id(group, twin))
