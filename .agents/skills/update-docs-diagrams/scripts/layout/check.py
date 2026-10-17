"""The connector rules, and the check of one page.

A connector runs in horizontal and vertical segments, two connectors never
meet a box at one point from different directions, and a connector never
passes behind a box that is not one of its ends.
"""

import math
import xml.etree.ElementTree as ET

from drawio.files import Page
from drawio.style import kind, parse_style
from layout.geometry import crosses, far, heading, inside, SLACK, slanted
from layout.labels import anchors, connector_label_rules, label_rules, text_box
from layout.svg import drawn_lines, SAME_POINT, segments, svg_offset


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
