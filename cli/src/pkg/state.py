"""The CLI-owned runtime state cache, .dtaas.state.json (never git-tracked).

Observed facts about provisioned user containers -- config hash, provisioning
time, and best-effort container id/status -- written whenever 'dtaas admin user
add'/'delete' changes the running set. The config hash lets a later run detect
which users have drifted from the config they were provisioned with.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException
from .constants import COMPOSE_USERS_YML

STATE_FILE = ".dtaas.state.json"


def config_hash(service):
    """Return a stable sha256 over a user's compose service config."""
    blob = json.dumps(service, sort_keys=True).encode("utf-8")
    return "sha256:" + hashlib.sha256(blob).hexdigest()


def _service_facts():
    """Best-effort {service: (container_id, status)} for compose.users.yml.

    Returns an empty mapping when Docker is unreachable; the state cache then
    records config hashes without live container facts.
    """
    try:
        containers = DockerClient(compose_files=[COMPOSE_USERS_YML]).compose.ps()
    except DockerException:
        return {}
    facts = {}
    for container in containers:
        labels = container.config.labels or {}
        service = labels.get("com.docker.compose.service", container.name)
        facts[service] = (container.id, container.state.status)
    return facts


def build_state(services, facts):
    """Build the {username: runtime facts} mapping for provisioned services."""
    now = datetime.now(timezone.utc).isoformat()
    state = {}
    for username, service in services.items():
        container_id, status = facts.get(username, (None, None))
        state[username] = {
            "container_id": container_id,
            "status": status,
            "provisioned_at": now,
            "config_hash": config_hash(service),
        }
    return state


def write_state(services, path=STATE_FILE):
    """Write .dtaas.state.json for the currently provisioned services."""
    state = build_state(services, _service_facts())
    Path(path).write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    return state


def load_state(path=STATE_FILE):
    """Load the runtime state cache, returning {} when the file is absent."""
    file = Path(path)
    if not file.is_file():
        return {}
    return json.loads(file.read_text(encoding="utf-8"))


def _missing(names, other):
    """Names present in *names* but absent from *other*."""
    return [name for name in names if name not in other]


def _drifted_users(state, services):
    """Users whose current compose config differs from the provisioned hash."""
    drifted = []
    for user, service in services.items():
        stored = state.get(user)
        if stored is not None and stored.get("config_hash") != config_hash(service):
            drifted.append(user)
    return drifted


def find_drift(state, services):
    """Compare the state cache against the current compose services.

    Returns {'drifted', 'untracked', 'orphaned'} username lists: drifted =
    config changed since provisioning; untracked = provisioned but absent from
    the state cache; orphaned = in the state cache but no longer provisioned.
    """
    return {
        "drifted": _drifted_users(state, services),
        "untracked": _missing(services, state),
        "orphaned": _missing(state, services),
    }
