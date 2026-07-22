"""The CLI-owned user registry, dtaas.users.registry.json.

A store of the *additional* users provisioned by 'dtaas user add' /
'delete', mutated directly and atomically by the CLI and never hand-edited,
the way useradd owns /etc/passwd. Starting users live in dtaas.toml instead;
deployment settings (server, path, resources, TLS) also come from dtaas.toml.

Shape:
    {"users": {"alice": {"email": ..., "groups": [...], "load_balance": bool,
                          "desired_status": "running"}}}

'desired_status' ('running'/'paused'/'stopped', default 'running' when absent
for registries written before this field existed) records the outcome of the
last 'dtaas user pause'/'stop'/'resume' for that user; see
set_desired_status(). It is intentionally separate from the email/groups/
load_balance fields 'user add' writes: those describe the user, this
describes whether the CLI should currently be running their container.
"""

import csv
import json
import os
from pathlib import Path
from .constants import DESIRED_STATUSES, REGISTRY_FILE


def load_registry(path=REGISTRY_FILE):
    """Return the registry's user store ({name: details}); empty when absent."""
    file = Path(path)
    if not file.is_file():
        return {}
    data = json.loads(file.read_text(encoding="utf-8"))
    users = data.get("users") if isinstance(data, dict) else None
    return users if isinstance(users, dict) else {}


def _write_registry(users, path):
    """Atomically persist the user store to *path* (temp file + os.replace).

    The temp file is flushed and fsync'd before the rename so a crash or power
    loss cannot leave a truncated registry behind.
    """
    text = json.dumps({"users": users}, indent=2) + "\n"
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def _partition_new(new_users, known):
    """Split new_users into ({name: details} to add, [names] to skip)."""
    added, skipped = {}, []
    for name, details in new_users.items():
        if name in known:
            skipped.append(name)
        else:
            added[name] = details
    return added, skipped


def register_new_users(new_users, reserved, path=REGISTRY_FILE):
    """Merge new_users into the store, skipping names that already exist.

    Names in *reserved* (dtaas.toml's starting users) or already present in the
    registry are skipped rather than overwritten, so a user can never end up in
    both files. Returns (added_names, skipped_names).
    """
    users = load_registry(path)
    known = set(users) | set(reserved)
    added, skipped = _partition_new(new_users, known)
    users.update(added)
    _write_registry(users, path)
    return list(added), skipped


def remove_from_registry(usernames, path=REGISTRY_FILE):
    """Drop *usernames* from the store and persist it; returns the removed names."""
    users = load_registry(path)
    removed = [name for name in usernames if users.pop(name, None) is not None]
    _write_registry(users, path)
    return removed


def set_desired_status(usernames, status, path=REGISTRY_FILE):
    """Record each username's intended running state after a pause/stop/resume.

    *status* is one of DESIRED_STATUSES ('running'/'paused'/'stopped'). Only
    usernames already present in the registry are updated -- callers resolve
    against the registry first, so an unknown name here is silently skipped
    rather than treated as an error. email/groups/load_balance are left
    untouched. Persisted atomically like register_new_users. Returns the
    usernames actually updated.
    """
    if status not in DESIRED_STATUSES:
        raise ValueError(
            f"Invalid desired_status '{status}': expected one of {sorted(DESIRED_STATUSES)}"
        )
    users = load_registry(path)
    updated = [name for name in usernames if name in users]
    for name in updated:
        users[name]["desired_status"] = status
    _write_registry(users, path)
    return updated


def _parse_load_balance(value):
    """Parse a true/false load_balance cell; reject other non-empty values.

    An empty cell defaults to False; any value other than true/false is
    rejected so a typo never silently provisions with unintended settings.
    """
    text = value.strip().lower()
    if text in ("", "false"):
        return False
    if text == "true":
        return True
    raise ValueError(f"Invalid load_balance '{value}': expected 'true' or 'false'.")


def _parse_csv_row(row):
    """Convert one users.csv row into (username, details).

    'groups' is a ';'-separated cell (each tag stripped; an empty cell defaults
    to ['additional']) and 'load_balance' must be a true/false string.
    """
    groups = [g.strip() for g in row.get("groups", "").split(";") if g.strip()]
    details = {
        "email": row.get("email", "").strip(),
        "groups": groups or ["additional"],
        "load_balance": _parse_load_balance(row.get("load_balance", "")),
        "desired_status": "running",
    }
    return row["username"].strip(), details


def read_csv_users(csv_path):
    """Return {username: details} parsed from a users CSV file.

    Raises ValueError if the same username appears in more than one row, so a
    duplicate can never silently overwrite an earlier row's details.
    """
    users = {}
    with open(csv_path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            username, details = _parse_csv_row(row)
            if username in users:
                raise ValueError(f"Duplicate username '{username}' in {csv_path}")
            users[username] = details
    return users
