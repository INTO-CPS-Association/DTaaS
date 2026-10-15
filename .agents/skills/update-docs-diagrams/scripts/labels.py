"""Where drawio draws the text of a cell, and the rules for labels.

The size of a label is estimated from the advance widths of Inter, the font
of every diagram, so the estimate is close to what the export draws. A label
inside a box must fit in it. A label drawn outside its shape, and loose text,
must cross neither the border of another box nor a connector, unless it has
a label background that masks the line.
"""

import re

from drawio import kind, parse_style, plain_text
from geometry import contains, crosses, overlap, touches

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
LINE_BREAK = re.compile(r'<br\s*/?>|</div>|</p>|\n', re.I)


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
    lines = [plain_text(line) for line in LINE_BREAK.split(cell.get('value') or '')]
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
            found[cell] = (float(css['margin-left'][:-2]), float(css['padding-top'][:-2]),
                           float(css['width'][:-2]), css.get('justify-content', 'center'),
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


def core(box):
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
        if what in ('image', 'stencil') and overlap(estimate, core(box)):
            found.append(f'text covers the {what} {other}')
        elif what == 'box' and touches(estimate, box):
            found.append(f'text crosses the border of {other}')
    return found


def label_rules(cell, own, shapes, lines, estimate):
    """The ways one labelled vertex breaks the label rules.

    shapes is a pair: the boxes of the page and what each one draws, both by
    cell id. A turned label is left out, since its
    size along the page cannot be estimated from its characters.
    """
    style = parse_style(cell.get('style'))
    what = kind(style, cell)
    turned = float(style.get('rotation', 0)) % 360 or style.get('horizontal') == '0'
    if estimate is None or turned:
        return []
    if what == 'box' and not outside(style):
        return [] if contains(own, estimate) else ['label overflows its box']
    if what not in ('text', 'stencil', 'image'):
        return []
    found = crossings(widened(estimate), own, *shapes)
    if style.get('labelBackgroundColor', 'none') == 'none':
        found += [f'text sits on connector {edge}' for edge, segments in lines.items()
                  if any(crosses(segment, glyphs(widened(estimate), style, cell))
                         for segment in segments)]
    return found
