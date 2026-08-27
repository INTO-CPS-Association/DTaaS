"""Vendor gitlab_common from its single source of truth into dtaas_services.

Usage::

    python -m dtaas_services.pkg.build      # from deploy/services/cli/

dtaas_services/gitlab_common is NOT committed: its single source of truth is
lib/gitlab_common, developed and tested there in isolation. dtaas-services
does not declare a dependency on it (path or otherwise) -- a path dependency
bakes an absolute local path into a published wheel's metadata, which PyPI
rejects. Instead this script copies the source directly into the package
tree, the same way src/pkg/build.py copies deploy templates for the DTaaS
CLI. Run this before running tests or packaging.
"""

import shutil
import subprocess
import sys
from pathlib import Path

_PKG_ROOT = Path(__file__).resolve().parent.parent  # dtaas_services/
_PROJECT_ROOT = _PKG_ROOT.parent  # deploy/services/cli/
_REPO_ROOT = _PROJECT_ROOT.parent.parent.parent
_SOURCE = _REPO_ROOT / "lib" / "gitlab_common" / "gitlab_common"
_DEST = _PKG_ROOT / "gitlab_common"


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


def build() -> None:
    """Copy gitlab_common's source into dtaas_services, replacing any prior copy."""
    if not _SOURCE.is_dir():
        raise FileNotFoundError(
            f"Source not found: {_SOURCE}\n"
            "Expected the DTaaS monorepo layout with lib/gitlab_common present."
        )
    if _DEST.exists():
        shutil.rmtree(_DEST)
    shutil.copytree(_SOURCE, _DEST)
    init_file = _DEST / "__init__.py"
    init_file.write_text(
        init_file.read_text(encoding="utf-8")
        + f'\n__source_version__ = "{_source_version()}"\n',
        encoding="utf-8",
    )


def main() -> int:
    build()
    print(f"Vendored gitlab_common into {_DEST}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
