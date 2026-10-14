"""Apply the design rules of the documentation to every diagram page.

The rules, from `docs/assets/brand/README.md` and the WCAG contrast floors:

- Lines, arrows and borders are primary or grey 700, at least 3 to 1 on
  their ground. Turquoise, cyan and the tints are only fills.
- Text is Inter, never italic, bold only for a title, at least 4.5 to 1.
- Text is at least 14 pixels at the width the documentation shows a page.
- One person icon, one forward-auth box, one box style, one arrow style.
- A note written into the picture goes into the page text instead.
- The DTaaS mark sits at the top right corner of the DTaaS boundary.

Sizes are written in displayed pixels and converted per page, so a line or
a label looks the same in a small diagram and a large one. The script can run
again on its own output and changes nothing the second time.

Usage: python3 restyle_drawio.py <input.drawio> <output.drawio>
"""

import base64
import math
import xml.etree.ElementTree as ET

import drawio_style as ds
from restyle_cells import kind, number, restyle
from palette import REPO

MARK = REPO / 'docs/assets/brand/dtaas-mark.svg'
LOCKUP = REPO / 'docs/assets/brand/dtaas-logo-full.svg'

# The narrowest content column of the documentation theme, in CSS pixels.
DISPLAY_WIDTH = 700
MIN_TEXT_PX = 14
MARK_PX = 32
INSET_PX = 8

# Pages that draw a concept and not the DTaaS system, so their largest box is
# not the DTaaS boundary and they carry no mark.
NO_MARK = {
    'developer/system/architecture.png',
    'developer/system/research-overview/devops.png',
    'developer/system/research-overview/dt-assets-relationship.png',
    'developer/system/research-overview/dtaas-class-instance.png',
    'developer/system/research-overview/federated-dtaas.png',
    'admin/servers/lib/file-system-layout.png',
    'user/digital-twins/asset-relationship.png',
    'user/servers/lib/author.png',
    'developer/system/current-status-developer.png',
    'developer/system/research-overview/implementation-status.png',
    'developer/system/research-overview/lifecycle-phases.png',
    'developer/system/research-overview/shm-dt-workflow.png',
    'developer/system/research-overview/system-architecture-c4.png',
    'developer/system/research-overview/user-interaction-in-federated-DTaaS.png',
    'developer/technical-concepts/oauth/design-sequence.png',
    'developer/technical-concepts/oauth/oauth2-workflow.png',
    'user/servers/lib/library-assets.png',
}

USER_ICON = ('html=1;shape=mxgraph.ios7.icons.user;verticalLabelPosition='
             'bottom;verticalAlign=top;align=center;dashed=0;shadow=0;')


def svg_image(path):
    """Return the drawio style of an image cell that shows an SVG file."""
    data = base64.b64encode(path.read_bytes()).decode('ascii')
    return f'shape=image;aspect=fixed;image=data:image/svg+xml,{data};'


class Page:
    """One diagram page, with the scale its sizes are converted by."""

    def __init__(self, diagram):
        self.name = diagram.get('name')
        self.root = diagram.find('mxGraphModel/root')
        self.cells = {c.get('id'): c for c in self.root}
        boxes = [self.absolute(c) for c in self.root if c.get('vertex') == '1']
        boxes = [b for b in boxes if b]
        self.width = max(b[2] for b in boxes) - min(b[0] for b in boxes)
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


def replace_people(page):
    """Draw every person with the one user icon."""
    for cell in page.root:
        style = cell.get('style') or ''
        if 'man_woman' not in style and not style.startswith('shape=actor'):
            continue
        box = cell.find('mxGeometry')
        width, height = float(box.get('width')), float(box.get('height'))
        side = min(width, height) * 0.75
        box.set('x', number(float(box.get('x', 0)) + (width - side) / 2))
        box.set('y', number(float(box.get('y', 0)) + (height - side) / 2))
        box.set('width', number(side))
        box.set('height', number(side))
        cell.set('style', USER_ICON)


def remove_notes(page):
    """Remove notes written into the picture, which the page text carries."""
    notes = [cell for cell in page.root
             if ds.plain_text(cell.get('value')).startswith('Note:')]
    for cell in notes:
        page.root.remove(cell)


def find_boundary(page):
    """Return the largest box on the page, the DTaaS system boundary."""
    def area(cell):
        x, y, right, bottom = page.absolute(cell)
        return (right - x) * (bottom - y)
    boxes = [c for c in page.root if c.get('vertex') == '1'
             and kind(ds.parse_style(c.get('style')), c) == 'box'
             and page.absolute(c)]
    return max(boxes, key=area, default=None)


def place_mark(page, boundary):
    """Put the DTaaS mark at the top right corner of the boundary."""
    mark_id = f"{boundary.get('id')}-dtaas-mark"
    mark = page.cells.get(mark_id)
    if mark is None:
        mark = ET.SubElement(page.root, 'mxCell', {
            'id': mark_id, 'value': '', 'vertex': '1'})
        ET.SubElement(mark, 'mxGeometry', {'as': 'geometry'})
    mark.set('parent', boundary.get('parent'))
    mark.set('style', svg_image(MARK))
    frame, size = boundary.find('mxGeometry'), page.units(MARK_PX)
    inset = page.units(INSET_PX)
    right = float(frame.get('x', 0)) + float(frame.get('width'))
    mark.find('mxGeometry').attrib.update(
        x=number(right - size - inset), width=number(size),
        y=number(float(frame.get('y', 0)) + inset), height=number(size))


def restyle_page(diagram, lockup):
    """Apply every rule to one page."""
    page = Page(diagram)
    remove_notes(page)
    replace_people(page)
    boundary = find_boundary(page)
    styled = [cell for cell in page.root if cell.get('style') is not None]
    for cell in styled:
        restyle(cell, page, boundary)
    # A page that already carries the full lockup as its title needs no mark.
    marked = diagram.get('name') not in NO_MARK
    if marked and boundary is not None and lockup not in ET.tostring(page.root, 'unicode'):
        place_mark(page, boundary)


def main():
    """Restyle the input file and write the result."""
    lockup = svg_image(LOCKUP).split(',', 1)[1]
    target = ds.rewrite_file(__doc__, lambda d: restyle_page(d, lockup))
    print(f'wrote {target}')


if __name__ == '__main__':
    main()
