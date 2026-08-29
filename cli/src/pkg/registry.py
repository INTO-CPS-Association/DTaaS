"""The CLI-owned user registry, dtaas.users.registry.json.

A store of the *additional* users provisioned by 'dtaas user add'/'delete',
mutated atomically by the CLI and never hand-edited, the way useradd owns
/etc/passwd. Starting users and deployment settings live in dtaas.toml.

Shape: {"users": {"alice": {"email": ..., "groups": [...],
"load_balance": bool, "desired_status": "running", "gitlab_user_id": 42,
"gitlab_pat_issued": true}}}. See set_desired_status()/set_gitlab_user_ids()/
set_gitlab_pat_issued() for the last three fields.
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


def _apply_user_field(field, values, path):
    """Set users[name][field] = values[name] for every *name* already in the
    registry, persisted atomically. Unknown names are skipped. Returns the
    usernames updated. Shared by set_desired_status / set_gitlab_user_ids /
    set_gitlab_pat_issued so the same atomic read-modify-write isn't repeated.
    """
    users = load_registry(path)
    updated = [name for name in values if name in users]
    for name in updated:
        users[name][field] = values[name]
    _write_registry(users, path)
    return updated


def set_desired_status(usernames, status, path=REGISTRY_FILE):
    """Record each username's intended running state after a pause/stop/resume.

    *status* is one of DESIRED_STATUSES. Only usernames already present in
    the registry are updated; an unknown name is silently skipped. Persisted
    atomically like register_new_users. Returns the usernames updated.
    """
    if status not in DESIRED_STATUSES:
        raise ValueError(
            f"Invalid desired_status '{status}': expected one of {sorted(DESIRED_STATUSES)}"
        )
    return _apply_user_field("desired_status", dict.fromkeys(usernames, status), path)


def set_gitlab_user_ids(user_ids, path=REGISTRY_FILE):
    """Record each username's GitLab numeric user_id after account creation.

    Lets a later retry reissue a PAT directly via create_user_pat, bypassing
    create_user's ambiguous ALREADY_EXISTS/409 path. Only usernames already
    in the registry are updated (an unknown name is skipped). Persisted
    atomically; returns the usernames updated.
    """
    return _apply_user_field("gitlab_user_id", user_ids, path)


def set_gitlab_pat_issued(usernames, path=REGISTRY_FILE):
    """Mark that a GitLab PAT has been issued for each username.

    Checked by 'dtaas user add' before issuing: re-running it for an
    already-provisioned user must not mint a second token, which would leave
    the first live on GitLab for its full lifetime with no record of it. Only
    usernames already in the registry are updated; persisted atomically.
    """
    return _apply_user_field("gitlab_pat_issued", dict.fromkeys(usernames, True), path)


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


def read_csv_passwords(csv_path):
    """Return {username: password} parsed from a users CSV file's optional
    'password' column, for GitLab provisioning.

    A blank or missing password cell is omitted rather than stored as an
    empty string. Kept independent of read_csv_users so a password can never
    be accidentally merged into the registry-persisted user details --
    passwords are transient and must never reach dtaas.users.registry.json.
    """
    passwords = {}
    with open(csv_path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            username = row.get("username", "").strip()
            password = row.get("password", "").strip()
            if username and password:
                passwords[username] = password
    return passwords
