"""Grafana data source postgresql_<group>, provisioned from a file.

Grafana reads the files in its provisioning folder when it starts. The
password is not in the file: Grafana expands $__file{...} to the content of
the secret file that its container mounts under /run/secrets.
"""

from pathlib import Path
from ..config import Config
from .names import view_account
from .pg_admin import internal_address, sslmode

DATASOURCES_DIR = Path("config") / "grafana" / "provisioning" / "datasources"
# 1800 is how Grafana names PostgreSQL 18, the version of the services compose
POSTGRES_VERSION = 1800

TEMPLATE = """\
# Made by dtaas-services user add-history. Grafana reads it at start.
apiVersion: 1

datasources:
  - name: postgresql_{group}
    uid: postgresql_{group}
    type: grafana-postgresql-datasource
    access: proxy
    url: {address}
    user: {user}
    editable: false
    jsonData:
      database: {group}
      sslmode: {sslmode}
      postgresVersion: {version}
      timescaledb: false
    secureJsonData:
      password: $__file{{/run/secrets/postgresql_{user}_password}}
"""


def datasource_path(group: str) -> Path:
    """Path of the provisioning file of a group's data source."""
    return Config.get_base_dir() / DATASOURCES_DIR / f"postgresql_{group}.yaml"


def write_datasource(group: str) -> Path:
    """Write the data source file of a group and return its path."""
    path = datasource_path(group)
    path.parent.mkdir(parents=True, exist_ok=True)
    config = Config()
    host, port = internal_address(config)
    content = TEMPLATE.format(
        group=group,
        address=f"{host}:{port}",
        sslmode=sslmode(config),
        user=view_account(group),
        version=POSTGRES_VERSION,
    )
    path.write_text(content, encoding="utf-8")
    return path
