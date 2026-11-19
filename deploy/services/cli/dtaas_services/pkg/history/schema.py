"""Migrations of a group database: the shared tables device and reading.

Names and types follow the database page of the naming convention
(docs/developer/plans/naming/databases.md). A migration runs once: its name
is recorded in schema_migration in the same transaction as its statements.
"""

from dataclasses import dataclass
import psycopg
from psycopg import sql


@dataclass(frozen=True)
class Migration:
    """One named set of SQL statements that runs once per database."""

    name: str
    statements: str


TRACKING_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migration (
  name       text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)
"""

# device.space_id is left out until a migration creates the table space.
CORE_MIGRATIONS = (
    Migration(
        "core_0001_device_reading",
        """
CREATE TABLE device (
  device_id   text PRIMARY KEY,
  project     text NOT NULL,
  building    text NOT NULL,
  level       text NOT NULL,
  unit_id     text NOT NULL,
  area        text,
  device_type text NOT NULL,
  ifc_guid    text,
  brick_class text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_device_type_check CHECK (device_type IN ('S', 'A'))
);

CREATE TABLE reading (
  time      timestamptz NOT NULL,
  device_id text NOT NULL,
  quantity  text NOT NULL,
  value     double precision,
  unit      text NOT NULL,
  CONSTRAINT reading_device_id_fkey
    FOREIGN KEY (device_id) REFERENCES device (device_id)
);

CREATE INDEX reading_device_id_time_idx ON reading (device_id, time DESC);
""",
    ),
)


def _applied(conn: psycopg.Connection) -> set[str]:
    """Names of the migrations already applied to this database."""
    rows = conn.execute("SELECT name FROM schema_migration").fetchall()
    return {row[0] for row in rows}


def _run_script(conn: psycopg.Connection, migration: Migration, as_role: str) -> None:
    """Run one migration, as another role when one is given."""
    if as_role:
        conn.execute(sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(as_role)))
    # A migration is a fixed text of the package or of an installed kit,
    # never user input, so it runs as one script.
    conn.execute(sql.SQL(migration.statements))  # type: ignore[arg-type]
    if as_role:
        conn.execute("RESET ROLE")


def apply_migrations(
    conn: psycopg.Connection,
    migrations: tuple[Migration, ...] | list[Migration],
    as_role: str = "",
) -> list[str]:
    """Apply the migrations not yet recorded, in order, in the open transaction.

    Returns:
        Names of the migrations applied by this call
    """
    conn.execute(TRACKING_TABLE)
    done = _applied(conn)
    applied = []
    for migration in migrations:
        if migration.name in done:
            continue
        _run_script(conn, migration, as_role)
        conn.execute(
            "INSERT INTO schema_migration (name) VALUES (%s)", (migration.name,)
        )
        applied.append(migration.name)
    return applied
