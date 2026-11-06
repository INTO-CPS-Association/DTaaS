"""The owners file of the signals gateway, secrets/signals/signals_owners.json.

The gateway refuses a declared topic outside the group of the project that
declares it. The file maps each owner, the GitLab project path under the
DTaaS group, to its group and the topic prefixes of that group:

{"jady": {"group": "swim", "topics": ["SWiM/"]}}

The patterns below are the ones the gateway checks, so a file written here is
never refused there.
"""

import json
import re
from ..secret_files import SECRETS_DIR
from ..config import Config
from ..utils import write_secret_file

OWNERS_FILE = "signals_owners.json"
OWNER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
GROUP = re.compile(r"^[a-z][a-z0-9_]*$")
PREFIX = re.compile(r"^[^+#*\s]+/$")


class OwnersError(ValueError):
    """The owners file or an owner given to the command is not valid."""


def owners_path():
    """Path of the owners file, which the gateway mounts under /run/secrets."""
    return Config.get_base_dir() / SECRETS_DIR / "signals" / OWNERS_FILE


def read_owners() -> dict:
    """Read the owners file, or an empty mapping when it does not exist."""
    path = owners_path()
    if not path.exists():
        return {}
    try:
        owners = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise OwnersError(f"Cannot read {path}: {type(e).__name__}") from e
    if not isinstance(owners, dict):
        raise OwnersError(f"{path} must map each owner to its group and topics")
    return owners


def _check(owner: str, group: str, topics: list[str]) -> None:
    if not OWNER.match(owner):
        raise OwnersError(f"Invalid owner {owner!r}: use a GitLab project path")
    if not GROUP.match(group):
        raise OwnersError(f"Invalid group {group!r}")
    for topic in topics:
        if not PREFIX.match(topic):
            raise OwnersError(f"Invalid topic prefix {topic!r}")


def merge_owners(owners: dict, group: str, names: list[str], projects: list[str]) -> dict:
    """Return the owners mapping with each name mapped to group and projects.

    An owner already in the file keeps its topics and gains the new ones. An
    owner mapped to another group is refused, so no project's twins can read
    the topics of a group it does not belong to.
    """
    topics = [f"{project}/" for project in projects]
    merged = dict(owners)
    for name in names:
        _check(name, group, topics)
        current = merged.get(name) or {"group": group, "topics": []}
        if current.get("group") != group:
            raise OwnersError(
                f"Owner {name} is mapped to group {current.get('group')}, not {group}"
            )
        known = list(current.get("topics", []))
        merged[name] = {"group": group,
                        "topics": known + [t for t in topics if t not in known]}  # fmt: skip
    return merged


def write_owners(owners: dict) -> None:
    """Write the owners file with mode 600, replacing it in one rename."""
    write_secret_file(owners_path(), json.dumps(owners, indent=2, sort_keys=True) + "\n")
