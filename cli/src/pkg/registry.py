"""The CLI-owned user registry, dtaas.users.registry.json.

A store of the *additional* users provisioned by 'dtaas user add'/'delete',
mutated atomically by the CLI and never hand-edited, the way useradd owns
/etc/passwd. Starting users and deployment settings live in dtaas.toml.

Shape: {"users": {"alice": {"email": ..., "groups": [...],
"load_balance": bool, "desired_status": "running", "gitlab_user_id": 42,
"gitlab_pat_issued": true, "gitlab_projects_created": true}},
"starting_users": {"foo": {"gitlab_user_id": 7, ...}}}. See
set_desired_status()/set_gitlab_user_ids()/set_gitlab_pat_issued()/
set_gitlab_projects_created() for the GitLab fields.

The second section holds nothing but those GitLab markers, for the dtaas.toml
starting users that 'user add' has provisioned on GitLab. They are kept apart
from "users" because every name in "users" becomes a compose.users.yml
service: a starting user already has a container from docker-compose.yml, and
putting one there would provision it twice. load_registry() returns "users"
alone, so no container, status or reconcile path can see them.
"""

import json
import os
from dataclasses import dataclass
from pathlib import Path
from .constants import DESIRED_STATUSES, REGISTRY_FILE

USERS_KEY = "users"
STARTING_KEY = "starting_users"


@dataclass(frozen=True)
class _FieldUpdate:
    """One field to set on several users: its name, and the value per user."""

    field: str
    values: dict


def _read_document(path):
    """The whole registry document; empty when the file is absent or is not
    a JSON object."""
    file = Path(path)
    if not file.is_file():
        return {}
    data = json.loads(file.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def _section(path, key):
    """One top-level mapping of the registry document; empty when absent."""
    section = _read_document(path).get(key)
    return section if isinstance(section, dict) else {}


def load_registry(path=REGISTRY_FILE):
    """Return the registry's user store ({name: details}); empty when absent."""
    return _section(path, USERS_KEY)


def load_starting_gitlab(path=REGISTRY_FILE):
    """Return the GitLab markers recorded for dtaas.toml starting users."""
    return _section(path, STARTING_KEY)


def _write_section(section, key, path):
    """Atomically persist one section of the document (temp file + os.replace).

    The document's other sections are read back and written out unchanged, so
    a write to one never drops the other. The temp file is flushed and fsync'd
    before the rename, so a crash or power loss cannot leave a truncated
    registry behind.
    """
    document = _read_document(path)
    document[key] = section
    text = json.dumps(document, indent=2) + "\n"
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def _write_registry(users, path):
    """Atomically persist the user store, keeping the document's other keys."""
    _write_section(users, USERS_KEY, path)


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


def register_starting_users(usernames, path=REGISTRY_FILE):
    """Start tracking the GitLab halves of dtaas.toml starting users.

    Called when 'user add' names a starting user with provisioning enabled.
    The record starts empty and the markers are set on it as each half
    finishes, so a run that creates the account and fails the projects can
    be retried for the projects alone, exactly as for an additional user.
    Returns the names newly tracked.
    """
    section = _section(path, STARTING_KEY)
    added = [name for name in usernames if name not in section]
    for name in added:
        section[name] = {}
    if added:
        _write_section(section, STARTING_KEY, path)
    return added


def _apply_to_section(update, key, path):
    """Set one field on every name of *update* present in section *key*.

    Returns the usernames updated; unknown names are skipped, and nothing is
    written when none of them is there.
    """
    section = _section(path, key)
    updated = [name for name in update.values if name in section]
    for name in updated:
        section[name][update.field] = update.values[name]
    if updated:
        _write_section(section, key, path)
    return updated


def _apply_user_field(field, values, path):
    """Set <field> = values[name] for every *name* the registry tracks.

    Each name is routed to the section that holds it: the additional user
    store, or the starting user markers for a dtaas.toml user that 'user add'
    provisions on GitLab. Unknown names are skipped. Returns the usernames
    updated. Shared by set_desired_status / set_gitlab_user_ids /
    set_gitlab_pat_issued so the same atomic read-modify-write isn't repeated.
    """
    updated = _apply_to_section(_FieldUpdate(field, values), USERS_KEY, path)
    rest = {name: values[name] for name in values if name not in updated}
    if not rest:
        return updated
    return updated + _apply_to_section(_FieldUpdate(field, rest), STARTING_KEY, path)


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


def set_gitlab_projects_created(usernames, path=REGISTRY_FILE):
    """Mark that each username's GitLab projects have been created.

    Tracked separately from gitlab_pat_issued: a run can issue the token and
    still fail to create the projects, and the next 'dtaas user add' must
    retry only the half that is missing. Only usernames already in the
    registry are updated; persisted atomically.
    """
    return _apply_user_field(
        "gitlab_projects_created", dict.fromkeys(usernames, True), path
    )
