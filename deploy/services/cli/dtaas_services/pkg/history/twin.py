"""The twin file that registration reads.

A twin belongs to one group and owns one topic prefix. Each device gives its
topic without the quantity, seven levels, which must start with the prefix:

{
  "group": "swim",
  "twin": "room_0224",
  "topic_prefix": "SWiM/CTO/room/0224",
  "devices": [
    {"topic": "SWiM/CTO/room/0224/seat48A/S/S-SWiM-CTO-room-0224-seat48A-TRH-0001",
     "ifc_guid": "2O2Fr$t4X7Zf8NOew3FLOH", "brick_class": "Air_Temperature_Sensor"}
  ]
}
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from ..services.rabbitmq_accounts import TOPIC_LEVEL
from .names import validate_name

DEVICE_LEVELS = 7
DEVICE_TYPES = ("S", "A")
KNOWN_KEYS = {"group", "twin", "topic_prefix", "devices", "kits"}
SCALARS = (str, int, float, bool, type(None))
LEVEL_NAMES = ("project", "building", "level", "unit_id", "area", "device_type")


class TwinFileError(ValueError):
    """The twin file does not follow the expected shape."""


@dataclass(frozen=True)
class Device:
    """One row of the table device."""

    levels: tuple[str, ...]
    ifc_guid: str | None = None
    brick_class: str | None = None

    @property
    def device_id(self) -> str:
        """Topic level 7, the key across stores."""
        return self.levels[6]

    def row(self) -> dict[str, str | None]:
        """The columns of the device table for this device."""
        named = dict(zip(LEVEL_NAMES, self.levels))
        return {"device_id": self.device_id, **named,
                "ifc_guid": self.ifc_guid, "brick_class": self.brick_class}  # fmt: skip


@dataclass(frozen=True)
class Twin:
    """A validated twin file."""

    group: str
    name: str
    prefix: tuple[str, ...]
    devices: tuple[Device, ...]
    # {kit: {table: [row, ...]}}, filled by kit registration hooks
    kit_rows: dict = field(default_factory=dict)


def _levels(topic: str) -> tuple[str, ...]:
    levels = tuple(str(topic).split("/"))
    for level in levels:
        if not TOPIC_LEVEL.match(level):
            raise TwinFileError(f"Invalid topic level {level!r} in {topic!r}")
    return levels


def _optional_text(entry: dict, key: str) -> str | None:
    value = entry.get(key)
    if value is not None and not isinstance(value, str):
        raise TwinFileError(f"{key} must be text")
    return value


def _device(entry: dict, prefix: tuple[str, ...]) -> Device:
    if not isinstance(entry, dict):
        raise TwinFileError("Each device must be a JSON object")
    levels = _levels(entry.get("topic", ""))
    if len(levels) != DEVICE_LEVELS or levels[: len(prefix)] != prefix:
        raise TwinFileError(
            f"Device topic {entry.get('topic')!r} must have seven levels "
            "and start with the topic prefix"
        )
    if levels[5] not in DEVICE_TYPES:
        raise TwinFileError(f"Device type must be S or A in {entry['topic']!r}")
    return Device(
        levels, _optional_text(entry, "ifc_guid"), _optional_text(entry, "brick_class")
    )


def _check_names(data: dict) -> None:
    for kind, key in (("group", "group"), ("twin", "twin")):
        valid, error_msg = validate_name(kind, data.get(key, ""))
        if not valid:
            raise TwinFileError(error_msg)


def _kit_row(row: object, device_ids: set[str]) -> dict:
    if not isinstance(row, dict) or row.get("device_id") not in device_ids:
        raise TwinFileError("Each kit row needs the device_id of a twin device")
    if not all(isinstance(value, SCALARS) for value in row.values()):
        raise TwinFileError("Kit row values must be text, numbers or null")
    return row


def _table_rows(where: str, rows: object, device_ids: set[str]) -> list[dict]:
    if not isinstance(rows, list):
        raise TwinFileError(f"kits.{where} must be a list of rows")
    return [_kit_row(row, device_ids) for row in rows]


def _kit_rows(raw: object, device_ids: set[str]) -> dict:
    """Validate {kit: {table: [row, ...]}}, the rows the kit hooks write."""
    if not isinstance(raw, dict):
        raise TwinFileError("kits must map each kit to its tables")
    kit_rows = {}
    for kit, tables in raw.items():
        if not isinstance(tables, dict):
            raise TwinFileError(f"kits.{kit} must map each table to its rows")
        kit_rows[kit] = {
            table: _table_rows(f"{kit}.{table}", rows, device_ids)
            for table, rows in tables.items()
        }
    return kit_rows


def parse_twin(data: dict) -> Twin:
    """Validate the content of a twin file."""
    unknown = set(data) - KNOWN_KEYS
    if unknown:
        raise TwinFileError(f"Unknown keys in the twin file: {sorted(unknown)}")
    _check_names(data)
    prefix = _levels(data.get("topic_prefix", ""))
    if len(prefix) >= DEVICE_LEVELS:
        raise TwinFileError("The topic prefix must have fewer than seven levels")
    entries = data.get("devices") or []
    if not isinstance(entries, list) or not entries:
        raise TwinFileError("A twin needs at least one device")
    devices = tuple(_device(entry, prefix) for entry in entries)
    ids = [device.device_id for device in devices]
    if len(set(ids)) != len(ids):
        raise TwinFileError("A device_id appears twice")
    kit_rows = _kit_rows(data.get("kits", {}), {d.device_id for d in devices})
    return Twin(data["group"], data["twin"], prefix, devices, kit_rows)


def load_twin(path: Path) -> Twin:
    """Read and validate a twin file."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise TwinFileError(f"Cannot read {path}: {type(e).__name__}") from e
    if not isinstance(data, dict):
        raise TwinFileError("The twin file must hold one JSON object")
    return parse_twin(data)
