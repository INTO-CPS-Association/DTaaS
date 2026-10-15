"""Export each page of the diagrams file to the image the documentation uses.

A page named after a path under `docs/`, such as
`admin/workspace/localhost/localhost.png`, is exported to that path. A page
named after a path under `deploy/` is exported there, for an installation
package whose diagram differs from every documentation page. A page with any
other name is a diagram the documentation does not show yet, and is skipped.

Before it draws anything, the export checks the dark variant against the
contrast minimums and every placed page against the layout rules of
layout.py, and stops on a problem not listed in settings.py.

Every page under `docs/` is exported twice: the light image, and beside it a
`-dark` image made by dark.py for the slate scheme of the site, unless it is
in LIGHT_ONLY. The copies listed in DEPLOY_COPIES and the logos beside the
installation pages are then written from their sources, so they never drift.

The drawio desktop application does the drawing. Its binary is taken from the
DRAWIO environment variable, then from drawio on the PATH, as the Linux
packages install it, and then from the default install location on macOS and
Windows.

Run through `diagrams.py export`, or `diagrams.py check` for the checks
alone.
"""

import os
import pathlib
import platform
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from dark import write_dark
from layout import check_page
from settings import (
    CONTRAST_EXCEPTIONS, DEPLOY_COPIES, DOCS, EXPORT_WIDTH, FREE_FORM, LAYOUT_EXCEPTIONS,
    LIGHT_ONLY, LOGO_PAGES, LOGOS, REPO, SOURCE
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


def draw(drawio, source, number, target, form='png'):
    """Draw one page of a drawio file to a PNG or an SVG file.

    The SVG keeps the scale of the drawio file, so the layout check can
    compare its lines with the cells.
    """
    width = ['--width', str(EXPORT_WIDTH)] if form == 'png' else []
    # drawio numbers pages from 1.
    subprocess.run([drawio, '-x', '-f', form, '--theme', 'light', *width,
                    '-p', str(number), '-o', str(target), str(source)],
                   check=True, capture_output=True)


def check_layout(drawio, scratch):
    """Stop the export when a placed page has an unlisted layout problem."""
    problems = []
    for number, diagram in enumerate(ET.parse(SOURCE).getroot().iter('diagram'), start=1):
        name = diagram.get('name')
        if target_of(name):
            svg = scratch / f'page-{number}.svg'
            draw(drawio, SOURCE, number, svg, form='svg')
            problems += check_page(diagram, svg.read_text(encoding='utf-8'),
                                   connectors=name not in FREE_FORM)
    unlisted = [problem for problem in problems if problem[:2] not in LAYOUT_EXCEPTIONS]
    for page, cell, problem in unlisted:
        print(f'layout on {page}, cell {cell}: {problem}')
    if unlisted:
        raise SystemExit(f'{len(unlisted)} layout problems, fix them in drawio '
                         'or list them in LAYOUT_EXCEPTIONS')
    print('every placed page meets the layout rules')


def located_drawio():
    """The drawio binary, or a stop with the reason when it is missing."""
    drawio = find_drawio()
    if not pathlib.Path(drawio).exists():
        raise SystemExit(f'drawio not found at {drawio}, set DRAWIO')
    print(f'using {drawio}')
    return drawio


def check_all():
    """Run the contrast and the layout checks without drawing any image."""
    drawio = located_drawio()
    with tempfile.TemporaryDirectory() as scratch:
        check_contrast(write_dark(SOURCE, pathlib.Path(scratch) / 'dark.drawio'))
        check_layout(drawio, pathlib.Path(scratch))


def export_all():
    """Check, export every placed page, then copy images into the packages and pages."""
    drawio = located_drawio()
    names = [page.get('name') for page in ET.parse(SOURCE).getroot().iter('diagram')]
    with tempfile.TemporaryDirectory() as scratch:
        dark = pathlib.Path(scratch) / 'dark.drawio'
        check_contrast(write_dark(SOURCE, dark))
        check_layout(drawio, pathlib.Path(scratch))
        for number, name in enumerate(names, start=1):
            target = target_of(name)
            if target is None:
                print(f'skipped page {number}, {name}')
                continue
            draw(drawio, SOURCE, number, target)
            print(f'wrote {target.relative_to(REPO)}')
            if dark_target(target):
                draw(drawio, dark, number, dark_target(target))
                print(f'wrote {dark_target(target).relative_to(REPO)}')
    copy_to_packages()
    copy_logos()
