"""Check the layout of a page as drawio draws it.

Each rule is a defect a reader sees in the exported image and a review by eye
can miss:

- A connector runs in horizontal and vertical segments, never on a slant.
- Two connectors never meet a box at one point from different directions.
  Branches of one trunk, which leave a box together, are allowed.
- A connector never passes behind a box that is not one of its ends.
- A label fits in its box. Loose text, and a label beside its shape, cross
  neither the border of another box nor a connector (see labels.py).

The connectors are read from the SVG drawio exports, so a path is checked
where drawio routes it. Boxes and text come from the drawio file.
"""

import re
import xml.etree.ElementTree as ET

from drawio import Page, kind, parse_style
from geometry import crosses, far, heading, inside, slanted, SLACK
from labels import anchors, label_rules, text_box

SVG = '{http://www.w3.org/2000/svg}'
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
    """The shift from page coordinates to the coordinates of the SVG."""
    for group in svg_root.iter(f'{SVG}g'):
        cell = page.cells.get(group.get('data-cell-id'))
        shape = next(group.iter(f'{SVG}rect'), None)
        if cell is None or shape is None or cell.get('vertex') != '1':
            continue
        box = page.absolute(cell)
        if box and abs(float(shape.get('width', -1)) - (box[2] - box[0])) < 1:
            return float(shape.get('x')) - box[0], float(shape.get('y')) - box[1]
    return 0.0, 0.0


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


def shapes(page):
    """The boxes, stencils and images of a page, and what each one draws."""
    found, kinds = {}, {}
    for cell in page.root:
        box = page.absolute(cell)
        what = kind(parse_style(cell.get('style')), cell)
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
    """The label rules for every labelled vertex of a page."""
    placed = anchors(svg_root)
    problems = []
    for cell in page.root:
        anchor = placed.get(cell.get('id'))
        if cell.get('vertex') != '1' or not loose(cell, page) or anchor is None:
            continue
        x, y, room, justify, align = anchor
        estimate = text_box(cell, (x - offset[0], y - offset[1], room, justify, align))
        own = page.absolute(cell)
        problems += [(cell.get('id'), p)
                     for p in label_rules(cell, own, *shapes_and_lines, estimate)]
    return problems


def connector_problems(page, svg_root, offset, connectors):
    """The connector rules for every edge, and the lines drawn for each."""
    (boxes, _), paths = shapes(page), drawn_lines(svg_root)
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
    problems += label_problems(page, svg_root, offset, (shapes(page), lines))
    return [(page.name, cell, problem) for cell, problem in problems]
