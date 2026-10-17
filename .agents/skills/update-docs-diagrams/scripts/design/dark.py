"""Make the dark variant of a drawio file for the slate scheme of the site.
"""

import base64
import re
import xml.etree.ElementTree as ET

from config import (
    DARK_LETTERING, DARK_TEXT, LIGHT_BLUE_LINE, LIGHT_LINE, LIGHT_TEXT, SLATE, WHITE,
    WHITE_VERSIONS,
)
from design.colour import contrast, hex_of, LINE_MINIMUM, luminance, mix, TEXT_MINIMUM
from drawio.style import dump_style, kind, parse_style, plain_text, svg_data


# The colour of text written into a label, and not a background-color.
COLOUR_IN_LABEL = re.compile(r'((?<![-\w])color\s*[:=]\s*"?\s*)(#[0-9a-fA-F]{6})', re.I)


def dark_fill(colour):
    """A light fill becomes a dark one that keeps its hue."""
    return mix(colour, 0.2) if luminance(colour) > 0.35 else colour


def dark_line(colour):
    """A dark line becomes light, blue lines the cyan of the mark."""
    if luminance(colour) >= 0.3:
        return colour
    red, blue = int(colour[1:3], 16), int(colour[5:7], 16)
    return LIGHT_BLUE_LINE if blue > red + 40 else LIGHT_LINE


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
    ground = SLATE
    # Text is judged hidden against the ground it is drawn on: its own fill
    # when it has one, or the white page.
    old_ground = hex_of(style.get('fillColor'), WHITE) or WHITE
    # A text cell names no fill, except 'default', which drawio paints white.
    named = style.get('fillColor')
    fill = hex_of(named, WHITE if what == 'shape' or named == 'default' else None)
    if not fill:
        return ground, old_ground
    if what == 'text' and named == 'default':
        # A text box filled to mask a line on the page takes the dark page.
        style['fillColor'] = SLATE
        return SLATE, old_ground
    borderless_dark = style.get('strokeColor') == 'none' and luminance(fill) < 0.3
    if what == 'shape' and (is_icon(style) or borderless_dark):
        # An icon, or a dark bar with no border, is drawn in its fill, so it
        # turns light like a line. The label of a bar sits on that fill.
        style['fillColor'] = dark_line(fill)
        return (ground if is_icon(style) else style['fillColor']), old_ground
    style['fillColor'] = ground = dark_fill(fill)
    return ground, old_ground


def dark_text(ground, old_text, old_ground):
    """The text colour on a new ground, keeping hidden text hidden."""
    if old_ground and contrast(old_text, old_ground) < 1.5:
        # Text drawn in the colour of its ground was hidden on purpose, such
        # as a name under a logo that already spells it. It stays hidden.
        return ground
    # The one with the higher contrast. A mid-tone fill kept from the light
    # image may not reach 4.5 to 1 with either.
    return max((LIGHT_TEXT, DARK_TEXT), key=lambda colour: contrast(colour, ground))


def low_contrast(cell, style, ground, hidden):
    """The ways one dark cell falls short of the contrast minimums."""
    found = []
    text = style.get('fontColor')
    if plain_text(cell.get('value')) and not hidden:
        ratio = contrast(text, ground)
        if ratio < TEXT_MINIMUM:
            found.append(f'text {ratio:.1f} to 1')
    stroke = hex_of(style.get('strokeColor'), None)
    # Lines and box borders are judged against the page around them.
    if stroke and (cell.get('edge') == '1' or cell.get('vertex') == '1'):
        ratio = contrast(stroke, SLATE)
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
    # A label background is the ground behind the label: 'default' is the
    # page, and a colour is the fill of the box behind it, darkened the same.
    ground = style.get('labelBackgroundColor')
    if ground == 'default':
        style['labelBackgroundColor'] = SLATE
    elif hex_of(ground, None):
        style['labelBackgroundColor'] = dark_fill(hex_of(ground, None))


SVG_IMAGE = re.compile(r'(image=data:image/svg\+xml,)([A-Za-z0-9+/=]+)')


SVG_FILL = re.compile(r'(fill[=:]\s*"?)(#[0-9a-fA-F]{6})')


def light_svg(image):
    """An embedded SVG drawn only in dark colours, redrawn light like a line.

    An icon whose every colour falls below the line minimum on the slate
    page, such as the navy wind turbines, would vanish there. An SVG with any
    colour that stands out, such as a brand blue, is left as it is.
    """
    def relight(match):
        svg = base64.b64decode(match.group(2)).decode('utf-8')
        fills = {colour.lower() for _, colour in SVG_FILL.findall(svg)}
        if not fills or any(contrast(colour, SLATE) >= LINE_MINIMUM for colour in fills):
            return match.group(0)
        svg = SVG_FILL.sub(lambda m: m.group(1) + dark_line(m.group(2).lower()), svg)
        return match.group(1) + base64.b64encode(svg.encode('utf-8')).decode('ascii')
    return SVG_IMAGE.sub(relight, image)


def light_image(image, swaps):
    """An image style with its logos in their white versions and dark icons lit."""
    for logo, white in swaps:
        image = image.replace(logo, white)
    return light_svg(image)


def dark_cell(cell, swaps):
    """Turn one cell into its dark variant, and return its contrast failures."""
    style = parse_style(cell.get('style'))
    what = role(style, cell)
    if what == 'group':
        return []
    if what == 'image':
        image = light_image(dump_style(style), swaps)
        # A logo with dark lettering and no white version gets a light plate.
        if any(mark in image for mark in DARK_LETTERING):
            image += f'imageBackground={LIGHT_TEXT};'
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
        model.set('background', SLATE)
        for cell in model.iter('mxCell'):
            if cell.get('style') is not None:
                failures += [(page.get('name'), cell.get('id'), problem)
                             for problem in dark_cell(cell, swaps)]
    tree.write(target, encoding='utf-8')
    return failures
