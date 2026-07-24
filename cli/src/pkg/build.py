"""Copy deploy templates from their source directories into src/templates/deploy.

Usage::

    python -m src.pkg.build          # from the cli/ directory
    python src/pkg/build.py          # from the cli/ directory

Templates are NOT committed under src/templates/deploy.  Their single
source of truth lives in deploy/dtaas and deploy/workspace.  Run this
script before packaging or running tests.
"""

import shutil
import sys
from pathlib import Path

_CLI_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = _CLI_ROOT.parent
_DEST_ROOT = _CLI_ROOT / "src" / "templates" / "deploy"

# Maps each deploy type to its source directory (relative to the repo root).
_SOURCES: dict[str, str] = {
    "localhost": "deploy/dtaas/docker/localhost",
    "insecure-server": "deploy/dtaas/docker/server",
    "secure-server": "deploy/dtaas/docker/secure-server",
    "secure-server-gitlab": "deploy/dtaas/docker/secure-server_with_integrated-gitlab",
    "workspace-localhost": "deploy/workspace/dex/localhost",
    "workspace-secure-server": "deploy/workspace/keycloak/production",
}

# Filenames that hold live secrets on a developer machine (gitignored, so a
# real deployment may have populated them locally). Only *.example templates
# should ever reach the packaged wheel; excluding these by name keeps a
# locally-configured .env, TLS key, or auth conf from being copied in.
_EXCLUDE_NAMES: frozenset[str] = frozenset(
    {".env", "conf.server", "client.js", "forward-auth-conf"}
)
_EXCLUDE_SUFFIXES: tuple[str, ...] = (".pem", ".key", ".crt", ".p12")


def _ignore(_directory: str, names: list[str]) -> list[str]:
    return [n for n in names if n in _EXCLUDE_NAMES or n.endswith(_EXCLUDE_SUFFIXES)]


def _copy_one(deploy_type: str, rel_source: str) -> None:
    src = _REPO_ROOT / rel_source
    if not src.is_dir():
        raise FileNotFoundError(f"Source not found: {src}")
    dest = _DEST_ROOT / deploy_type
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=_ignore, copy_function=shutil.copy)


def build() -> None:
    """Copy all deploy templates from their source directories."""
    _DEST_ROOT.mkdir(parents=True, exist_ok=True)
    for deploy_type, rel_source in _SOURCES.items():
        _copy_one(deploy_type, rel_source)


def main() -> int:
    build()
    print(f"Copied {len(_SOURCES)} deploy templates into {_DEST_ROOT}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
