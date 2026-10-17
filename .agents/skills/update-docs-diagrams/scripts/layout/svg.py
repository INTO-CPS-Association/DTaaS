"""Read the connectors and the label anchors from the SVG export of a page.

A path is checked where drawio routes it, so the SVG is the source.
"""

import re
from collections import Counter

from layout.geometry import far


SVG = '{http://www.w3.org/2000/svg}'


XHTML = '{http://www.w3.org/1999/xhtml}'


NUMBER = re.compile(r'-?\d+(?:\.\d+)?')


# Two ends closer than this share an attach point.
SAME_POINT = 4


# A Q command longer than this is a curve, not a rounded corner.
CORNER = 16


def css_pixels(css, key):
    """A length in pixels from parsed CSS, or 0 when the property is missing."""
    return float(css.get(key, '0px').removesuffix('px'))


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
