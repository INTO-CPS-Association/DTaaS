"""The label rules: a label fits its box, and loose text crosses no border,
covers no picture and sits on no line unless its background masks it.
"""

import re

from drawio.style import kind, parse_style, plain_text
from layout.geometry import contains, crosses, overlap, touches
from layout.svg import css_pixels, SVG, XHTML
from layout.text import FIT, font_size, LEADING, SHAPE_MARGIN, text_size


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
