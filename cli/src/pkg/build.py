"""Copy generated sources into the src/ tree before packaging or testing.

Usage::

    python -m src.pkg.build          # from the cli/ directory
    python src/pkg/build.py          # from the cli/ directory

Two things are copied in, neither committed to this repository:

- Deploy templates, from deploy/dtaas and deploy/workspace into
  src/templates/deploy.
- gitlab_common, the shared GitLab library, from lib/gitlab_common into
  src/gitlab_common. Its single source of truth is developed and tested in
  isolation there; see lib/gitlab_common/README.md for why it is copied
  rather than depended on (a path dependency bakes an absolute local path
  into a published wheel's metadata, which PyPI rejects).

Run this script before packaging or running tests.
"""

import shutil
import subprocess
import sys
from pathlib import Path

try:
    from .constants import SECRET_FILENAMES, SECRET_SUFFIXES
except ImportError:  # run as a plain script: `python src/pkg/build.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from constants import SECRET_FILENAMES, SECRET_SUFFIXES

_CLI_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = _CLI_ROOT.parent
_DEST_ROOT = _CLI_ROOT / "src" / "templates" / "deploy"
_GITLAB_COMMON_SOURCE = _REPO_ROOT / "lib" / "gitlab_common" / "gitlab_common"
_GITLAB_COMMON_DEST = _CLI_ROOT / "src" / "gitlab_common"

# Maps each deploy type to its source directory (relative to the repo root).
_SOURCES: dict[str, str] = {
    "localhost": "deploy/dtaas/docker/localhost",
    "insecure-server": "deploy/dtaas/docker/server",
    "secure-server": "deploy/dtaas/docker/secure-server",
    "secure-server-gitlab": "deploy/dtaas/docker/secure-server_with_integrated-gitlab",
    "workspace-localhost": "deploy/workspace/dex/localhost",
    "workspace-secure-server": "deploy/workspace/keycloak/production",
}


def _ignore(_directory: str, names: list[str]) -> list[str]:
    """copytree ignore hook: keep locally-configured secrets out of the wheel.

    Only *.example templates should ever reach src/templates/deploy; a real
    deployment run against these source directories may have populated
    SECRET_FILENAMES/SECRET_SUFFIXES locally (they're gitignored for exactly
    this reason), and copytree would otherwise happily package them.
    """
    return [n for n in names if n in SECRET_FILENAMES or n.endswith(SECRET_SUFFIXES)]


def _copy_tree(src: Path, dest: Path, ignore_func=None) -> None:
    """Copy src tree to dest, removing dest first if it exists."""
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=ignore_func, copy_function=shutil.copy)


def _copy_one(deploy_type: str, rel_source: str) -> None:
    src = _REPO_ROOT / rel_source
    if not src.is_dir():
        raise FileNotFoundError(f"Source not found: {src}")
    dest = _DEST_ROOT / deploy_type
    _copy_tree(src, dest, ignore_func=_ignore)


def build_templates() -> None:
    """Copy all deploy templates from their source directories."""
    _DEST_ROOT.mkdir(parents=True, exist_ok=True)
    for deploy_type, rel_source in _SOURCES.items():
        _copy_one(deploy_type, rel_source)


def _source_version() -> str:
    """Git commit hash of lib/gitlab_common's last change, or "unknown"
    outside a git checkout (e.g. building from an sdist) -- lets a vendored
    copy be traced back to the source commit it was copied from."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%H", "--", "lib/gitlab_common"],
            cwd=_REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip() or "unknown"
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def vendor_gitlab_common() -> None:
    """Copy gitlab_common's source into src/, replacing any prior copy."""
    if not _GITLAB_COMMON_SOURCE.is_dir():
        raise FileNotFoundError(
            f"Source not found: {_GITLAB_COMMON_SOURCE}\n"
            "Expected the DTaaS monorepo layout with lib/gitlab_common present."
        )
    _copy_tree(_GITLAB_COMMON_SOURCE, _GITLAB_COMMON_DEST)
    init_file = _GITLAB_COMMON_DEST / "__init__.py"
    init_file.write_text(
        init_file.read_text(encoding="utf-8")
        + f'\n__source_version__ = "{_source_version()}"\n',
        encoding="utf-8",
    )


def build() -> None:
    """Copy all generated sources into src/ (templates and gitlab_common)."""
    build_templates()
    vendor_gitlab_common()


def main() -> int:
    build()
    print(f"Copied {len(_SOURCES)} deploy templates into {_DEST_ROOT}")
    print(f"Vendored gitlab_common into {_GITLAB_COMMON_DEST}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
