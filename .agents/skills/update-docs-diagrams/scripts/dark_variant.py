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

Used by export_diagrams.py, which exports the result next to each light image
with a -dark suffix.
"""

import base64
import re
import xml.etree.ElementTree as ET

import drawio_style as ds
from palette import REPO

# The page of Material's slate scheme, hsl(220, 15%, 14%) with the hue the
# site sets, so the image blends into the page. test_theme_colours.py checks it.
SLATE = '#1e2229'
LIGHT_TEXT = '#e8ecf3'
DARK_TEXT = '#1e2229'
LIGHT_LINE = '#a9b3c6'
LIGHT_BLUE_LINE = '#8cc8e6'

# Each logo drawn with dark text, and the white version its owner publishes.
ASSETS = REPO / '.agents/skills/update-docs-diagrams/assets'
WHITE_VERSIONS = [
    (REPO / 'docs/assets/brand/dtaas-logo-full.svg',
     REPO / 'docs/assets/brand/dtaas-logo-full-white.svg'),
    (ASSETS / 'gitlab-logo-100-rgb.svg', ASSETS / 'gitlab-logo-200-rgb.svg'),
]
# Minimum WCAG contrast ratios, for text and for lines and borders.
TEXT_MINIMUM = 4.5
LINE_MINIMUM = 3.0
# The colour of text written into a label, and not a background-color.
COLOUR_IN_LABEL = re.compile(r'((?<![-\w])color\s*[:=]\s*"?\s*)(#[0-9a-fA-F]{6})', re.I)
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')


def hex_of(value, default):
    """A #rrggbb colour from a drawio value, or the default for 'default'."""
    if value in (None, 'default'):
        return default
    return value.lower() if HEX.match(value or '') else None


def mix(colour, share):
    """The slate page with a share of a colour mixed in."""
    channels = [round(int(SLATE[i:i + 2], 16) * (1 - share) + int(colour[i:i + 2], 16) * share)
                for i in (1, 3, 5)]
    return '#' + ''.join(f'{c:02x}' for c in channels)


def dark_fill(colour):
    """A light fill becomes a dark one that keeps its hue."""
    return mix(colour, 0.2) if ds.luminance(colour) > 0.35 else colour


def dark_line(colour):
    """A dark line becomes light, blue lines the cyan of the mark."""
    if ds.luminance(colour) >= 0.3:
        return colour
    red, blue = int(colour[1:3], 16), int(colour[5:7], 16)
    return LIGHT_BLUE_LINE if blue > red + 40 else LIGHT_LINE


def is_icon(style):
    """Whether a shape is a drawio stencil icon, drawn in its fill colour."""
    return str(style.get('shape', '')).startswith('mxgraph.')


def kind(style, cell):
    """What a cell draws: edge, group, image, text or shape."""
    if cell.get('edge') == '1':
        return 'edge'
    if ('group',) in style:
        return 'group'
    if style.get('shape') == 'image' or 'image' in style:
        return 'image'
    if ('text',) in style:
        return 'text'
    return 'shape'


def dark_ground(style, what):
    """Darken the fill of a cell and return its new and its old ground."""
    ground = SLATE
    old_ground = hex_of(style.get('fillColor'), ds.WHITE) if what == 'shape' else ds.WHITE
    fill = hex_of(style.get('fillColor'), ds.WHITE if what == 'shape' else None)
    if not fill:
        return ground, old_ground
    if what == 'shape' and is_icon(style):
        # An icon is drawn in its fill, so a dark one turns light like a line.
        if ds.luminance(fill) < 0.3:
            style['fillColor'] = dark_line(fill)
        return ground, old_ground
    style['fillColor'] = ground = dark_fill(fill)
    return ground, old_ground


def text_colour(ground, old_text, old_ground):
    """The text colour on a new ground, keeping hidden text hidden."""
    if old_ground and ds.contrast(old_text, old_ground) < 1.5:
        # Text drawn in the colour of its ground was hidden on purpose, such
        # as a name under a logo that already spells it. It stays hidden.
        return ground
    # The one with the higher contrast. A mid-tone fill kept from the light
    # image may not reach 4.5 to 1 with either.
    return max((LIGHT_TEXT, DARK_TEXT), key=lambda colour: ds.contrast(colour, ground))


def low_contrast(cell, style, ground, hidden):
    """The ways one dark cell falls short of the contrast minimums."""
    found = []
    text = style.get('fontColor')
    if ds.plain_text(cell.get('value')) and not hidden:
        ratio = ds.contrast(text, ground)
        if ratio < TEXT_MINIMUM:
            found.append(f'text {ratio:.1f} to 1')
    stroke = hex_of(style.get('strokeColor'), None)
    # Lines and box borders are judged against the page around them.
    if stroke and (cell.get('edge') == '1' or cell.get('vertex') == '1'):
        ratio = ds.contrast(stroke, SLATE)
        if ratio < LINE_MINIMUM:
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
    if 'labelBackgroundColor' in style and hex_of(style['labelBackgroundColor'], None):
        style['labelBackgroundColor'] = SLATE


def dark_cell(cell, swaps):
    """Turn one cell into its dark variant, and return its contrast failures."""
    style = ds.parse_style(cell.get('style'))
    what = kind(style, cell)
    if what == 'group':
        return []
    if what == 'image':
        image = ds.dump_style(style)
        for logo, white in swaps:
            image = image.replace(logo, white)
        cell.set('style', image)
        return []
    old_text = hex_of(style.get('fontColor'), '#000000') or '#000000'
    ground, old_ground = dark_ground(style, what)
    dark_details(style, what)
    text = text_colour(ground, old_text, old_ground)
    style['fontColor'] = text
    cell.set('style', ds.dump_style(style))
    if cell.get('value'):
        cell.set('value', COLOUR_IN_LABEL.sub(lambda m: m.group(1) + text, cell.get('value')))
    return low_contrast(cell, style, ground, hidden=text == ground)


def encoded(path):
    """The base64 form drawio keeps an embedded SVG in."""
    return base64.b64encode(path.read_bytes()).decode('ascii')


def write_dark(source, target):
    """Write the dark variant of a drawio file.

    Returns the cells below the contrast minimums, as (page name, cell id,
    what falls short) tuples.
    """
    tree = ET.parse(source)
    swaps = [(encoded(logo), encoded(white)) for logo, white in WHITE_VERSIONS]
    failures = []
    for page in tree.getroot().iter('diagram'):
        model = page.find('mxGraphModel')
        model.set('background', SLATE)
        for cell in model.iter('mxCell'):
            if cell.get('style') is not None:
                failures += [(page.get('name'), cell.get('id'), problem)
                             for problem in dark_cell(cell, swaps)]
    tree.write(target, encoding='utf-8')
    return failures
