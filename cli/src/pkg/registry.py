"""The CLI-owned user registry, dtaas.users.registry.json.

A store of the *additional* users provisioned by 'dtaas admin user add' /
'delete', mutated directly and atomically by the CLI and never hand-edited,
the way useradd owns /etc/passwd. Starting users live in dtaas.toml instead;
deployment settings (server, path, resources, TLS) also come from dtaas.toml.

Shape:
    {"users": {"alice": {"email": ..., "groups": [...], "load_balance": bool}}}
"""

import csv
import json
import os
from pathlib import Path

REGISTRY_FILE = "dtaas.users.registry.json"


def load_registry(path=REGISTRY_FILE):
    """Return the registry's user store ({name: details}); empty when absent."""
    file = Path(path)
    if not file.is_file():
        return {}
    data = json.loads(file.read_text(encoding="utf-8"))
    users = data.get("users") if isinstance(data, dict) else None
    return users if isinstance(users, dict) else {}


def _write_registry(users, path):
    """Atomically persist the user store to *path* (temp file + os.replace)."""
    text = json.dumps({"users": users}, indent=2) + "\n"
    tmp = f"{path}.tmp"
    Path(tmp).write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def add_to_registry(new_users, path=REGISTRY_FILE):
    """Merge *new_users* ({name: details}) into the store and persist it."""
    users = load_registry(path)
    users.update(new_users)
    _write_registry(users, path)
    return users


def remove_from_registry(usernames, path=REGISTRY_FILE):
    """Drop *usernames* from the store and persist it; returns the removed names."""
    users = load_registry(path)
    removed = [name for name in usernames if users.pop(name, None) is not None]
    _write_registry(users, path)
    return removed


def _parse_csv_row(row):
    """Convert one users.csv row into (username, details).

    'groups' is a ';'-separated cell and 'load_balance' is a true/false string.
    """
    groups = [g for g in row.get("groups", "").split(";") if g]
    details = {
        "email": row.get("email", "").strip(),
        "groups": groups,
        "load_balance": row.get("load_balance", "").strip().lower() == "true",
    }
    return row["username"].strip(), details


def read_csv_users(csv_path):
    """Return {username: details} parsed from a users CSV file."""
    with open(csv_path, newline="", encoding="utf-8") as handle:
        return dict(_parse_csv_row(row) for row in csv.DictReader(handle))
