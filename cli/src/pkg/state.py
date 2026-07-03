"""The CLI-owned runtime state cache, .dtaas.state.json (never git-tracked).

Observed facts about provisioned user containers -- config hash, provisioning
time, and best-effort container id/status -- written whenever 'dtaas admin user
add'/'delete' changes the running set. Each write fully replaces the file's
contents with the current set of provisioned services: it is a point-in-time
snapshot, not an append-only log, so it only ever reflects the most recent
add/delete. The config hash lets a later run detect which users' running
config has changed since they were provisioned.

dtaas.users.registry.json remains the source of truth for who *should* be
provisioned; this cache only records what the CLI last observed. See
find_drift(), which compares the two against the live compose services.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException
from .constants import COMPOSE_USERS_YML, STATE_FILE


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


def _drifted_users(registry_users, state, services):
    """Registry users whose live compose config no longer matches the hash
    recorded the last time they were provisioned.

    A user with no recorded hash (state cache missing or stale) is not
    flagged, since there is nothing to compare against -- that gap is exactly
    what 'missing'/'unexpected' below are for.
    """
    drifted = []
    for name in registry_users:
        service, recorded = services.get(name), state.get(name)
        if service is not None and recorded is not None:
            if recorded.get("config_hash") != config_hash(service):
                drifted.append(name)
    return drifted


def find_drift(registry_users, state, services):
    """Compare the registry (desired) against the live compose services (actual).

    Returns {'missing', 'unexpected', 'drifted'} username lists: missing =
    registered but not currently provisioned (re-run 'user add'); unexpected =
    provisioned but not in the registry (investigate -- may be a manual edit or
    a partial delete); drifted = provisioned with a config that no longer
    matches what was recorded when it was last provisioned.
    """
    return {
        "missing": _missing(registry_users, services),
        "unexpected": _missing(services, registry_users),
        "drifted": _drifted_users(registry_users, state, services),
    }
