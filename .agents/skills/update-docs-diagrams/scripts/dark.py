"""Make the dark variant of every diagram, for the slate scheme of the site.

The colours follow from their brightness, not from a table, so a new colour
in a diagram needs no change here:

- A light fill, including the white drawio draws when a shape names none,
  becomes the slate page mixed with a fifth of its own colour, so tints keep
  their hue. A dark fill stays.
- A dark line becomes light grey, or the cyan of the mark when it was blue.
- Text takes the light or the dark text colour, whichever reaches 4.5 to 1 on
  the fill it ends up on.
- A dark stencil icon, drawn in its fill colour, becomes light like a line.
- Text drawn in the colour of its ground, hidden on purpose, stays hidden.
- Every label below 4.5 to 1 and every line below 3 to 1 on its new ground
  is reported, so the export can refuse a variant that is hard to read.
- The DTaaS lockup and the GitLab logo, dark text drawn in an image, are
  swapped for their white versions. Raster logos are left as they are.

Used by export.py, which exports the result next to each light image
with a -dark suffix.
"""

import re
import xml.etree.ElementTree as ET

import colours as c
from drawio import dump_style, kind, parse_style, plain_text, svg_data
from settings import WHITE_VERSIONS

# The colour of text written into a label, and not a background-color.
COLOUR_IN_LABEL = re.compile(r'((?<![-\w])color\s*[:=]\s*"?\s*)(#[0-9a-fA-F]{6})', re.I)
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')


def hex_of(value, default):
    """A #rrggbb colour from a drawio value, or the default for 'default'."""
    if value in (None, 'default'):
        return default
    return value.lower() if HEX.match(value or '') else None


def dark_fill(colour):
    """A light fill becomes a dark one that keeps its hue."""
    return c.mix(colour, 0.2) if c.luminance(colour) > 0.35 else colour


def dark_line(colour):
    """A dark line becomes light, blue lines the cyan of the mark."""
    if c.luminance(colour) >= 0.3:
        return colour
    red, blue = int(colour[1:3], 16), int(colour[5:7], 16)
    return c.LIGHT_BLUE_LINE if blue > red + 40 else c.LIGHT_LINE


def is_icon(style):
    """Whether a shape is a drawio stencil icon, drawn in its fill colour."""
    return str(style.get('shape', '')).startswith('mxgraph.')


def role(style, cell):
    """What a cell is for the dark variant: edge, group, image, text or shape.

    Any cell that embeds an image counts as an image, whatever its shape,
    since its logo may have a white version to swap in.
    """
    what = kind(style, cell)
    if what in ('edge', 'group'):
        return what
    if style.get('shape') == 'image' or 'image' in style:
        return 'image'
    return 'text' if ('text',) in style else 'shape'


def dark_ground(style, what):
    """Darken the fill of a cell and return its new and its old ground."""
    ground = c.SLATE
    old_ground = hex_of(style.get('fillColor'), c.WHITE) if what == 'shape' else c.WHITE
    # A text cell names no fill, except 'default', which drawio paints white.
    named = style.get('fillColor')
    fill = hex_of(named, c.WHITE if what == 'shape' or named == 'default' else None)
    if not fill:
        return ground, old_ground
    if what == 'shape' and is_icon(style):
        # An icon is drawn in its fill, so a dark one turns light like a line.
        if c.luminance(fill) < 0.3:
            style['fillColor'] = dark_line(fill)
        return ground, old_ground
    style['fillColor'] = ground = dark_fill(fill)
    return ground, old_ground


def dark_text(ground, old_text, old_ground):
    """The text colour on a new ground, keeping hidden text hidden."""
    if old_ground and c.contrast(old_text, old_ground) < 1.5:
        # Text drawn in the colour of its ground was hidden on purpose, such
        # as a name under a logo that already spells it. It stays hidden.
        return ground
    # The one with the higher contrast. A mid-tone fill kept from the light
    # image may not reach 4.5 to 1 with either.
    return max((c.LIGHT_TEXT, c.DARK_TEXT), key=lambda colour: c.contrast(colour, ground))


def low_contrast(cell, style, ground, hidden):
    """The ways one dark cell falls short of the contrast minimums."""
    found = []
    text = style.get('fontColor')
    if plain_text(cell.get('value')) and not hidden:
        ratio = c.contrast(text, ground)
        if ratio < c.TEXT_MINIMUM:
            found.append(f'text {ratio:.1f} to 1')
    stroke = hex_of(style.get('strokeColor'), None)
    # Lines and box borders are judged against the page around them.
    if stroke and (cell.get('edge') == '1' or cell.get('vertex') == '1'):
        ratio = c.contrast(stroke, c.SLATE)
        if ratio < c.LINE_MINIMUM:
            found.append(f'line {ratio:.1f} to 1')
    return found


def dark_details(style, what):
    """Darken the gradient, the swimlane fill, the line and the label ground."""
    for key in ('gradientColor', 'swimlaneFillColor'):
        colour = hex_of(style.get(key), None)
        if colour:
            style[key] = dark_fill(colour)
    stroke = hex_of(style.get('strokeColor'), '#000000')
    if stroke and (what in ('shape', 'edge') or 'strokeColor' in style):
        style['strokeColor'] = dark_line(stroke)
    # A label background named 'default' is drawn white, like a hex one.
    if 'labelBackgroundColor' in style and hex_of(style['labelBackgroundColor'], c.WHITE):
        style['labelBackgroundColor'] = c.SLATE


def dark_cell(cell, swaps):
    """Turn one cell into its dark variant, and return its contrast failures."""
    style = parse_style(cell.get('style'))
    what = role(style, cell)
    if what == 'group':
        return []
    if what == 'image':
        image = dump_style(style)
        for logo, white in swaps:
            image = image.replace(logo, white)
        cell.set('style', image)
        return []
    old_text = hex_of(style.get('fontColor'), '#000000') or '#000000'
    ground, old_ground = dark_ground(style, what)
    dark_details(style, what)
    text = dark_text(ground, old_text, old_ground)
    style['fontColor'] = text
    cell.set('style', dump_style(style))
    if cell.get('value'):
        cell.set('value', COLOUR_IN_LABEL.sub(lambda m: m.group(1) + text, cell.get('value')))
    return low_contrast(cell, style, ground, hidden=text == ground)


def write_dark(source, target):
    """Write the dark variant of a drawio file.

    Returns the cells below the contrast minimums, as (page name, cell id,
    what falls short) tuples.
    """
    tree = ET.parse(source)
    swaps = [(svg_data(logo), svg_data(white)) for logo, white in WHITE_VERSIONS]
    failures = []
    for page in tree.getroot().iter('diagram'):
        model = page.find('mxGraphModel')
        model.set('background', c.SLATE)
        for cell in model.iter('mxCell'):
            if cell.get('style') is not None:
                failures += [(page.get('name'), cell.get('id'), problem)
                             for problem in dark_cell(cell, swaps)]
    tree.write(target, encoding='utf-8')
    return failures
