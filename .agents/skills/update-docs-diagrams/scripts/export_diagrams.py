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

Every page under `docs/` is exported twice: the light image, and beside it a
`-dark` image made by dark_variant.py for the slate scheme of the site. The
pages show the one that suits the reader through `#only-light` and
`#only-dark`.

The drawio desktop application does the drawing. Its binary is taken from the
DRAWIO environment variable, then from drawio on the PATH, as the Linux
packages install it, and then from the default install location on macOS and
Windows.

Usage: python3 export_diagrams.py
"""

import os
import pathlib
import platform
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from dark_variant import write_dark

# Resolved from this file, so the script runs from any directory.
HERE = pathlib.Path(__file__).resolve().parent
# scripts, update-docs-diagrams, skills, .agents, then the repository.
REPO = HERE.parents[3]
DOCS = REPO / 'docs'
SOURCE = DOCS / 'assets/diagrams/dtaas-diagrams.drawio'

# Where the drawio desktop installer puts the binary on each system.
DRAWIO_INSTALLED = {
    'Darwin': '/Applications/draw.io.app/Contents/MacOS/draw.io',
    'Windows': r'C:\Program Files\draw.io\draw.io.exe',
}


def find_drawio():
    """The drawio binary: DRAWIO, then drawio on the PATH, then the installer's place."""
    return (os.environ.get('DRAWIO') or shutil.which('drawio')
            or DRAWIO_INSTALLED.get(platform.system(), 'drawio'))


DRAWIO = find_drawio()

# Every image is drawn this many pixels wide: twice the widest content column
# of the documentation, so it stays sharp on a high density screen. The pages
# show each image at the column width, so every diagram is shown at the same
# scale relative to its own width, which `restyle_drawio.py` sizes text for.
EXPORT_WIDTH = 1600

# Documentation image, relative to docs/, and its copies in the packages.
DEPLOY_COPIES = {
    'admin/dtaas/localhost/localhost.png': [
        'deploy/dtaas/docker/localhost/localhost.png'],
    'admin/dtaas/secure-server/server.png': [
        'deploy/dtaas/docker/secure-server/server.png'],
    'admin/dtaas/secure-server-gitlab/server.png': [
        'deploy/dtaas/docker/secure-server_with_integrated-gitlab/server.png'],
    'admin/workspace/localhost/localhost.png': [
        'deploy/workspace/dex/localhost/localhost.png'],
    'admin/workspace/secure-server/secure-server.png': [
        'deploy/workspace/keycloak/production/secure-server.png'],
}


# A page name is a path, and a page brought in from another drawio file can
# carry any name, so every target must stay inside these two folders.
ALLOWED = (DOCS.resolve(), (REPO / 'deploy').resolve())


def target_of(name):
    """Return where a page is exported, or None for an unplaced page."""
    if not name or not name.endswith('.png') or pathlib.PurePath(name).is_absolute():
        return None
    target = ((REPO if name.startswith('deploy/') else DOCS) / name).resolve()
    if not any(target.is_relative_to(root) for root in ALLOWED):
        raise SystemExit(f'page name {name!r} resolves outside docs/ and deploy/')
    return target


# The installation pages show the logo from a copy beside the page, as the
# packages under deploy/ do, so a page and its images move together.
LOGOS = ['dtaas-logo-full-192h.png', 'dtaas-logo-full-white-192h.png']
LOGO_PAGES = [
    'admin/dtaas/localhost',
    'admin/dtaas/secure-server',
    'admin/dtaas/secure-server-gitlab',
    'admin/workspace/localhost',
    'admin/workspace/secure-server',
]


# Cells of placed pages allowed below the contrast minimums of dark_variant.py,
# as (page name, cell id): the reason. Empty: every dark image passes.
CONTRAST_EXCEPTIONS = {}


def check_contrast(failures):
    """Stop the export when a placed page has an unlisted contrast failure."""
    unlisted = [(page, cell, problem) for page, cell, problem in failures
                if target_of(page) and (page, cell) not in CONTRAST_EXCEPTIONS]
    for page, cell, problem in unlisted:
        print(f'low contrast on {page}, cell {cell}: {problem}')
    if unlisted:
        raise SystemExit(f'{len(unlisted)} cells below the contrast minimums, '
                         'fix them in drawio or list them in CONTRAST_EXCEPTIONS')
    print('every dark variant meets the contrast minimums')


def copy_logos():
    """Write the copies of the logo beside the installation pages."""
    for folder in LOGO_PAGES:
        for logo in LOGOS:
            shutil.copyfile(DOCS / 'assets/brand/png' / logo, DOCS / folder / logo)
        print(f'copied the logos to docs/{folder}')


def copy_to_packages():
    """Write the package copies of the documentation images."""
    for source, copies in DEPLOY_COPIES.items():
        for copy in copies:
            shutil.copyfile(DOCS / source, REPO / copy)
            print(f'copied {source} to {copy}')


def export(source, number, target):
    """Draw one page of a drawio file to a PNG file."""
    # drawio numbers pages from 1.
    subprocess.run([DRAWIO, '-x', '-f', 'png', '--theme', 'light',
                    '--width', str(EXPORT_WIDTH), '-p', str(number),
                    '-o', str(target), str(source)],
                   check=True, capture_output=True)
    print(f'wrote {target.relative_to(REPO)}')


def dark_target(target):
    """Where the dark image of a documentation page goes, or None."""
    if not target.resolve().is_relative_to(ALLOWED[0]):
        return None
    return target.with_name(f'{target.stem}-dark{target.suffix}')


def main():
    """Export every placed page, then copy images into the packages and pages."""
    if not pathlib.Path(DRAWIO).exists():
        raise SystemExit(f'drawio not found at {DRAWIO}, set DRAWIO')
    print(f'using {DRAWIO}')
    names = [page.get('name') for page in ET.parse(SOURCE).getroot().iter('diagram')]
    with tempfile.TemporaryDirectory() as scratch:
        dark = pathlib.Path(scratch) / 'dark.drawio'
        check_contrast(write_dark(SOURCE, dark))
        for number, name in enumerate(names, start=1):
            target = target_of(name)
            if target is None:
                print(f'skipped page {number}, {name}')
                continue
            export(SOURCE, number, target)
            if dark_target(target):
                export(dark, number, dark_target(target))
    copy_to_packages()
    copy_logos()


if __name__ == '__main__':
    main()
