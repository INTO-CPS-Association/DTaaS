"""Set up the history of one group: broker account, database and data source."""

from ..config import Config
from ..secret_files import ensure_password
from ..services.rabbitmq_accounts import (
    NOTHING,
    ensure_user,
    grant_mqtt_account,
    limit_session_queues,
    project_read_pattern,
    validate_projects,
)
from .errors import HANDLED, describe
from .grafana import write_datasource
from .kit_hooks import apply_kits
from .kits import load_kits
from .names import telegraf_account, validate_name
from .owners import merge_owners, read_owners, write_owners
from .pg_admin import connect, ensure_database
from .roles import ensure_roles, grant_history
from .schema import CORE_MIGRATIONS, apply_migrations


# Readings one Telegraf session queue keeps while Telegraf is not reading.
# At one reading a second per device that is about a day for one device.
DEFAULT_QUEUE_MAX_LENGTH = 100_000


def queue_max_length(config: Config) -> int:
    """The session queue limit of TELEGRAF_QUEUE_MAX_LENGTH, or the default."""
    value = config.env.get("TELEGRAF_QUEUE_MAX_LENGTH") or str(DEFAULT_QUEUE_MAX_LENGTH)
    if not value.isdigit() or int(value) < 1:
        raise ValueError("TELEGRAF_QUEUE_MAX_LENGTH must be a whole number above 0")
    return int(value)


def setup_broker_account(group: str, projects: list[str]) -> tuple[bool, str]:
    """Make <group>_telegraf in RabbitMQ, reading only the group's projects.

    Its session queues get a length limit, so a stalled Telegraf cannot fill
    the broker's disk.

    Returns:
        Tuple of (success, error message if any)
    """
    try:
        max_length = queue_max_length(Config())
    except ValueError as e:
        return False, str(e)
    account = telegraf_account(group)
    password = ensure_password("telegraf", "rabbitmq", account)
    success, error_msg = ensure_user(account, password)
    if not success:
        return False, error_msg
    success, error_msg = grant_mqtt_account(
        account, NOTHING, project_read_pattern(projects)
    )
    if not success:
        return False, error_msg
    return limit_session_queues(account, max_length)


def setup_database(group: str) -> list[str]:
    """Create the group database, its tables and its roles in one transaction.

    The migrations of the installed kits run in the same transaction, so a
    kit whose migration fails leaves the database as it was.

    Returns:
        Names of the migrations applied by this call
    """
    kits = load_kits()
    ensure_database(group)
    with connect(group) as conn:
        ensure_roles(conn, group)
        applied = apply_migrations(conn, CORE_MIGRATIONS)
        grant_history(conn, group)
        applied += apply_kits(conn, group, kits)
    return applied


def _validate(group: str, projects: list[str]) -> tuple[bool, str]:
    valid, error_msg = validate_name("group", group)
    if not valid:
        return False, error_msg
    return validate_projects(projects)


def _setup_services(group: str, projects: list[str]) -> tuple[bool, str]:
    """Broker account, database and data source. Returns (success, message)."""
    success, error_msg = setup_broker_account(group, projects)
    if not success:
        return False, error_msg
    applied = setup_database(group)
    path = write_datasource(group)
    migrations = ", ".join(applied) or "none new"
    return True, f"Group {group} ready. Migrations: {migrations}. Data source: {path}"


def setup_group_history(
    group: str, projects: list[str], owners: tuple[str, ...] = ()
) -> tuple[bool, str]:
    """Set up everything a group needs before its twins are registered.

    The owners file is checked before any service is touched and written
    last, so an owner mapped to another group changes nothing.
    """
    valid, error_msg = _validate(group, projects)
    if not valid:
        return False, error_msg
    try:
        merged = merge_owners(read_owners(), group, list(owners), projects)
        success, message = _setup_services(group, projects)
        if success and owners:
            write_owners(merged)
    except HANDLED as e:
        return False, describe(e)
    return success, message
