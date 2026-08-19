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
import sys
from pathlib import Path

_PKG_ROOT = Path(__file__).resolve().parent.parent  # dtaas_services/
_PROJECT_ROOT = _PKG_ROOT.parent  # deploy/services/cli/
_REPO_ROOT = _PROJECT_ROOT.parent.parent.parent
_SOURCE = _REPO_ROOT / "lib" / "gitlab_common" / "gitlab_common"
_DEST = _PKG_ROOT / "gitlab_common"


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


def main() -> int:
    build()
    print(f"Vendored gitlab_common into {_DEST}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
