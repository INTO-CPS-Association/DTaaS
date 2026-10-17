"""Label backgrounds take the colour of what lies behind the label.

A label inside its own shape has none, so no white patch shows on a coloured box.
"""

from config import WHITE
from drawio.style import kind, parse_style
from layout.geometry import contains


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
