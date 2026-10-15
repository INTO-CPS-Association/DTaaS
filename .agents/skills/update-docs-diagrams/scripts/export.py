"""Export each page of the diagrams file to the image the documentation uses.

A page named after a path under `docs/`, such as
`admin/workspace/localhost/localhost.png`, is exported to that path. A page
named after a path under `deploy/` is exported there, for an installation
package whose diagram differs from every documentation page. A page with any
other name is a diagram the documentation does not show yet, and is skipped.

Every page under `docs/` is exported twice: the light image, and beside it a
`-dark` image made by dark.py for the slate scheme of the site, unless it is
in LIGHT_ONLY. The copies listed in DEPLOY_COPIES and the logos beside the
installation pages are then written from their sources, so they never drift.

The drawio desktop application does the drawing. Its binary is taken from the
DRAWIO environment variable, then from drawio on the PATH, as the Linux
packages install it, and then from the default install location on macOS and
Windows.

Run through `diagrams.py export`.
"""

import os
import pathlib
import platform
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from dark import write_dark
from settings import (
    CONTRAST_EXCEPTIONS, DEPLOY_COPIES, DOCS, EXPORT_WIDTH, LIGHT_ONLY, LOGO_PAGES,
    LOGOS, REPO, SOURCE
)

# Where the drawio desktop installer puts the binary on each system.
DRAWIO_INSTALLED = {
    'Darwin': '/Applications/draw.io.app/Contents/MacOS/draw.io',
    'Windows': r'C:\Program Files\draw.io\draw.io.exe',
}

# A page name is a path, and a page brought in from another drawio file can
# carry any name, so every target must stay inside these two folders.
ALLOWED = (DOCS.resolve(), (REPO / 'deploy').resolve())


def find_drawio():
    """The drawio binary: DRAWIO, then drawio on the PATH, then the installer's place."""
    return (os.environ.get('DRAWIO') or shutil.which('drawio')
            or DRAWIO_INSTALLED.get(platform.system(), 'drawio'))


def target_of(name):
    """Return where a page is exported, or None for an unplaced page."""
    if not name or not name.endswith('.png') or pathlib.PurePath(name).is_absolute():
        return None
    target = ((REPO if name.startswith('deploy/') else DOCS) / name).resolve()
    if not any(target.is_relative_to(root) for root in ALLOWED):
        raise SystemExit(f'page name {name!r} resolves outside docs/ and deploy/')
    return target


def dark_target(target):
    """Where the dark image of a documentation page goes, or None."""
    resolved = target.resolve()
    if not resolved.is_relative_to(ALLOWED[0]):
        return None
    if resolved.relative_to(ALLOWED[0]).as_posix() in LIGHT_ONLY:
        return None
    return target.with_name(f'{target.stem}-dark{target.suffix}')


def check_contrast(failures):
    """Stop the export when a placed page has an unlisted contrast failure."""
    unlisted = [(page, cell, problem) for page, cell, problem in failures
                if target_of(page) and dark_target(target_of(page))
                and (page, cell) not in CONTRAST_EXCEPTIONS]
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


def draw(drawio, source, number, target):
    """Draw one page of a drawio file to a PNG file."""
    # drawio numbers pages from 1.
    subprocess.run([drawio, '-x', '-f', 'png', '--theme', 'light',
                    '--width', str(EXPORT_WIDTH), '-p', str(number),
                    '-o', str(target), str(source)],
                   check=True, capture_output=True)
    print(f'wrote {target.relative_to(REPO)}')


def export_all():
    """Export every placed page, then copy images into the packages and pages."""
    drawio = find_drawio()
    if not pathlib.Path(drawio).exists():
        raise SystemExit(f'drawio not found at {drawio}, set DRAWIO')
    print(f'using {drawio}')
    names = [page.get('name') for page in ET.parse(SOURCE).getroot().iter('diagram')]
    with tempfile.TemporaryDirectory() as scratch:
        dark = pathlib.Path(scratch) / 'dark.drawio'
        check_contrast(write_dark(SOURCE, dark))
        for number, name in enumerate(names, start=1):
            target = target_of(name)
            if target is None:
                print(f'skipped page {number}, {name}')
                continue
            draw(drawio, SOURCE, number, target)
            if dark_target(target):
                draw(drawio, dark, number, dark_target(target))
    copy_to_packages()
    copy_logos()
