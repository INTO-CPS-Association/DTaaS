"""Hooks that run installed kits in a group database (K11).

- Setup: each kit gets the role <group>_kit_<kit>, which may only create
  tables in the schema public and reference device (device_id). Its
  migrations run under that role with SET LOCAL ROLE, on the administrator's
  connection. That keeps an honest migration from changing device or reading
  by mistake, but it is no boundary: a migration can run RESET ROLE and act
  as the administrator. A kit's migrations are therefore trusted code, to be
  read before the kit is installed. The declared tables are then checked
  and <group>_view_ro may select from them.
- Registration: the rows a twin file gives for a kit table replace the rows
  of the twin's devices in that table, in the transaction that writes the
  devices.
"""

import psycopg
from psycopg import sql
from .kits import Kit, KitError
from .names import view_account
from .schema import apply_migrations
from .twin import Twin

MAX_ROLE_BYTES = 63
COLUMNS_QUERY = (
    "SELECT column_name FROM information_schema.columns"
    " WHERE table_schema = 'public' AND table_name = %s"
)


def kit_role(group: str, kit: str) -> str:
    """The role that owns the tables of one kit in one group database."""
    role = f"{group}_kit_{kit}"
    if len(role.encode()) > MAX_ROLE_BYTES:
        raise KitError(f"The role {role} is longer than {MAX_ROLE_BYTES} bytes")
    return role


def _run(conn: psycopg.Connection, template: str, **names: str) -> None:
    idents = {key: sql.Identifier(value) for key, value in names.items()}
    conn.execute(sql.SQL(template).format(**idents))  # type: ignore[arg-type]


def prepare_kit_role(conn: psycopg.Connection, group: str, kit: Kit) -> str:
    """Create the kit's role with only the rights its migrations need."""
    role = kit_role(group, kit.name)
    exists = conn.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
    if not exists.fetchone():
        _run(conn, "CREATE ROLE {role} NOLOGIN", role=role)
    _run(conn, "GRANT USAGE, CREATE ON SCHEMA public TO {role}", role=role)
    _run(conn, "GRANT REFERENCES (device_id) ON device TO {role}", role=role)
    return role


def check_kit_tables(conn: psycopg.Connection, kit: Kit) -> None:
    """Check that every declared table exists with device_id and its columns."""
    for table, columns in kit.tables.items():
        found = {row[0] for row in conn.execute(COLUMNS_QUERY, (table,)).fetchall()}
        missing = {"device_id", *columns} - found
        if missing:
            raise KitError(f"Kit {kit.name}: {table} lacks {sorted(missing)}")


def apply_kits(
    conn: psycopg.Connection, group: str, kits: tuple[Kit, ...]
) -> list[str]:
    """Run the new migrations of every kit and grant reading its tables.

    Returns:
        Names of the migrations applied by this call
    """
    applied = []
    for kit in kits:
        role = prepare_kit_role(conn, group, kit)
        applied += apply_migrations(conn, kit.migrations, as_role=role)
        check_kit_tables(conn, kit)
        for table in kit.tables:
            _run(conn, "GRANT SELECT ON {table} TO {view}",
                 table=table, view=view_account(group))  # fmt: skip
    return applied


def _replace_rows(conn: psycopg.Connection, table: str, rows: list[dict],
                  device_ids: list[str]) -> None:  # fmt: skip
    conn.execute(
        sql.SQL("DELETE FROM {} WHERE device_id = ANY(%s)").format(
            sql.Identifier(table)
        ),
        (device_ids,),
    )
    for row in rows:
        columns = sql.SQL(", ").join(sql.Identifier(column) for column in row)
        values = sql.SQL(", ").join(sql.Placeholder() for _ in row)
        conn.execute(
            sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                sql.Identifier(table), columns, values
            ),
            tuple(row.values()),
        )


def _check_rows(kit: Kit, table: str, rows: list[dict]) -> None:
    if table not in kit.tables:
        raise KitError(f"Kit {kit.name} declares no table {table}")
    allowed = {"device_id", *kit.tables[table]}
    for row in rows:
        unknown = set(row) - allowed
        if unknown:
            raise KitError(f"{table} has no columns {sorted(unknown)} to fill")


def write_kit_rows(conn: psycopg.Connection, twin: Twin, kits: tuple[Kit, ...]) -> None:
    """Replace the kit rows of the twin's devices, as each kit's own role."""
    installed = {kit.name: kit for kit in kits}
    device_ids = [device.device_id for device in twin.devices]
    for kit_name, tables in twin.kit_rows.items():
        if kit_name not in installed:
            raise KitError(f"The kit {kit_name} is not installed")
        kit = installed[kit_name]
        _run(conn, "SET LOCAL ROLE {role}", role=kit_role(twin.group, kit_name))
        for table, rows in tables.items():
            _check_rows(kit, table, rows)
            _replace_rows(conn, table, rows, device_ids)
        conn.execute("RESET ROLE")
