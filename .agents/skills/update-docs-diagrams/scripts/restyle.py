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
a label looks the same in a small diagram and a large one. The step can run
again on its own output and changes nothing the second time.

Run through `diagrams.py restyle <input.drawio> <output.drawio>`.
"""

import xml.etree.ElementTree as ET

import colours as c
from drawio import (
    Page, clean_label, dump_style, kind, number, parse_style, plain_text, svg_image
)
from settings import LOCKUP, MARK, NO_MARK

LINE_PX = 1.5
HEAVY_PX = 3
BOUNDARY_PX = 2
RADIUS_PX = 8
MARK_PX = 32
INSET_PX = 8

# Labels that name a region of a diagram, the only text drawn in bold.
TITLES = {
    'Generic', 'Construction / Buildings', 'Other domains', 'Common Services',
    'Web Interface', 'Workspace', 'Digital Twin Automation Layer',
    'Domain-specific extensions', 'Digital Twin as a Service (DTaaS)',
}

# Strokes in a blue or turquoise become primary, every other stroke grey 700.
BLUE = {c.PRIMARY, c.PRIMARY_DARK, c.ACCENT, c.ACCENT_DARK, c.MARK_ACCENT}

# The forward-auth middleware has one size on every page, in drawio units.
FORWARD_AUTH = {'width': 82, 'height': 47}

USER_ICON = ('html=1;shape=mxgraph.ios7.icons.user;verticalLabelPosition='
             'bottom;verticalAlign=top;align=center;dashed=0;shadow=0;')


def stroke(colour):
    """Map a stroke colour to primary or grey 700."""
    if colour in (None, 'none'):
        return colour
    return c.PRIMARY if colour.lower() in BLUE else c.GREY_700


def flatten(style):
    """Draw a see-through fill as the solid colour it shows on white."""
    opacity = float(style.pop('opacity', 100))
    fill = style.get('fillColor')
    if fill and fill.startswith('#') and opacity < 100:
        style['fillColor'] = c.blend(fill.lower(), opacity)
    return style.get('fillColor')


def style_edge(style, page):
    """Give every connector one style, and the highlighted ones a heavy line."""
    # The forward-auth arrow was turquoise. It stays the one heavy arrow,
    # now in primary, which reaches the contrast floor.
    heavy = (style.get('strokeColor') or '').lower() in (c.ACCENT, c.PRIMARY)
    style['strokeColor'] = c.PRIMARY if heavy else c.GREY_700
    style['strokeWidth'] = number(page.units(HEAVY_PX if heavy else LINE_PX))
    style.pop('opacity', None)
    for end in ('startArrow', 'endArrow'):
        if style.get(end) not in (None, 'none'):
            style[end] = 'classic'


def style_shape(style, what, page, boundary):
    """Set the border of a box or a stencil, and the corner of a box."""
    style['strokeColor'] = stroke(style.get('strokeColor', c.GREY_700))
    pixels = BOUNDARY_PX if boundary else LINE_PX
    style['strokeWidth'] = number(page.units(pixels))
    if what == 'box':
        style.update(rounded='1', absoluteArcSize='1',
                     arcSize=number(page.units(RADIUS_PX)))


def style_text(style, cell, page):
    """Set the font, size, weight and colour of a label."""
    fill = flatten(style)
    label = cell.get('value') or ''
    style.pop('fontStyle', None)
    if not label:
        return
    ground = fill if fill and fill.startswith('#') else c.WHITE
    dark = c.luminance(ground) < 0.2
    candidates = [c.WHITE] if dark else [c.GREY_700, c.PRIMARY_DARK]
    style['fontColor'] = c.text_colour(ground, candidates)
    style['fontFamily'] = 'Inter'
    if plain_text(label) in TITLES:
        style['fontStyle'] = '1'
    if page.min_font():
        size = max(int(float(style.get('fontSize', 12))), page.min_font())
        style['fontSize'] = str(size)
    cell.set('value', clean_label(label, page.min_font()))


def forward_auth(style, cell):
    """Draw the forward-auth middleware the same way on every page."""
    style.pop(('text',), None)
    style.update(fillColor=c.PRIMARY_TINT, strokeColor=c.PRIMARY,
                 whiteSpace='wrap', html='1')
    box = cell.find('mxGeometry')
    for side, size in (('x', 'width'), ('y', 'height')):
        target = FORWARD_AUTH[size]
        centre = float(box.get(side, 0)) + float(box.get(size)) / 2
        box.set(side, number(centre - target / 2))
        box.set(size, str(target))


def restyle_cell(cell, page, boundary):
    """Apply every rule that concerns a single cell."""
    style = parse_style(cell.get('style'))
    what = kind(style, cell)
    if 'forward-auth' in plain_text(cell.get('value')):
        forward_auth(style, cell)
        what = 'box'
    if what == 'text' and style.get('strokeColor', 'none') != 'none':
        what = 'box'
    if what == 'edge':
        style_edge(style, page)
    elif what in ('box', 'stencil'):
        style_shape(style, what, page, cell is boundary)
    if what not in ('group', 'edge'):
        style_text(style, cell, page)
    cell.set('style', dump_style(style))


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
             if plain_text(cell.get('value')).startswith('Note:')]
    for cell in notes:
        page.root.remove(cell)


def find_boundary(page):
    """Return the largest box on the page, the DTaaS system boundary."""
    def area(cell):
        x, y, right, bottom = page.absolute(cell)
        return (right - x) * (bottom - y)
    boxes = [cell for cell in page.root if cell.get('vertex') == '1'
             and kind(parse_style(cell.get('style')), cell) == 'box'
             and page.absolute(cell)]
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


def restyle_page(diagram):
    """Apply every rule to one page."""
    page = Page(diagram)
    remove_notes(page)
    replace_people(page)
    boundary = find_boundary(page)
    styled = [cell for cell in page.root if cell.get('style') is not None]
    for cell in styled:
        restyle_cell(cell, page, boundary)
    # A page that already carries the full lockup as its title needs no mark.
    lockup = svg_image(LOCKUP).split(',', 1)[1]
    marked = diagram.get('name') not in NO_MARK
    if marked and boundary is not None and lockup not in ET.tostring(page.root, 'unicode'):
        place_mark(page, boundary)
