"""Read and write drawio files, and place a page in the documentation.

A page named after a path under `docs/` is exported to that path, and a page
named after a path under `deploy/` there. Any other page is skipped.
"""

import math
import pathlib
import xml.etree.ElementTree as ET

from config import DISPLAY_WIDTH, DOCS, LIGHT_ONLY, MIN_TEXT_PX, REPO


# A page name is a path, and a page brought in from another drawio file can
# carry any name, so every target must stay inside these two folders.
ALLOWED = (DOCS.resolve(), (REPO / 'deploy').resolve())


def drawio_path(argument):
    """Resolve a file named on the command line.

    It must be a .drawio file inside the current directory, so a mistyped or
    crafted argument cannot read or overwrite a file elsewhere.
    """
    base = pathlib.Path.cwd().resolve()
    path = pathlib.Path(argument).resolve()
    if path.suffix != '.drawio' or not path.is_relative_to(base):
        raise SystemExit(f'{path} must be a .drawio file under {base}')
    return path


def rewrite_pages(source, target, change):
    """Apply a change to every page of a drawio file and write the result."""
    tree = ET.parse(source)
    for diagram in tree.getroot().iter('diagram'):
        change(diagram)
    write_drawio(tree, target)


def write_drawio(tree, target):
    """Write a drawio file one element per line, with its page count and a last newline."""
    root = tree.getroot()
    root.set('pages', str(len(root.findall('diagram'))))
    ET.indent(tree, space='  ')
    pathlib.Path(target).write_text(ET.tostring(root, encoding='unicode') + '\n', encoding='utf-8')


class Page:
    """One diagram page, with the scale its sizes are converted by.

    Sizes are written in displayed pixels and converted per page, so a line
    or a label looks the same in a small diagram and a large one.
    """

    def __init__(self, diagram):
        self.name = diagram.get('name')
        self.root = diagram.find('mxGraphModel/root')
        self.cells = {c.get('id'): c for c in self.root}
        boxes = [self.absolute(c) for c in self.root if c.get('vertex') == '1']
        boxes = [b for b in boxes if b]
        # A page with no boxes is drawn at the column width.
        width = max(b[2] for b in boxes) - min(b[0] for b in boxes) if boxes else 0
        self.width = width or DISPLAY_WIDTH
        self.units_per_px = self.width / DISPLAY_WIDTH
        self.placed = self.name.endswith('.png')

    def units(self, pixels):
        """Convert displayed pixels to drawio units, in quarter steps."""
        return round(pixels * self.units_per_px * 4) / 4

    def min_font(self):
        """Return the smallest font size, in units, a label may have."""
        if not self.placed:
            return 0
        return max(12, math.ceil(MIN_TEXT_PX * self.units_per_px))

    def absolute(self, cell):
        """Return (x, y, right, bottom) of a vertex in page coordinates."""
        box = cell.find('mxGeometry')
        if box is None or box.get('width') is None:
            return None
        x, y = float(box.get('x', 0)), float(box.get('y', 0))
        parent = self.cells.get(cell.get('parent'))
        while parent is not None and parent.find('mxGeometry') is not None:
            x += float(parent.find('mxGeometry').get('x', 0))
            y += float(parent.find('mxGeometry').get('y', 0))
            parent = self.cells.get(parent.get('parent'))
        return x, y, x + float(box.get('width')), y + float(box.get('height'))


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
