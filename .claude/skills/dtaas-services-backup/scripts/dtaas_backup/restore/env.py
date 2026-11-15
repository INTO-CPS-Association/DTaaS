"""services.env and compose-file handling for restore: read, merge source values, map ports.

Values are never printed: callers only see key names and whether a value changes.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from ..common import write_text

# Services (backup names) -> compose service names in dtaas-services 1.2.0
COMPOSE_SERVICE = {"postgres": "postgres", "thingsboard": "thingsboard-ce", "grafana": "grafana",
                   "influxdb": "influxdb", "mongodb": "mongodb", "rabbitmq": "rabbitmq"}
# Name the dtaas-services CLI accepts with `service start -s`
CLI_SERVICE = {"postgres": "postgres", "thingsboard": "thingsboard", "grafana": "grafana",
               "influxdb": "influxdb", "mongodb": "mongodb", "rabbitmq": "rabbitmq"}

# Target key -> where its SOURCE value comes from, per service:
#   ("env", VAR)  = the source container's environment (docker-inspect.json), authoritative
#   ("file", KEY) = the source project's services.env (saved in projects/<install>/config/services.env)
# The first available source wins. These are the accounts created on a service's FIRST start, so they must
# match the restored data (and the CLI, which logs in with them).
SOURCE_KEYS: dict[str, dict[str, list[tuple[str, str]]]] = {
    "postgres": {
        "POSTGRES_USER": [("env", "POSTGRES_USER"), ("file", "POSTGRES_USER")],
        "POSTGRES_PASSWORD": [("env", "POSTGRES_PASSWORD"), ("file", "POSTGRES_PASSWORD")],
        "POSTGRES_DB": [("env", "POSTGRES_DB"), ("file", "POSTGRES_DB")],
    },
    "thingsboard": {
        "POSTGRES_USER": [("env", "SPRING_DATASOURCE_USERNAME"), ("file", "POSTGRES_USER")],
        "POSTGRES_PASSWORD": [("env", "SPRING_DATASOURCE_PASSWORD"), ("file", "POSTGRES_PASSWORD")],
        "TB_SYSADMIN_EMAIL": [("file", "TB_SYSADMIN_EMAIL")],
        "TB_TENANT_TITLE": [("file", "TB_TENANT_TITLE")],
        "TB_TENANT_ADMIN_EMAIL": [("file", "TB_TENANT_ADMIN_EMAIL")],
        "TB_TENANT_ADMIN_PASSWORD": [("file", "TB_TENANT_ADMIN_PASSWORD")],
    },
    "grafana": {
        "GRAFANA_ADMIN_USERNAME": [("env", "GF_SECURITY_ADMIN_USER"), ("file", "GRAFANA_ADMIN_USERNAME")],
        "GRAFANA_ADMIN_PASSWORD": [("env", "GF_SECURITY_ADMIN_PASSWORD"), ("file", "GRAFANA_ADMIN_PASSWORD")],
    },
    "influxdb": {
        "INFLUXDB_ADMIN_USERNAME": [("env", "DOCKER_INFLUXDB_INIT_USERNAME"), ("file", "INFLUXDB_ADMIN_USERNAME")],
        "INFLUXDB_ADMIN_PASSWORD": [("env", "DOCKER_INFLUXDB_INIT_PASSWORD"), ("file", "INFLUXDB_ADMIN_PASSWORD")],
        "INFLUXDB_ORG": [("env", "DOCKER_INFLUXDB_INIT_ORG"), ("file", "INFLUXDB_ORG")],
        "INFLUXDB_BUCKET": [("env", "DOCKER_INFLUXDB_INIT_BUCKET"), ("file", "INFLUXDB_BUCKET")],
    },
    "mongodb": {
        "MONGODB_ADMIN_USERNAME": [("env", "MONGO_INITDB_ROOT_USERNAME"), ("file", "MONGODB_ADMIN_USERNAME")],
        "MONGODB_ADMIN_PASSWORD": [("env", "MONGO_INITDB_ROOT_PASSWORD"), ("file", "MONGODB_ADMIN_PASSWORD")],
    },
    "rabbitmq": {
        "RABBITMQ_ADMIN_USERNAME": [("env", "RABBITMQ_DEFAULT_USER"), ("file", "RABBITMQ_ADMIN_USERNAME")],
        "RABBITMQ_ADMIN_PASSWORD": [("env", "RABBITMQ_DEFAULT_PASS"), ("file", "RABBITMQ_ADMIN_PASSWORD")],
    },
}


# ---------------------------------------------------------------- env files
def _unquote(v: str) -> str:
    """Single quotes: literal. Double quotes: \\" and \\\\ escapes (as python-dotenv and compose read them)."""
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] == "'":
        return v[1:-1]
    if len(v) >= 2 and v[0] == v[-1] == '"':
        return re.sub(r'\\(["\\])', r"\1", v[1:-1])
    return v


def read_env(path: Path) -> dict[str, str]:
    """KEY=value lines (comments, blank lines and CRLF tolerated), quotes removed."""
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.rstrip("\r").strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        if k.startswith("export "):
            k = k[7:].strip()
        out[k] = _unquote(v)
    return out


UNSAFE_IN_DOUBLE_QUOTES = ("$", "`")


def quote(v: str) -> str:
    """Value as written to services.env so that python-dotenv (the CLI) and docker compose read the same text.
    Single quotes are literal for both (no $VAR expansion), so they are used whenever possible."""
    if re.fullmatch(r"[A-Za-z0-9_@.%+,:/=\-]*", v):
        return v
    if "'" not in v:
        return f"'{v}'"
    # contains a single quote: double quotes with escapes; compose would expand $VAR here (caller warns)
    return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'


def risky_value(v: str) -> bool:
    """True if no quoting keeps the value identical for both compose and python-dotenv."""
    return "'" in v and any(c in v for c in UNSAFE_IN_DOUBLE_QUOTES)


def write_env_updates(path: Path, updates: dict[str, str]) -> None:
    """Replace KEY=... lines in place (keeping comments and order), append missing keys; LF endings."""
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    seen = set()
    out = []
    for line in lines:
        line = line.rstrip("\r")
        m = re.match(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
        if m and m.group(1) in updates:
            k = m.group(1)
            out.append(f"{k}={quote(updates[k])}")
            seen.add(k)
        else:
            out.append(line)
    missing = [k for k in updates if k not in seen]
    if missing:
        out.append("")
        out.append("# Added by the dtaas-services-backup restore")
        out.extend(f"{k}={quote(updates[k])}" for k in missing)
    write_text(path, "\n".join(out) + "\n")


# ---------------------------------------------------------------- compose files
@dataclass
class ComposeService:
    name: str
    container: str = ""
    image: str = ""
    ports: list[tuple[str, str, str]] = field(default_factory=list)   # (ENV_KEY, container port or range, proto)
    binds: list[tuple[str, str]] = field(default_factory=list)        # (host path relative to project, container path)


def parse_compose(path: Path) -> dict[str, ComposeService]:
    """Minimal parser for the dtaas-services compose files (no YAML library needed): services, container_name,
    image, `${KEY}:port` port mappings and './x:/y' bind mounts."""
    services: dict[str, ComposeService] = {}
    cur: ComposeService | None = None
    section = ""
    in_services = False
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.rstrip("\r")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        text = line.strip()
        if indent == 0:
            in_services = text == "services:"
            cur = None
            continue
        if not in_services:
            continue
        if indent == 2 and text.endswith(":"):
            cur = services.setdefault(text[:-1], ComposeService(text[:-1]))
            section = ""
            continue
        if cur is None:
            continue
        if indent == 4:
            key, _, val = text.partition(":")
            section = key.strip()
            val = val.strip().strip("'\"")
            if section == "container_name":
                cur.container = val
            elif section == "image":
                cur.image = val
            continue
        if text.startswith("- "):
            item = text[2:].split("#", 1)[0].strip().strip("'\"")
            if section == "ports":
                m = re.match(r"^\$\{(\w+)\}:(\d+(?:-\d+)?)(?:/(udp|tcp))?$", item)
                if m:
                    cur.ports.append((m.group(1), m.group(2), m.group(3) or "tcp"))
            elif section == "volumes" and item.startswith("./"):
                host, _, ctr = item.partition(":")
                cur.binds.append((host[2:], ctr.split(":")[0]))
    return services


def set_compose_image(path: Path, service: str, image: str) -> str:
    """Change one service's image: line; returns the previous image."""
    lines = path.read_text(encoding="utf-8").splitlines()
    in_svc, old = False, ""
    for i, line in enumerate(lines):
        if re.match(rf"^  {re.escape(service)}:\s*$", line):
            in_svc = True
            continue
        if in_svc and re.match(r"^  \S", line):
            break
        if in_svc and re.match(r"^    image:", line):
            old = line.split(":", 1)[1].strip().strip("'\"")
            lines[i] = f"    image: '{image}'"
            break
    if not old:
        raise ValueError(f"no image line for service {service} in {path}")
    write_text(path, "\n".join(lines) + "\n")
    return old


# ---------------------------------------------------------------- source values from a backup
def source_env(backup: Path, service: str) -> dict[str, str]:
    """Environment of the source container (from <service>/docker-inspect.json)."""
    p = backup / service / "docker-inspect.json"
    if not p.is_file():
        return {}
    data = json.loads(p.read_text(encoding="utf-8"))
    env = {}
    for kv in (data[0].get("Config", {}).get("Env") or []):
        k, _, v = kv.partition("=")
        env[k] = v
    return env


def source_project_dir(backup: Path, service: str) -> Path | None:
    """projects/<install>/ saved for the service's compose project, if any."""
    info = read_env(backup / service / "service.txt")
    wd = info.get("compose_dir", "")
    if not wd:
        return None
    for d in (backup / "projects").glob("*"):
        if (d / "PROJECT_DIR").is_file() and (d / "PROJECT_DIR").read_text(encoding="utf-8").strip() == wd:
            return d
    return None


def source_services_env(backup: Path, service: str) -> dict[str, str]:
    d = source_project_dir(backup, service)
    if d is None:
        return {}
    for rel in ("config/services.env", "config/.env", ".env"):
        if (d / rel).is_file():
            return read_env(d / rel)
    return {}


def source_ports(backup: Path, service: str) -> dict[str, list[str]]:
    """Container port spec ('8086/tcp') -> host ports used on the source."""
    p = backup / service / "docker-inspect.json"
    if not p.is_file():
        return {}
    data = json.loads(p.read_text(encoding="utf-8"))
    out: dict[str, list[str]] = {}
    for spec, binds in (data[0].get("HostConfig", {}).get("PortBindings") or {}).items():
        out[spec] = [b.get("HostPort", "") for b in (binds or []) if b.get("HostPort")]
    return out


def proposed_port(src: dict[str, list[str]], container_port: str, proto: str) -> str | None:
    """Source host port (or range) for a target `${KEY}:container_port[/proto]` mapping."""
    if "-" in container_port:
        lo, hi = (int(x) for x in container_port.split("-"))
        hosts = []
        for p in range(lo, hi + 1):
            h = src.get(f"{p}/{proto}")
            if not h:
                return None
            hosts.append(int(h[0]))
        if hosts == list(range(hosts[0], hosts[0] + len(hosts))):
            return f"{hosts[0]}-{hosts[-1]}"
        return None
    h = src.get(f"{container_port}/{proto}")
    return h[0] if h else None
