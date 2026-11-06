"""Set up the history of one group: broker account, database and data source."""

import psycopg
from ..secret_files import ensure_password
from ..services.rabbitmq_accounts import (
    NOTHING,
    ensure_user,
    grant_mqtt_account,
    project_read_pattern,
    validate_projects,
)
from .grafana import write_datasource
from .names import telegraf_account, validate_name
from .owners import OwnersError, merge_owners, read_owners, write_owners
from .pg_admin import connect, ensure_database
from .roles import ensure_roles, grant_history
from .schema import CORE_MIGRATIONS, apply_migrations


def setup_broker_account(group: str, projects: list[str]) -> tuple[bool, str]:
    """Make <group>_telegraf in RabbitMQ, reading only the group's projects.

    Returns:
        Tuple of (success, error message if any)
    """
    account = telegraf_account(group)
    password = ensure_password("telegraf", "rabbitmq", account)
    success, error_msg = ensure_user(account, password)
    if not success:
        return False, error_msg
    return grant_mqtt_account(account, NOTHING, project_read_pattern(projects))


def setup_database(group: str) -> list[str]:
    """Create the group database, its tables and its roles in one transaction.

    Returns:
        Names of the migrations applied by this call
    """
    ensure_database(group)
    with connect(group) as conn:
        ensure_roles(conn, group)
        applied = apply_migrations(conn, CORE_MIGRATIONS)
        grant_history(conn, group)
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
    except OwnersError as e:
        return False, str(e)
    except psycopg.Error as e:
        return False, f"PostgreSQL: {type(e).__name__}: {e}"
    except OSError as e:
        return False, f"Cannot write a file: {type(e).__name__}"
    return success, message
