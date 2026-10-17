"""How wide and tall a label is, estimated from the advance widths of Inter.
"""

import re

from drawio.style import plain_text


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
