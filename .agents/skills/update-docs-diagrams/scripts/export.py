"""Check every placed page, then export it, light and dark.

Before it draws anything, the export checks the dark variant against the
contrast minimums and every placed page against the layout rules, and stops on
a problem not listed in config. Every page under `docs/` is exported light and,
unless it is in LIGHT_ONLY, dark. The copies in DEPLOY_COPIES and the logos
beside the installation pages are then written from their sources.

The drawio binary is taken from the DRAWIO environment variable, then from
drawio on the PATH, then from the default install location on macOS and
Windows.
"""

import os
import pathlib
import platform
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from config import (
    BORDER, CONTRAST_EXCEPTIONS, DEPLOY_COPIES, DOCS, EXPORT_WIDTH, FREE_FORM,
    LAYOUT_EXCEPTIONS, LOGO_PAGES, LOGOS, REPO, SOURCE,
)
from design.dark import write_dark
from drawio.files import dark_target, target_of
from layout.check import check_page


# Where the drawio desktop installer puts the binary on each system.
DRAWIO_INSTALLED = {
    'Darwin': '/Applications/draw.io.app/Contents/MacOS/draw.io',
    'Windows': r'C:\Program Files\draw.io\draw.io.exe',
}


def find_drawio():
    """The drawio binary: DRAWIO, then drawio on the PATH, then the installer's place."""
    return (os.environ.get('DRAWIO') or shutil.which('drawio')
            or DRAWIO_INSTALLED.get(platform.system(), 'drawio'))


def has_dark_image(page):
    """Whether a page is exported with a dark variant: placed under docs/, not LIGHT_ONLY."""
    target = target_of(page)
    return bool(target and dark_target(target))


def stop_on(problems, exceptions, what, hint):
    """Print the problems not listed as exceptions, and stop when there are any."""
    unlisted = [problem for problem in problems if problem[:2] not in exceptions]
    for page, cell, problem in unlisted:
        print(f'{what} on {page}, cell {cell}: {problem}')
    if unlisted:
        raise SystemExit(f'{len(unlisted)} {what} problems, {hint}')


def check_contrast(failures):
    """Stop the export on an unlisted contrast failure of a page with a dark image.

    Pages under deploy/ and LIGHT_ONLY pages have no dark image, so their
    dark cells are not judged.
    """
    failures = [failure for failure in failures if has_dark_image(failure[0])]
    stop_on(failures, CONTRAST_EXCEPTIONS, 'contrast',
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
        for package_copy in copies:
            shutil.copyfile(DOCS / source, REPO / package_copy)
            print(f'copied {source} to {package_copy}')


def draw(drawio, source, number, target, form='png'):
    """Draw one page of a drawio file to a PNG or an SVG file.

    The SVG keeps the scale of the drawio file, so the layout check can
    compare its lines with the cells.
    """
    size = ['--width', str(EXPORT_WIDTH), '--border', str(BORDER)] if form == 'png' else []
    # drawio numbers pages from 1.
    result = subprocess.run([drawio, '-x', '-f', form, '--theme', 'light', *size,
                             '-p', str(number), '-o', str(target), str(source)],
                            check=False, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f'drawio could not export page {number}: {result.stderr.strip()}')


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
    stop_on(problems, LAYOUT_EXCEPTIONS, 'layout',
            'fix them in drawio or list them in LAYOUT_EXCEPTIONS')
    print('every placed page meets the layout rules')


def located_drawio():
    """The drawio binary, or a stop with the reason when it is missing."""
    drawio = find_drawio()
    # A file, since the drawio/ package beside this script is a folder with the
    # same name as the bare `drawio` fallback.
    if not pathlib.Path(drawio).is_file():
        raise SystemExit(f'drawio not found at {drawio}, set DRAWIO')
    print(f'using {drawio}')
    return drawio


def check_all():
    """Run the contrast and the layout checks without drawing any image."""
    with tempfile.TemporaryDirectory() as scratch:
        check_contrast(write_dark(SOURCE, pathlib.Path(scratch) / 'dark.drawio'))
        check_layout(located_drawio(), pathlib.Path(scratch))


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
