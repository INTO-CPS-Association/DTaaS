"""PostgreSQL roles of the history of one group.

- <group>_telegraf may only insert into reading. Telegraf writes with COPY,
  which needs no more than INSERT.
- <group>_view_ro, for the Grafana data source, and dtaas_signals_ro, for the
  signals gateway, may only select from device and reading.
- No other role may connect to the group database.
"""

import psycopg
from psycopg import sql
from ..secret_files import ensure_password
from .names import SIGNALS_RO, telegraf_account, view_account
from .pg_admin import ensure_login_role

# Each account's secret goes to the folder of the container that uses it.
CONSUMERS = {"telegraf": "telegraf", "view": "grafana", "signals": "signals"}


def history_roles(group: str) -> dict[str, str]:
    """The role name for each purpose of a group's history."""
    return {
        "telegraf": telegraf_account(group),
        "view": view_account(group),
        "signals": SIGNALS_RO,
    }


def ensure_roles(conn: psycopg.Connection, group: str) -> None:
    """Create the login roles of a group with the passwords of their files."""
    for purpose, role in history_roles(group).items():
        password = ensure_password(CONSUMERS[purpose], "postgresql", role)
        ensure_login_role(conn, role, password)


def _execute(conn: psycopg.Connection, template: str, **names) -> None:
    """Run one statement with every name passed as an identifier."""
    idents = {key: sql.Identifier(value) for key, value in names.items()}
    conn.execute(sql.SQL(template).format(**idents))  # type: ignore[arg-type]


def grant_history(conn: psycopg.Connection, group: str) -> None:
    """Give the roles of a group exactly their rights in its database."""
    roles = history_roles(group)
    names = {"db": group, **roles}
    _execute(conn, "REVOKE ALL ON DATABASE {db} FROM PUBLIC", **names)
    _execute(conn, "REVOKE ALL ON SCHEMA public FROM PUBLIC", **names)
    everyone = "{telegraf}, {view}, {signals}"
    _execute(conn, "GRANT CONNECT ON DATABASE {db} TO " + everyone, **names)
    _execute(conn, "GRANT USAGE ON SCHEMA public TO " + everyone, **names)
    _execute(conn, "GRANT INSERT ON reading TO {telegraf}", **names)
    _execute(conn, "GRANT SELECT ON device, reading TO {view}, {signals}", **names)
