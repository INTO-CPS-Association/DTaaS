"""How the diagrams look, and where their parts sit.

How the diagrams look: theme colours, design rules, wording and dark variant.

The steps, in the order a new diagram goes through them:

- retheme maps the drawio default colours to the theme and puts the logo in
  place of the old wordmark.
- restyle applies the design rules of the documentation to every cell,
  including the wording (Title Case) and the label backgrounds.
- shrink scales the embedded raster logos down. It needs Pillow, which is
  imported only there, so every other step runs with the standard library.
- write_dark makes the dark variant for the slate scheme of the site.

The colour arithmetic all of them use, WCAG luminance and contrast, comes
first.

The second half of the file is the layout check. Each rule is a defect a
reader sees in the exported image and a review by eye can miss:

- A connector runs in horizontal and vertical segments, never on a slant.
- Two connectors never meet a box at one point from different directions.
  Branches of one trunk, which leave a box together, are allowed.
- A connector never passes behind a box that is not one of its ends.
- A label fits in its box. Loose text, a label beside its shape and the label
  of a connector cross neither the border of another box nor a picture, and
  loose text sits on no line unless its background masks it.

The connectors and the place of each label are read from the SVG drawio
exports, so a path is checked where drawio routes it. The width of a label is
estimated from the advance widths of Inter. Boxes come from the drawio file.
"""

# design.py reads drawio files through diagrams.py, which imports design.py
# only inside the functions that run a step, so the cycle is resolved at run
# time. The two halves are one file by choice, so it is long.
# pylint: disable=cyclic-import,too-many-lines

import base64
import io
import math
import re
import xml.etree.ElementTree as ET
from collections import Counter

from config import (
    ACCENT, ACCENT_DARK, COLOURS, DARK_LETTERING, DARK_TEXT, EXPORT_WIDTH, GREY_700,
    LIGHT_BLUE_LINE, LIGHT_LINE, LIGHT_TEXT, LOCKUP, MARK, MARK_ACCENT, NO_MARK, PRIMARY,
    PRIMARY_DARK, PRIMARY_TINT, RGB, SEQUENCE_DIAGRAMS, SLATE, WHITE, WHITE_VERSIONS,
)
from diagrams import (
    Page, clean_label, dump_style, kind, parse_style, plain_text, size_text, svg_data, svg_image,
)


# Minimum WCAG contrast ratios, for text and for lines and borders.
TEXT_MINIMUM = 4.5


LINE_MINIMUM = 3.0


def channels(colour):
    """The red, green and blue of a #rrggbb colour, from 0 to 255."""
    return [int(colour[i:i + 2], 16) for i in (1, 3, 5)]


def to_hex(values):
    """The #rrggbb colour of three channels from 0 to 255."""
    return '#' + ''.join(f'{round(c):02x}' for c in values)


def luminance(colour):
    """Return the WCAG relative luminance of a #rrggbb colour."""
    linear = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
              for c in (value / 255 for value in channels(colour))]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(first, second):
    """Return the WCAG contrast ratio of two #rrggbb colours."""
    high, low = sorted((luminance(first), luminance(second)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def blend(colour, opacity):
    """Mix a colour with white, as drawio draws it at an opacity in percent."""
    return to_hex(255 - (255 - c) * opacity / 100 for c in channels(colour))


def mix(colour, share):
    """The slate page with a share of a colour mixed in."""
    return to_hex(s * (1 - share) + c * share
                  for s, c in zip(channels(SLATE), channels(colour)))


def text_colour(fill, candidates):
    """Return the first candidate that reaches the text minimum on the fill."""
    for colour in candidates:
        if contrast(colour, fill) >= TEXT_MINIMUM:
            return colour
    raise ValueError(f'no text colour reaches {TEXT_MINIMUM} to 1 on {fill}')


# Short joining words, lower case unless a label starts with one.
MINOR = {'a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'into', 'of', 'on', 'or',
         'per', 'the', 'to', 'via', 'with'}


# Names written one way on every page, by their lower case form. systemd is
# written in lower case by its project.
SPELLING = {'gitlab': 'GitLab', 'webapp': 'WebApp', 'nodejs': 'Node.js', 'systemd': 'systemd',
            'authcode': 'authcode'}


LINE_BREAK = re.compile(r'<br|</?div|</?p[\s>]|\n', re.I)


# A word with any of these is code, a URL or a path, and keeps its case.
CODE = re.compile(r'[/:_@=.]\w|^\.|/$|[\'"]')


def title_word(word, first, line_start=False):
    """One word of a label in Title Case.

    A joining word that opens a line after the first keeps the case it was
    written in: "and DTs" continues the line above it, while "On premise"
    starts a description.
    """
    lead, core, tail = re.match(r'^([(\[]*)(.*?)([)\]\.,;:!?]*)$', word).groups()
    if core.lower() in SPELLING:
        return lead + SPELLING[core.lower()] + tail
    if not core or CODE.search(core) or any(c.isupper() for c in core[1:]) or core.isupper():
        return word
    if core.lower() in MINOR and line_start:
        return word
    if core.lower() in MINOR and not first and not lead:
        return lead + core.lower() + tail
    parts = [part[:1].upper() + part[1:] for part in core.split('-')]
    return lead + '-'.join(parts) + tail


def title_case(label):
    """A label, plain or HTML, with its words in Title Case.

    Only the text between tags changes. Each line is a title of its own, as
    a C4 box stacks a name, a type and a description, so the first word of
    every line is capitalised, except a joining word continuing the line
    above and the rest of a word broken with a hyphen, which stays as written.
    """
    first, line_start, broken, text = True, False, False, ''
    pieces = re.split(r'(<[^>]*>|&\w+;|&#\d+;|\n)', label or '')
    for index, piece in enumerate(pieces):
        if LINE_BREAK.match(piece) and text.strip():
            broken = text.rstrip().endswith('-')
            first = line_start = not broken
        if not piece or piece.startswith(('<', '&', '\n')):
            continue
        words = re.split(r'(\s+)', piece)
        for at, word in enumerate(words):
            if word.strip():
                words[at] = word if broken else title_word(word, first, line_start)
                first = line_start = broken = False
        pieces[index] = ''.join(words)
        text += pieces[index]
    return ''.join(pieces)


def sentence_case(label):
    """A label read as a sentence: the first letter capitalised, names spelt once.

    Connector labels are relations ("defines", "may have") and a UML guard is
    a condition, so neither is a title.
    """
    pieces = re.split(r'(<[^>]*>|&\w+;|&#\d+;)', label or '')
    first = True
    for index, piece in enumerate(pieces):
        if not piece or piece.startswith(('<', '&')):
            continue
        words = re.split(r'(\s+)', piece)
        for at, word in enumerate(words):
            core = word.strip('()[].,;:!?').lower()
            if core in SPELLING:
                words[at] = word.replace(word.strip('()[].,;:!?'), SPELLING[core])
            elif first and word.strip() and not CODE.search(word):
                lead = len(word) - len(word.lstrip('(['))
                words[at] = word[:lead] + word[lead:lead + 1].upper() + word[lead + 1:]
            first = first and not word.strip()
        pieces[index] = ''.join(words)
    return ''.join(pieces)


def area(box):
    """The area of a (left, top, right, bottom) box."""
    return (box[2] - box[0]) * (box[3] - box[1])


def ground_fill(page, inner):
    """The fill behind a box: the smallest filled box around it, or the page."""
    around = []
    for other in page.root:
        style = parse_style(other.get('style'))
        box = page.absolute(other) if other.get('vertex') == '1' else None
        fill = style.get('fillColor', WHITE)
        filled_box = fill.startswith('#') and kind(style, other) == 'box'
        if box and filled_box and box != inner and contains(box, inner, slack=0):
            around.append((area(box), fill.lower()))
    return min(around)[1] if around else 'default'


def connector_of(cell, page):
    """The connector a label belongs to: the cell itself or its parent."""
    if cell.get('edge') == '1':
        return cell
    parent = page.cells.get(cell.get('parent'))
    return parent if parent is not None and parent.get('edge') == '1' else None


def mask_ground(style, cell, page):
    """Fill a text box drawn as a mask with the ground behind it."""
    fill = style.get('fillColor', 'none')
    box = page.absolute(cell)
    if kind(style, cell) == 'text' and box and style.get('strokeColor', 'none') == 'none' \
            and (fill.startswith('#') or fill == 'default'):
        style['fillColor'] = ground_fill(page, box)


def label_ground(style, cell, page):
    """Set the label background of a cell to the ground behind its label."""
    edge = connector_of(cell, page)
    if edge is None:
        style.pop('labelBackgroundColor', None)
        mask_ground(style, cell, page)
        return
    if not cell.get('value'):
        return
    ends = [page.absolute(page.cells[end]) for end in (edge.get('source'), edge.get('target'))
            if end in page.cells and page.absolute(page.cells[end])]
    if len(ends) < 2:
        style['labelBackgroundColor'] = 'default'
        return
    both = (min(e[0] for e in ends), min(e[1] for e in ends),
            max(e[2] for e in ends), max(e[3] for e in ends))
    style['labelBackgroundColor'] = ground_fill(page, both)


HEX = re.compile(r'#[0-9a-fA-F]{6}\b')


IMAGE = re.compile(r'data:image/[^;"]+[;,][^;"]*')


# The logo is 232 by 24 units. Drawn at twice that, it spans what the old
# wordmark spanned.
LOGO_WIDTH = 464


LOGO_HEIGHT = 48


def recolour(text):
    """Swap mapped colours outside embedded images, which stay untouched."""
    parts = []
    last = 0
    for image in IMAGE.finditer(text):
        parts.append(swap(text[last:image.start()]))
        parts.append(image.group(0))
        last = image.end()
    parts.append(swap(text[last:]))
    return ''.join(parts)


def swap(chunk):
    """Replace mapped colours in a piece of text with no image in it."""
    chunk = HEX.sub(lambda m: COLOURS.get(m.group(0).lower(), m.group(0)), chunk)
    for old, new in RGB.items():
        chunk = chunk.replace(old, new)
    return chunk


def old_wordmarks(model):
    """Yield (group, members, titles) for each emoji wordmark."""
    cells = {cell.get('id'): cell for cell in model.iter('mxCell')}
    for group in cells.values():
        members = [c for c in cells.values() if c.get('parent') == group.get('id')]
        values = ' '.join(c.get('value') or '' for c in members)
        if 'emoji' not in values or '>DTaaS<' not in values:
            continue
        titles = [
            c for c in cells.values()
            if c.get('parent') == group.get('parent')
            and 'Digital Twin as a Service<' in (c.get('value') or '')
        ]
        yield group, members, titles


def grouped_wordmark(group, members, titles):
    """Where the logo goes for a wordmark drawn as a group, and what it replaces."""
    box = group.find('mxGeometry')
    x = float(box.get('x') or 0)
    y = float(box.get('y') or 0) + (float(box.get('height')) - LOGO_HEIGHT) / 2
    return [group, *members, *titles], group.get('parent'), group.get('id'), x, y


def loose_wordmark(group, members, titles):
    """The same for a wordmark that lies loose on the page instead of in a group.

    Here members is every cell on the page, so only the emoji and the words of
    the wordmark are taken, and its place is the box around those pieces.
    """
    words = ('emoji', '>DTaaS<', 'Digital Twin as a Service<')
    marks = [c for c in members if any(w in (c.get('value') or '') for w in words)]
    pieces = [c for c in [*marks, *titles] if c.find('mxGeometry') is not None]
    boxes = [c.find('mxGeometry') for c in pieces]
    x = min(float(b.get('x') or 0) for b in boxes)
    top = min(float(b.get('y') or 0) for b in boxes)
    bottom = max(float(b.get('y') or 0) + float(b.get('height') or 0) for b in boxes)
    y = top + (bottom - top - LOGO_HEIGHT) / 2
    return pieces, group.get('id'), pieces[0].get('id'), x, y


def remove_once(model, cells, gone):
    """Remove cells from a model, skipping those an earlier wordmark took.

    Two wordmarks can claim the same title cell, so each goes once.
    """
    for cell in cells:
        if id(cell) not in gone:
            gone.add(id(cell))
            model.remove(cell)


def replace_wordmarks(root):
    """Put the logo where each old wordmark was."""
    style = svg_image(LOCKUP)
    for model in root.iter('root'):
        # Collected first, because the loop removes cells from the model.
        found = list(old_wordmarks(model))
        gone = set()
        for group, members, titles in found:
            place = grouped_wordmark if group.find('mxGeometry') is not None else loose_wordmark
            removed, parent, logo_id, x, y = place(group, members, titles)
            remove_once(model, removed, gone)
            logo = ET.SubElement(model, 'mxCell', {
                'id': logo_id, 'value': '', 'style': style,
                'vertex': '1', 'parent': parent,
            })
            ET.SubElement(logo, 'mxGeometry', {
                'x': str(x), 'y': str(y), 'width': str(LOGO_WIDTH),
                'height': str(LOGO_HEIGHT), 'as': 'geometry',
            })


def retheme(source, target):
    """Recolour a drawio file, write it, and return the colours left unmapped."""
    root = ET.fromstring(recolour(source.read_text()))
    replace_wordmarks(root)
    ET.indent(root, space='  ')
    target.write_text(ET.tostring(root, encoding='unicode') + '\n')
    left = {c.lower() for c in HEX.findall(IMAGE.sub('', target.read_text()))}
    known = set(COLOURS.values()) | {'#000000', WHITE}
    return sorted(left - known)


LINE_PX = 1.5


HEAVY_PX = 3


BOUNDARY_PX = 2


RADIUS_PX = 8


MARK_PX = 32


INSET_PX = 8


# Labels that name a region of a diagram, the only text drawn in bold,
# compared in lower case.
TITLES = {
    'generic', 'construction / buildings', 'other domains', 'common services',
    'web interface', 'workspace', 'digital twin automation layer',
    'domain-specific extensions', 'digital twin as a service (dtaas)',
}


# Strokes in a blue or turquoise become primary, every other stroke grey 700.
BLUE = {PRIMARY, PRIMARY_DARK, ACCENT, ACCENT_DARK, MARK_ACCENT}


# The forward-auth middleware has one size on every page, in drawio units.
FORWARD_AUTH = {'width': 82, 'height': 47}


USER_ICON = ('html=1;shape=mxgraph.ios7.icons.user;verticalLabelPosition='
             'bottom;verticalAlign=top;align=center;dashed=0;shadow=0;')


def line_colour(colour):
    """Map a stroke colour to primary or grey 700."""
    if colour in (None, 'none'):
        return colour
    return PRIMARY if colour.lower() in BLUE else GREY_700


def flatten(style):
    """Draw a see-through fill as the solid colour it shows on white."""
    opacity = float(style.pop('opacity', 100))
    fill = style.get('fillColor')
    if fill and fill.startswith('#') and opacity < 100:
        style['fillColor'] = blend(fill.lower(), opacity)
    return style.get('fillColor')


def style_edge(style, page):
    """Give every connector one style, and the highlighted ones a heavy line."""
    # The forward-auth arrow was turquoise. It stays the one heavy arrow,
    # now in primary, which reaches the contrast floor.
    heavy = (style.get('strokeColor') or '').lower() in (ACCENT, PRIMARY)
    style['strokeColor'] = PRIMARY if heavy else GREY_700
    style['strokeWidth'] = size_text(page.units(HEAVY_PX if heavy else LINE_PX))
    style.pop('opacity', None)
    for end in ('startArrow', 'endArrow'):
        if style.get(end) not in (None, 'none', 'oval'):
            style[end] = 'classic'


def style_shape(style, what, page, boundary):
    """Set the border of a box or a stencil, and the corner of a box."""
    style['strokeColor'] = line_colour(style.get('strokeColor', GREY_700))
    pixels = BOUNDARY_PX if boundary else LINE_PX
    style['strokeWidth'] = size_text(page.units(pixels))
    if what == 'box':
        style.update(rounded='1', absoluteArcSize='1',
                     arcSize=size_text(page.units(RADIUS_PX)))


def style_text(style, cell, page):
    """Set the font, size, weight, colour and wording of a label."""
    fill = flatten(style)
    if connector_of(cell, page) is not None:
        fill = style.get('labelBackgroundColor', fill)
    label = cell.get('value') or ''
    style.pop('fontStyle', None)
    if not label:
        return
    ground = fill if fill and fill.startswith('#') else WHITE
    dark = luminance(ground) < 0.2
    candidates = [WHITE] if dark else [GREY_700, PRIMARY_DARK]
    sentence = (connector_of(cell, page) is not None or plain_text(label).startswith('[')
                or (page.name in SEQUENCE_DIAGRAMS and kind(style, cell) == 'text'))
    style['fontColor'] = text_colour(ground, candidates)
    style['fontFamily'] = 'Inter'
    if plain_text(label).lower() in TITLES:
        style['fontStyle'] = '1'
    if page.min_font():
        size = max(int(float(style.get('fontSize', 12))), page.min_font())
        style['fontSize'] = str(size)
    wording = sentence_case if sentence else title_case
    cell.set('value', wording(clean_label(label, page.min_font())))


def forward_auth(style, cell):
    """Draw the forward-auth middleware the same way on every page."""
    style.pop(('text',), None)
    style.update(fillColor=PRIMARY_TINT, strokeColor=PRIMARY,
                 whiteSpace='wrap', html='1')
    box = cell.find('mxGeometry')
    for side, size in (('x', 'width'), ('y', 'height')):
        target = FORWARD_AUTH[size]
        centre = float(box.get(side, 0)) + float(box.get(size)) / 2
        box.set(side, size_text(centre - target / 2))
        box.set(size, str(target))


def restyle_cell(cell, page, boundary):
    """Apply every rule that concerns a single cell."""
    style = parse_style(cell.get('style'))
    what = kind(style, cell)
    if 'forward-auth' in plain_text(cell.get('value')).lower():
        forward_auth(style, cell)
        what = 'box'
    if what == 'text' and style.get('strokeColor', 'none') != 'none':
        what = 'box'
    if what == 'edge':
        style_edge(style, page)
    elif what in ('box', 'stencil'):
        style_shape(style, what, page, cell is boundary)
    # The ground goes first, so the text colour is chosen against it.
    label_ground(style, cell, page)
    if what != 'group':
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
        box.set('x', size_text(float(box.get('x', 0)) + (width - side) / 2))
        box.set('y', size_text(float(box.get('y', 0)) + (height - side) / 2))
        box.set('width', size_text(side))
        box.set('height', size_text(side))
        cell.set('style', USER_ICON)


def remove_notes(page):
    """Remove notes written into the picture, which the page text carries."""
    notes = [cell for cell in page.root
             if plain_text(cell.get('value')).startswith('Note:')]
    for cell in notes:
        page.root.remove(cell)


def find_boundary(page):
    """Return the largest box on the page, the DTaaS system boundary."""
    boxes = [cell for cell in page.root if cell.get('vertex') == '1'
             and kind(parse_style(cell.get('style')), cell) == 'box'
             and page.absolute(cell)]
    return max(boxes, key=lambda cell: area(page.absolute(cell)), default=None)


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
        x=size_text(right - size - inset), width=size_text(size),
        y=size_text(float(frame.get('y', 0)) + inset), height=size_text(size))


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


RASTER = re.compile(r'image=data:image/(png|jpg|jpeg),([A-Za-z0-9+/=]+)')


def white_to_alpha(image):
    """Turn a white background into transparency, keeping soft edges."""
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    for x in range(rgba.width):
        for y in range(rgba.height):
            pixels[x, y] = clear_white(pixels[x, y])
    return rgba


def clear_white(pixel):
    """Return one pixel with its white part made transparent."""
    # How far the pixel is from white decides how opaque it stays, and the
    # colour is divided back out so an edge does not keep a white halo.
    alpha = 255 - min(pixel[:3])
    if alpha == 0:
        return 0, 0, 0, 0
    colour = (round(255 - (255 - c) * 255 / alpha) for c in pixel[:3])
    return (*colour, alpha)


def shrink(data, form, size):
    """Return the image as base64 PNG data, no larger than the given size."""
    from PIL import Image  # pylint: disable=import-outside-toplevel
    image = Image.open(io.BytesIO(base64.b64decode(data)))
    if image.mode == 'P' and image.width <= size[0] and image.height <= size[1]:
        return data  # already shrunk by an earlier run
    image = image.convert('RGBA')
    if image.width > size[0] or image.height > size[1]:
        image.thumbnail(size, Image.Resampling.LANCZOS)
    if form != 'png':
        image = white_to_alpha(image)
    # A logo has few colours, so a palette of 256 keeps it unchanged to the
    # eye at half the bytes.
    image = image.quantize(256, method=Image.Quantize.FASTOCTREE)
    out = io.BytesIO()
    image.save(out, 'PNG', optimize=True)
    return base64.b64encode(out.getvalue()).decode('ascii')


def shrink_cell(cell, pixels_per_unit):
    """Rewrite the raster image of one cell, if it has one."""
    style = cell.get('style') or ''
    match = RASTER.search(style)
    box = cell.find('mxGeometry')
    if match is None or box is None:
        return
    size = tuple(math.ceil(float(box.get(side)) * pixels_per_unit)
                 for side in ('width', 'height'))
    data = shrink(match.group(2), match.group(1), size)
    cell.set('style', style.replace(match.group(0),
                                    f'image=data:image/png,{data}'))


def shrink_page(diagram):
    """Shrink every raster image on one page."""
    page = Page(diagram)
    pixels_per_unit = EXPORT_WIDTH / page.width
    for cell in page.root:
        shrink_cell(cell, pixels_per_unit)


# The colour of text written into a label, and not a background-color.
COLOUR_IN_LABEL = re.compile(r'((?<![-\w])color\s*[:=]\s*"?\s*)(#[0-9a-fA-F]{6})', re.I)


HEX_VALUE = re.compile(r'^#[0-9a-fA-F]{6}$')


def hex_of(value, default):
    """A #rrggbb colour from a drawio value, or the default for 'default'."""
    if value in (None, 'default'):
        return default
    return value.lower() if HEX_VALUE.match(value or '') else None


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
        # turns light like a line. A light box with no border turns dark.
        if luminance(fill) < 0.3:
            style['fillColor'] = dark_line(fill)
        return ground, old_ground
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


# How far, in drawio units, a point may stray before a rule reports it.
SLACK = 2


def far(first, second, distance):
    """Whether two points are further apart than a distance."""
    return math.dist(first, second) > distance


def inside(point, box, margin=0):
    """Whether a point lies within a box grown by a margin."""
    x, y = point
    return box[0] - margin <= x <= box[2] + margin and box[1] - margin <= y <= box[3] + margin


def overlap(first, second):
    """Whether two boxes overlap by more than the slack on both axes."""
    width = min(first[2], second[2]) - max(first[0], second[0])
    height = min(first[3], second[3]) - max(first[1], second[1])
    return width > SLACK and height > SLACK


def touches(text, box):
    """Whether a text block reaches across the border of a box.

    A label that only touches a line is already hard to read, so this takes
    a quarter of the slack the other rules allow.
    """
    margin = SLACK / 4
    width = min(text[2], box[2]) - max(text[0], box[0])
    height = min(text[3], box[3]) - max(text[1], box[1])
    held = all(inside(corner, box, margin) for corner in (text[:2], text[2:]))
    return width > margin and height > margin and not held


def contains(outer, inner, slack=SLACK):
    """Whether one box holds another, give or take the slack."""
    return all(inside(corner, outer, slack) for corner in (inner[:2], inner[2:]))


def crosses(segment, box):
    """Whether a straight segment passes through the inside of a box."""
    (x1, y1), (x2, y2) = segment
    left, top, right, bottom = box[0] + SLACK, box[1] + SLACK, box[2] - SLACK, box[3] - SLACK
    if left >= right or top >= bottom:
        return False
    steps = max(2, int(math.dist((x1, y1), (x2, y2)) // 2))
    return any(left < x1 + (x2 - x1) * i / steps < right
               and top < y1 + (y2 - y1) * i / steps < bottom
               for i in range(steps + 1))


def slanted(segment):
    """Whether a straight segment is neither horizontal nor vertical."""
    (x1, y1), (x2, y2) = segment
    return abs(x1 - x2) > SLACK and abs(y1 - y2) > SLACK


def heading(start, end):
    """The direction from one point to the next, as a sign on each axis."""
    def sign(value):
        return 0 if abs(value) <= SLACK else (1 if value > 0 else -1)
    return sign(end[0] - start[0]), sign(end[1] - start[1])


# Advance widths of Inter 400, in ems, for the characters from space to
# tilde, read from docs/assets/fonts/inter-latin-400-normal.woff2. Bold text
# is about four percent wider.
WIDTHS = dict(zip(map(chr, range(32, 127)), (
    0.281, 0.288, 0.466, 0.633, 0.642, 0.982, 0.644, 0.3, 0.365, 0.365, 0.501, 0.662,
    0.288, 0.46, 0.288, 0.36, 0.631, 0.407, 0.61, 0.618, 0.646, 0.593, 0.62, 0.566,
    0.619, 0.62, 0.288, 0.302, 0.662, 0.662, 0.662, 0.511, 0.966, 0.69, 0.654, 0.73,
    0.722, 0.601, 0.59, 0.746, 0.743, 0.269, 0.571, 0.672, 0.565, 0.903, 0.753, 0.765,
    0.639, 0.765, 0.644, 0.642, 0.646, 0.744, 0.69, 0.985, 0.682, 0.679, 0.629, 0.365,
    0.36, 0.365, 0.471, 0.456, 0.323, 0.562, 0.612, 0.571, 0.612, 0.583, 0.37, 0.613,
    0.591, 0.242, 0.242, 0.549, 0.242, 0.876, 0.591, 0.6, 0.612, 0.612, 0.376, 0.528,
    0.327, 0.591, 0.562, 0.818, 0.546, 0.562, 0.552, 0.426, 0.333, 0.426, 0.662)))


BOLD = 1.04


# A logo file carries empty margins, and a stencil such as a cloud or a
# hexagon draws its outline inside its box, so text only meets one of them
# when it reaches this share of each side in.
SHAPE_MARGIN = 0.15


# The glyphs of a line fill the middle of its height, so a connector passing
# through the leading above or below the letters touches nothing.
LEADING = 0.15


# A character outside the table, such as an accented letter, is taken as wide.
OTHER = 0.7


LINE_EM = 1.2


# The table leaves out kerning, which makes a line a little narrower than the
# sum of its letters, so a line wraps only when it is this much over its room.
FIT = 1.03


SVG = '{http://www.w3.org/2000/svg}'


XHTML = '{http://www.w3.org/1999/xhtml}'


LABEL_LINES = re.compile(r'<br\s*/?>|</div>|</p>|\n', re.I)


def font_size(cell, style):
    """The largest font size a label uses, in drawio units."""
    inline = [int(n) for n in re.findall(r'font-size:\s*(\d+)px', cell.get('value') or '')]
    return max([float(style.get('fontSize', 12)), *inline])


def line_width(line, size, bold):
    """The width of one line of text at a font size."""
    width = sum(WIDTHS.get(char, OTHER) for char in line) * size
    return width * BOLD if bold else width


def wrapped(line, size, bold, room):
    """The widths of the rows a line breaks into, word by word, in the room."""
    rows, current = [], ''
    for word in line.split(' '):
        candidate = f'{current} {word}' if current else word
        if current and line_width(candidate, size, bold) > room * FIT:
            rows.append(current)
            candidate = word
        current = candidate
    # A single word wider than the room does not break, it overflows.
    return [line_width(row, size, bold) for row in [*rows, current]]


def text_size(cell, style, room):
    """The width and height of a label, wrapped to the room when it wraps."""
    lines = [plain_text(line) for line in LABEL_LINES.split(cell.get('value') or '')]
    lines = [line for line in lines if line]
    size = font_size(cell, style)
    bold = style.get('fontStyle') == '1' or '<b>' in (cell.get('value') or '')
    if style.get('whiteSpace') == 'wrap' and room > 0:
        widths = [w for line in lines for w in wrapped(line, size, bold, room)]
    else:
        widths = [line_width(line, size, bold) for line in lines]
    return max(widths), len(widths) * size * LINE_EM


def outside(style):
    """Whether a label is drawn beside its shape and not inside it."""
    return (style.get('verticalLabelPosition', 'middle') != 'middle'
            or style.get('labelPosition', 'center') != 'center')


def css_pixels(css, key):
    """A length in pixels from parsed CSS, or 0 when the property is missing."""
    return float(css.get(key, '0px').removesuffix('px'))


def anchors(svg_root):
    """Where drawio placed each HTML label, read from the SVG it exported.

    drawio writes a label as a flex box whose margin and padding put its
    anchor on the page, and whose alignment says which side of the text sits
    on the anchor. Returns, by cell id, (x, y, width, justify, align), with
    width the room the text wraps in, or 1 when it does not wrap.
    """
    found = {}
    for group in svg_root.iter(f'{SVG}g'):
        cell = group.get('data-cell-id')
        flex = next((div for div in group.iter(f'{XHTML}div')
                     if 'padding-top' in (div.get('style') or '')), None)
        if cell and flex is not None and cell not in found:
            css = dict(re.findall(r'([\w-]+):\s*(?:unsafe\s+)?([^;]+);', flex.get('style')))
            found[cell] = (css_pixels(css, 'margin-left'), css_pixels(css, 'padding-top'),
                           css_pixels(css, 'width') or 1, css.get('justify-content', 'center'),
                           css.get('align-items', 'center'))
    return found


def text_box(cell, anchor):
    """Estimate the box the label of a cell is drawn in, in SVG coordinates."""
    style = parse_style(cell.get('style'))
    if not plain_text(cell.get('value')) or anchor is None:
        return None
    x, y, room, justify, align = anchor
    width, height = text_size(cell, style, room if room > 1 else 0)
    span = room if room > 1 else 0
    left = {'flex-start': x, 'flex-end': x + span - width}.get(justify, x + (span - width) / 2)
    top = {'flex-start': y, 'flex-end': y - height}.get(align, y - height / 2)
    return left, top, left + width, top + height


def picture_core(box):
    """The middle of an image or stencil box, without its empty margins."""
    dx, dy = (box[2] - box[0]) * SHAPE_MARGIN, (box[3] - box[1]) * SHAPE_MARGIN
    return box[0] + dx, box[1] + dy, box[2] - dx, box[3] - dy


def glyphs(estimate, style, cell):
    """The part of a text block the letters fill, without the leading."""
    trim = font_size(cell, style) * LEADING
    return estimate[0], estimate[1] + trim, estimate[2], estimate[3] - trim


def widened(estimate):
    """A text block grown by the error of the width estimate on each side.

    The table can read a line a few percent narrower than drawio draws it,
    so the rules against borders and lines judge the block with that margin.
    """
    grow = (estimate[2] - estimate[0]) * (FIT - 1) / 2
    return estimate[0] - grow, estimate[1], estimate[2] + grow, estimate[3]


def crossings(estimate, own, boxes, kinds):
    """The box borders, stencil outlines and pictures a label reaches across.

    Text written inside a stencil, such as a cloud, is its label and fine.
    Text over a picture hides part of it wherever it sits.
    """
    found = []
    for other, box in boxes.items():
        what = kinds[other]
        if box == own or (what == 'stencil' and contains(box, estimate)):
            continue
        if what in ('image', 'stencil') and overlap(estimate, picture_core(box)):
            found.append(f'text covers the {what} {other}')
        elif what == 'box' and touches(estimate, box):
            found.append(f'text crosses the border of {other}')
    return found


def on_lines(estimate, style, cell, lines):
    """The connectors whose line runs through the letters of a label."""
    letters = glyphs(widened(estimate), style, cell)
    return [f'text sits on connector {edge}' for edge, segments in lines.items()
            if any(crosses(segment, letters) for segment in segments)]


def label_rules(cell, own, shapes, lines, estimate):
    """The ways one labelled vertex breaks the label rules.

    shapes is a pair: the boxes of the page and what each one draws, both by
    cell id. A turned label is left out, since its size along the page
    cannot be estimated from its characters.
    """
    style = parse_style(cell.get('style'))
    what = kind(style, cell)
    rotated = float(style.get('rotation', 0)) % 360 or style.get('horizontal') == '0'
    if estimate is None or rotated:
        return []
    if what == 'box' and not outside(style):
        found = [] if contains(own, estimate) else ['label overflows its box']
        # An icon drawn inside the box must not sit under its label.
        return found + [problem for problem in crossings(widened(estimate), own, *shapes)
                        if problem.startswith('text covers')]
    if what not in ('text', 'stencil', 'image'):
        return []
    found = crossings(widened(estimate), own, *shapes)
    if style.get('labelBackgroundColor', 'none') == 'none':
        found += on_lines(estimate, style, cell, lines)
    return found


def connector_label_rules(estimate, shapes):
    """The ways the label of a connector breaks the label rules.

    It masks its own line, so only borders and pictures count.
    """
    return crossings(widened(estimate), None, *shapes) if estimate else []


NUMBER = re.compile(r'-?\d+(?:\.\d+)?')


# Two ends closer than this share an attach point.
SAME_POINT = 4


# A Q command longer than this is a curve, not a rounded corner.
CORNER = 16


def bezier(points, steps=8):
    """Points along a quadratic or cubic Bezier curve, its start included."""
    def at(t):
        row = points
        while len(row) > 1:
            row = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                   for a, b in zip(row, row[1:])]
        return row[0]
    return [at(i / steps) for i in range(steps + 1)]


def segments(d):
    """The pieces and the points of an SVG path, and whether it curves.

    Each piece is (start, end, drawn straight).

    drawio writes a connector as M and L commands, a rounded corner as a
    short Q, and a curved connector as C or longer Q commands. A curve is
    returned as short straight pieces, so a label or a box it runs over is
    found like one under a straight line.
    """
    points, pieces, curved = [], [], False
    for command, values in re.findall(r'([MLQC])([^MLQC]*)', d):
        numbers = [float(n) for n in NUMBER.findall(values)]
        pairs = list(zip(numbers[::2], numbers[1::2]))
        if not pairs:
            continue
        if points and command in 'QC':
            curve = bezier([points[-1], *pairs])
            pieces += [(*piece, False) for piece in zip(curve, curve[1:])]
            curved = curved or command == 'C' or far(points[-1], pairs[-1], CORNER)
        elif points and command == 'L':
            pieces.append((points[-1], pairs[-1], True))
        points.append(pairs[-1])
    return pieces, points, curved


def drawn_lines(svg_root):
    """Map each connector's cell id to the path of the line drawio drew."""
    paths = {}
    for group in svg_root.iter(f'{SVG}g'):
        cell = group.get('data-cell-id')
        line = next((p for p in group.iter(f'{SVG}path') if p.get('fill') == 'none'), None)
        if cell and line is not None and cell not in paths:
            paths[cell] = line.get('d')
    return paths


def svg_offset(svg_root, page):
    """The shift from page coordinates to the coordinates of the SVG.

    Each box drawn as a rectangle of its own size gives the shift. An icon
    can hold a rectangle of the same width somewhere inside it, so the shift
    most boxes agree on is taken.
    """
    votes = Counter()
    for group in svg_root.iter(f'{SVG}g'):
        cell = page.cells.get(group.get('data-cell-id'))
        shape = next(group.iter(f'{SVG}rect'), None)
        if cell is None or shape is None or cell.get('vertex') != '1':
            continue
        box = page.absolute(cell)
        size = (float(shape.get('width', -1)), float(shape.get('height', -1)))
        if box and abs(size[0] - (box[2] - box[0])) < 1 and abs(size[1] - (box[3] - box[1])) < 1:
            votes[(round(float(shape.get('x')) - box[0], 1),
                   round(float(shape.get('y')) - box[1], 1))] += 1
    if not votes:
        # Without a shared box the lines cannot be placed on the page, and a
        # check against a guessed shift would report nonsense.
        raise SystemExit(f'no box of page {page.name} was found in its SVG')
    return votes.most_common(1)[0][0]


def page_line(d, offset):
    """The pieces, points and curve flag of a path, in page coordinates."""
    pieces, points, curved = segments(d)

    def move(point):
        return point[0] - offset[0], point[1] - offset[1]
    return ([(move(a), move(b), drawn) for a, b, drawn in pieces],
            [move(p) for p in points], curved)


def loose(cell, page):
    """Whether a cell sits on the page itself and not on a connector."""
    parent = page.cells.get(cell.get('parent'))
    geometry = cell.find('mxGeometry')
    on_edge = parent is not None and parent.get('edge') == '1'
    return not on_edge and (geometry is None or geometry.get('relative') != '1')


def turned(box, degrees):
    """The upright box round a box turned about its centre."""
    if not degrees % 180:
        return box
    angle = math.radians(degrees)
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    half_w, half_h = (box[2] - box[0]) / 2, (box[3] - box[1]) / 2
    reach_x = abs(half_w * math.cos(angle)) + abs(half_h * math.sin(angle))
    reach_y = abs(half_w * math.sin(angle)) + abs(half_h * math.cos(angle))
    return cx - reach_x, cy - reach_y, cx + reach_x, cy + reach_y


def page_shapes(page):
    """The boxes, stencils and images of a page, and what each one draws.

    A turned shape is judged by the upright box round it.
    """
    found, kinds = {}, {}
    for cell in page.root:
        style = parse_style(cell.get('style'))
        box = page.absolute(cell)
        if box:
            box = turned(box, float(style.get('rotation', 0)))
        what = kind(style, cell)
        if cell.get('vertex') == '1' and box and loose(cell, page) \
                and what in ('box', 'stencil', 'image'):
            found[cell.get('id')] = box
            kinds[cell.get('id')] = what
    return found, kinds


def ends_of(page, cell):
    """The cells an edge joins, with every group or container around them."""
    ends = set()
    for end in (cell.get('source'), cell.get('target')):
        while end in page.cells:
            ends.add(end)
            end = page.cells[end].get('parent')
    return ends


def connector_rules(line, boxes, ends):
    """The ways one connector breaks the connector rules."""
    pieces, points, curved = line
    lines = [(a, b) for a, b, drawn in pieces if drawn]
    found = ['connector on a slant'] if curved or any(map(slanted, lines)) else []
    for other, box in boxes.items():
        if other in ends or inside(points[0], box, SLACK) or inside(points[-1], box, SLACK):
            continue
        if any(crosses((a, b), box) for a, b, _ in pieces):
            found.append(f'connector passes behind {other}')
    return found


def attach_points(cell, points):
    """Where an edge meets its two ends, and the way it leaves each one."""
    if len(points) < 2:
        return []
    return [(end, point, heading(point, nxt)) for end, point, nxt in (
        (cell.get('source'), points[0], points[1]),
        (cell.get('target'), points[-1], points[-2])) if end]


def shared_points(attach):
    """Edges that meet one box at one point from different directions."""
    found = []
    for box, ends in attach.items():
        for i, (edge, point, way) in enumerate(ends):
            for other, other_point, other_way in ends[i + 1:]:
                if edge != other and way != other_way and not far(point, other_point, SAME_POINT):
                    found.append((edge, f'meets {box} at the point {other} uses'))
    return found


def label_problems(page, svg_root, offset, shapes_and_lines):
    """The label rules for every labelled cell of a page."""
    placed = anchors(svg_root)
    problems = []
    for cell in page.root:
        anchor = placed.get(cell.get('id'))
        edge = cell.get('edge') == '1'
        if anchor is None or not (edge or loose(cell, page)):
            continue
        # The anchor comes in SVG coordinates, the cells in page ones.
        moved = (anchor[0] - offset[0], anchor[1] - offset[1], *anchor[2:])
        estimate = text_box(cell, moved)
        if edge:
            found = connector_label_rules(estimate, shapes_and_lines[0])
        else:
            found = label_rules(cell, page.absolute(cell), *shapes_and_lines, estimate)
        problems += [(cell.get('id'), problem) for problem in found]
    return problems


def connector_problems(page, svg_root, offset, connectors):
    """The connector rules for every edge, and the lines drawn for each."""
    (boxes, _), paths = page_shapes(page), drawn_lines(svg_root)
    problems, lines, attach = [], {}, {}
    for cell in page.root:
        edge = cell.get('id')
        if cell.get('edge') != '1' or edge not in paths:
            continue
        line = page_line(paths[edge], offset)
        lines[edge] = [(a, b) for a, b, _ in line[0]]
        if connectors:
            problems += [(edge, p) for p in connector_rules(line, boxes, ends_of(page, cell))]
        for end, point, way in attach_points(cell, line[1]):
            attach.setdefault(end, []).append((edge, point, way))
    problems += shared_points(attach) if connectors else []
    return problems, lines


def check_page(diagram, svg_text, connectors=True):
    """Every layout problem on one page, as (page name, cell id, problem).

    connectors is False for a page drawn free hand, which only the label
    rules apply to.
    """
    page, svg_root = Page(diagram), ET.fromstring(svg_text)
    offset = svg_offset(svg_root, page)
    problems, lines = connector_problems(page, svg_root, offset, connectors)
    problems += label_problems(page, svg_root, offset, (page_shapes(page), lines))
    return [(page.name, cell, problem) for cell, problem in problems]
