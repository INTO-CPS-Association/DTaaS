"""The rules of `restyle_drawio.py` that concern one cell at a time.

Each function takes the parsed style of a cell and the page it is on. Sizes
are written in displayed pixels and converted with `page.units`, so a line
looks the same in a small diagram and a large one.
"""

import drawio_style as ds
from palette import (
    ACCENT, ACCENT_DARK, GREY_700, MARK_ACCENT, PRIMARY, PRIMARY_DARK, PRIMARY_TINT
)

LINE_PX = 1.5
HEAVY_PX = 3
BOUNDARY_PX = 2
RADIUS_PX = 8

# Labels that name a region of a diagram, the only text drawn in bold.
TITLES = {
    'Generic', 'Construction / Buildings', 'Other domains', 'Common Services',
    'Web Interface', 'Workspace', 'Digital Twin Automation Layer',
    'Domain-specific extensions', 'Digital Twin as a Service (DTaaS)',
}

# Strokes in a blue or turquoise become primary, every other stroke grey 700.
BLUE = {PRIMARY, PRIMARY_DARK, ACCENT, ACCENT_DARK, MARK_ACCENT}

# The forward-auth middleware has one size on every page, in drawio units.
FORWARD_AUTH = {'width': 82, 'height': 47}


def kind(style, cell):
    """Name what a cell draws: edge, group, image, text, stencil or box."""
    if cell.get('edge') == '1':
        return 'edge'
    for word in ('group', 'image', 'text'):
        if (word,) in style:
            return word
    if style.get('shape') == 'image':
        return 'image'
    return 'stencil' if 'shape' in style or ('ellipse',) in style else 'box'


def stroke(colour):
    """Map a stroke colour to primary or grey 700."""
    if colour in (None, 'none'):
        return colour
    return PRIMARY if colour.lower() in BLUE else GREY_700


def flatten(style):
    """Draw a see-through fill as the solid colour it shows on white."""
    opacity = float(style.pop('opacity', 100))
    fill = style.get('fillColor')
    if fill and fill.startswith('#') and opacity < 100:
        style['fillColor'] = ds.blend(fill.lower(), opacity)
    return style.get('fillColor')


def number(value):
    """Write a size the way drawio writes it, without a trailing .0."""
    return f'{value:g}'


def style_edge(style, page):
    """Give every connector one style, and the highlighted ones a heavy line."""
    # The forward-auth arrow was turquoise. It stays the one heavy arrow,
    # now in primary, which reaches the contrast floor.
    heavy = (style.get('strokeColor') or '').lower() in (ACCENT, PRIMARY)
    style['strokeColor'] = PRIMARY if heavy else GREY_700
    style['strokeWidth'] = number(page.units(HEAVY_PX if heavy else LINE_PX))
    style.pop('opacity', None)
    for end in ('startArrow', 'endArrow'):
        if style.get(end) not in (None, 'none'):
            style[end] = 'classic'


def style_shape(style, what, page, boundary):
    """Set the border of a box or a stencil, and the corner of a box."""
    style['strokeColor'] = stroke(style.get('strokeColor', GREY_700))
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
    ground = fill if fill and fill.startswith('#') else ds.WHITE
    dark = ds.luminance(ground) < 0.2
    candidates = [ds.WHITE] if dark else [GREY_700, PRIMARY_DARK]
    style['fontColor'] = ds.text_colour(ground, candidates)
    style['fontFamily'] = 'Inter'
    if ds.plain_text(label) in TITLES:
        style['fontStyle'] = '1'
    if page.min_font():
        size = max(int(float(style.get('fontSize', 12))), page.min_font())
        style['fontSize'] = str(size)
    cell.set('value', ds.clean_label(label, page.min_font()))


def forward_auth(style, cell):
    """Draw the forward-auth middleware the same way on every page."""
    style.pop(('text',), None)
    style.update(fillColor=PRIMARY_TINT, strokeColor=PRIMARY,
                 whiteSpace='wrap', html='1')
    box = cell.find('mxGeometry')
    for side, size in (('x', 'width'), ('y', 'height')):
        target = FORWARD_AUTH[size]
        centre = float(box.get(side, 0)) + float(box.get(size)) / 2
        box.set(side, number(centre - target / 2))
        box.set(size, str(target))


def restyle(cell, page, boundary):
    """Apply every rule that concerns a single cell."""
    style = ds.parse_style(cell.get('style'))
    what = kind(style, cell)
    if 'forward-auth' in ds.plain_text(cell.get('value')):
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
    cell.set('style', ds.dump_style(style))
