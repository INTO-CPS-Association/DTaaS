"""Installed kits that bring their own tables to the group databases (K11).

A kit is installed by placing a folder under config/kits/<kit>/ with

- kit.json, which names the kit and declares its tables and the columns a
  twin file may fill, besides device_id:
  {"name": "soil", "tables": {"soil_sensor": ["depth_from", "depth_to"]}}
- migrations/<NNNN>_<what>.sql, run once per group database, in name order.

A kit table follows the naming convention and is keyed by device_id, so it
joins with device, reading and the tables of other kits. The kit never
changes the shared tables: see kit_hooks.py for how that is enforced.
"""

import json
import re
from dataclasses import dataclass
from pathlib import Path
from ..config import Config
from .names import validate_name
from .schema import Migration

KITS_DIR = Path("config") / "kits"
IDENTIFIER = re.compile(r"^[a-z][a-z0-9_]{0,62}$")
SHARED_TABLES = {"device", "reading", "schema_migration"}
MIGRATION_FILE = re.compile(r"^\d{4}_[a-z0-9_]+\.sql$")


class KitError(ValueError):
    """An installed kit does not follow the expected layout."""


@dataclass(frozen=True)
class Kit:
    """A validated kit: its tables and its migrations."""

    name: str
    tables: dict[str, tuple[str, ...]]
    migrations: tuple[Migration, ...]


def _check_identifier(kind: str, name: str) -> None:
    if not isinstance(name, str) or not IDENTIFIER.match(name):
        raise KitError(f"Invalid {kind} name {name!r}")


def _tables(raw: object) -> dict[str, tuple[str, ...]]:
    if not isinstance(raw, dict) or not raw:
        raise KitError("A kit declares at least one table")
    tables = {}
    for table, columns in raw.items():
        _check_identifier("table", table)
        if table in SHARED_TABLES:
            raise KitError(f"A kit may not declare the shared table {table}")
        if not isinstance(columns, list):
            raise KitError(f"The columns of {table} must be a list")
        for column in columns:
            _check_identifier("column", column)
        tables[table] = tuple(column for column in columns if column != "device_id")
    return tables


def _migrations(kit: str, folder: Path) -> tuple[Migration, ...]:
    files = sorted(folder.glob("*.sql")) if folder.is_dir() else []
    for path in files:
        if not MIGRATION_FILE.match(path.name):
            raise KitError(f"Migration {path.name} must be named NNNN_<what>.sql")
    return tuple(
        Migration(f"{kit}/{path.stem}", path.read_text(encoding="utf-8"))
        for path in files
    )


def load_kit(folder: Path) -> Kit:
    """Read and validate one kit folder."""
    try:
        manifest = json.loads((folder / "kit.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise KitError(f"Cannot read {folder / 'kit.json'}: {type(e).__name__}") from e
    name = manifest.get("name") if isinstance(manifest, dict) else None
    valid, error_msg = validate_name("kit", name or "")
    if not valid:
        raise KitError(error_msg)
    if folder.name != name:
        raise KitError(f"The folder of kit {name} must be named {name}")
    return Kit(name, _tables(manifest.get("tables")),
               _migrations(name, folder / "migrations"))  # fmt: skip


def load_kits() -> tuple[Kit, ...]:
    """Every kit installed under config/kits, in name order."""
    root = Config.get_base_dir() / KITS_DIR
    if not root.is_dir():
        return ()
    kits = tuple(load_kit(folder) for folder in sorted(root.iterdir())
                 if folder.is_dir())  # fmt: skip
    tables = [table for kit in kits for table in kit.tables]
    if len(set(tables)) != len(tables):
        raise KitError("Two kits declare the same table")
    return kits
