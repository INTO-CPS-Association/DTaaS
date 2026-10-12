"""Export each page of the diagrams file to the image the documentation uses.

A page named after a path under `docs/`, such as
`admin/workspace/localhost/localhost.png`, is exported to that path. A page
named after a path under `deploy/` is exported there, for an installation
package whose diagram differs from every documentation page. A page with any
other name is a diagram the documentation does not show yet, and is skipped.

The installation packages under `deploy/` carry their own copy of some of the
documentation images, so a downloaded package shows its diagram offline. Those
copies are written from the exported images, listed in DEPLOY_COPIES, so the
two can never drift apart.

The drawio desktop application does the drawing. Its binary is taken from the
DRAWIO environment variable, and defaults to the macOS install location.

Usage: python3 export_diagrams.py
"""

import os
import pathlib
import shutil
import subprocess
import xml.etree.ElementTree as ET

# Resolved from this file, so the script runs from any directory.
HERE = pathlib.Path(__file__).resolve().parent
DOCS = HERE.parents[1]
REPO = DOCS.parent
SOURCE = HERE / 'dtaas-diagrams.drawio'

DRAWIO = os.environ.get(
    'DRAWIO', '/Applications/draw.io.app/Contents/MacOS/draw.io')

# Every image is drawn this many pixels wide: twice the widest content column
# of the documentation, so it stays sharp on a high density screen. The pages
# show each image at the column width, so every diagram is shown at the same
# scale relative to its own width, which `restyle_drawio.py` sizes text for.
EXPORT_WIDTH = 1600

# Documentation image, relative to docs/, and its copies in the packages.
DEPLOY_COPIES = {
    'admin/dtaas/secure-server/server.png': [
        'deploy/dtaas/docker/secure-server/server.png'],
    'admin/dtaas/secure-server-gitlab/server.png': [
        'deploy/dtaas/docker/secure-server_with_integrated-gitlab/server.png'],
    'admin/workspace/localhost/localhost.png': [
        'deploy/workspace/dex/localhost/localhost.png'],
    'admin/workspace/secure-server/secure-server.png': [
        'deploy/workspace/keycloak/production/secure-server.png'],
}


def target_of(name):
    """Return where a page is exported, or None for an unplaced page."""
    if not name.endswith('.png'):
        return None
    return REPO / name if name.startswith('deploy/') else DOCS / name


def copy_to_packages():
    """Write the package copies of the documentation images."""
    for source, copies in DEPLOY_COPIES.items():
        for copy in copies:
            shutil.copyfile(DOCS / source, REPO / copy)
            print(f'copied {source} to {copy}')


def main():
    """Export every placed page, then copy images into the packages."""
    if not pathlib.Path(DRAWIO).exists():
        raise SystemExit(f'drawio not found at {DRAWIO}, set DRAWIO')
    print(f'using {DRAWIO}')
    pages = ET.parse(SOURCE).getroot().iter('diagram')
    for number, page in enumerate(pages, start=1):
        name = page.get('name')
        target = target_of(name)
        if target is None:
            print(f'skipped page {number}, {name}')
            continue
        # drawio numbers pages from 1.
        subprocess.run([DRAWIO, '-x', '-f', 'png', '--theme', 'light',
                        '--width', str(EXPORT_WIDTH), '-p', str(number),
                        '-o', str(target), str(SOURCE)],
                       check=True, capture_output=True)
        print(f'wrote {target.relative_to(REPO)}')
    copy_to_packages()


if __name__ == '__main__':
    main()
