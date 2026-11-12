"""config/gitlab_user_projects.json: whose GitLab accounts this CLI made, and
each user's finished projects.

Holds {username: {"id": ..., "created_at": ..., "created": ..., "projects":
[...]}}. A record belongs to one GitLab account, the one with that id and
creation time: a reinstalled GitLab ('service clean') hands out the same ids
again, but never the same creation time, so a record never applies to a
later account of the same name, and a user added again after their account
was deleted starts afresh. "created" says this CLI made the account,
recorded the moment it does, so a later run may issue its token again
(accounts.py). A project is added once this CLI has created and filled it,
or once it has warned about a project with content that it found in place.
A re-run skips the projects listed here. The file is kept like
gitlab_user_tokens.json: 'service remove' and 'service clean' leave it, and
'project generate --force' never overwrites it.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

from ...config import Config
from .tokens_file import merge_json_object, read_json_object

PROJECTS_FILENAME = "gitlab_user_projects.json"


@dataclass(frozen=True)
class UserRecord:
    """One user's record: the GitLab account it belongs to (id and
    creation time), whether this CLI created that account, and the projects
    finished in it."""

    user_id: int
    created_at: str
    created: bool = False
    projects: tuple[str, ...] = ()

    def belongs_to(self, user_id: int, created_at: str) -> bool:
        """True when this is the record of the account *user_id* made at
        *created_at*."""
        return (self.user_id, self.created_at) == (user_id, created_at)

    def to_json(self) -> dict:
        """The record as it is saved."""
        return {
            "id": self.user_id,
            "created_at": self.created_at,
            "created": self.created,
            "projects": list(self.projects),
        }


def get_projects_path() -> Path:
    """Return the path to config/gitlab_user_projects.json."""
    return Config.get_base_dir() / "config" / PROJECTS_FILENAME


def _account_of(entry: dict) -> tuple[int, str] | None:
    """The account an *entry* belongs to, (id, creation time), or None when
    it names none: the id is an int (never a bool), the time not empty."""
    user_id, created_at = entry.get("id"), entry.get("created_at")
    if isinstance(user_id, bool) or not isinstance(user_id, int):
        return None
    if not isinstance(created_at, str) or not created_at:
        return None
    return user_id, created_at


def _record(entry: object) -> UserRecord | None:
    """*entry* as a UserRecord, or None when it is not one (a hand edit, or
    the plain list an unreleased version saved): it then belongs to no
    account."""
    if not isinstance(entry, dict):
        return None
    account = _account_of(entry)
    created, projects = entry.get("created"), entry.get("projects")
    if (
        account is None
        or not isinstance(created, bool)
        or not isinstance(projects, list)
    ):
        return None
    names = tuple(name for name in projects if isinstance(name, str))
    return UserRecord(*account, created, names)


def read_records() -> Tuple[dict[str, UserRecord], str]:
    """Return {username: record} and "" or why the file cannot be read. An
    entry that is not a record counts as none."""
    try:
        data = read_json_object(get_projects_path())
    except (OSError, ValueError) as exc:
        return {}, f"config/{PROJECTS_FILENAME} cannot be read: {exc}"
    records = {user: _record(entry) for user, entry in data.items()}
    return {user: record for user, record in records.items() if record}, ""


def save_record(username: str, record: UserRecord) -> str:
    """Save *record* as *username*'s, replacing any older one: "" or why it
    failed. The other users' records stay."""
    try:
        merge_json_object(get_projects_path(), {username: record.to_json()})
    except (OSError, ValueError) as exc:
        return f"config/{PROJECTS_FILENAME} cannot be written: {exc}"
    return ""
