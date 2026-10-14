"""Split every drawio page that holds several diagrams into one page each.

The installation page of the original file draws twelve diagrams side by side.
The documentation needs each as its own image, so this script gives each
diagram its own page. A diagram is a set of cells that sit within a small gap
of each other. Titles and loose notes made only of text are left out, because
each documentation page already carries its own heading.

Usage: python3 split_pages.py <input.drawio> <output.drawio>
"""

import copy
import xml.etree.ElementTree as ET

from drawio_style import drawio_arguments

# Cells closer than this, in drawio units, belong to the same diagram.
GAP = 40

# The section titles of the original are 16 pixel bold text.
TITLE = 'font-size: 16px'


def box(cell):
    """Return the bounding box of a top level cell, or None if it has none."""
    geometry = cell.find('mxGeometry')
    if geometry is None:
        return None
    if cell.get('edge') == '1':
        return edge_box(cell, geometry)
    x, y = float(geometry.get('x', 0)), float(geometry.get('y', 0))
    return (x, y, x + float(geometry.get('width', 0)),
            y + float(geometry.get('height', 0)))


def edge_box(cell, geometry):
    """Return the bounding box of the free points of an edge."""
    # drawio keeps a stale end point after an end is connected to a shape,
    # so only the ends that are not connected count.
    ignored = {'sourcePoint'} if cell.get('source') else set()
    ignored |= {'targetPoint'} if cell.get('target') else set()
    points = [(float(p.get('x', 0)), float(p.get('y', 0)))
              for p in geometry.iter('mxPoint') if p.get('as') not in ignored]
    if not points:
        return None
    xs, ys = zip(*points)
    return min(xs), min(ys), max(xs), max(ys)


def near(a, b):
    """Tell whether two boxes are closer than the gap."""
    return (a[0] - GAP < b[2] and b[0] - GAP < a[2]
            and a[1] - GAP < b[3] and b[1] - GAP < a[3])


def clusters(boxes):
    """Group indices of boxes that touch, directly or through a chain."""
    parent = list(range(len(boxes)))

    def find(i):
        """Return the root of the group that holds box i."""
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i, a in enumerate(boxes):
        for j in range(i + 1, len(boxes)):
            if near(a, boxes[j]):
                parent[find(i)] = find(j)
    groups = {}
    for i in range(len(boxes)):
        groups.setdefault(find(i), []).append(i)
    return list(groups.values())


def is_text(cell):
    """Tell whether a cell is a plain text label."""
    return (cell.get('style') or '').startswith('text;')


def is_title(cell):
    """Tell whether a cell is a section title of the original page."""
    return is_text(cell) and TITLE in (cell.get('value') or '')


def top_level_ids(root, layer):
    """Map every cell id to the id of the top level cell that contains it."""
    parents = {c.get('id'): c.get('parent') for c in root}
    result = {}
    for cid in parents:
        current = cid
        while parents.get(current) not in (layer, None):
            current = parents[current]
        result[cid] = current
    return result


def attached(cell, keep, top_of):
    """Tell whether an edge ends on a cell that is kept."""
    ends = (cell.get('source'), cell.get('target'))
    return any(end and top_of.get(end) in keep for end in ends)


def split(diagram):
    """Yield one diagram element per diagram drawn on the page."""
    root = diagram.find('mxGraphModel/root')
    # The first cell has no parent, and the layer is its child.
    base = [c for c in root if c.get('parent') is None][0].get('id')
    layer = [c for c in root if c.get('parent') == base][0].get('id')
    top = [c for c in root if c.get('parent') == layer and not is_title(c)]
    boxed = [(c, box(c)) for c in top]
    boxed = [(c, b) for c, b in boxed if b is not None]
    top_of = top_level_ids(root, layer)
    for index, members in enumerate(clusters([b for _, b in boxed])):
        if all(is_text(boxed[i][0]) for i in members):
            continue
        keep = {boxed[i][0].get('id') for i in members}
        # An edge with no points of its own goes with the cells it joins.
        keep |= {c.get('id') for c in top if attached(c, keep, top_of)}
        page = copy.deepcopy(diagram)
        page.set('name', f"{diagram.get('name')}-{index:02d}")
        page.set('id', f"{diagram.get('id')}-{index:02d}")
        keep_only(page.find('mxGraphModel/root'), keep, top_of, (base, layer))
        yield page


def keep_only(root, keep, top_of, structural):
    """Remove every cell outside the kept top level cells."""
    # A removed group takes its children with it.
    doomed = [cell for cell in root
              if cell.get('id') not in structural
              and top_of.get(cell.get('id')) not in keep]
    for cell in doomed:
        root.remove(cell)


def main():
    """Write a drawio file with one page per diagram."""
    source, target = drawio_arguments(__doc__)
    tree = ET.parse(source)
    pages = [p for d in tree.getroot().iter('diagram') for p in split(d)]
    out = ET.Element('mxfile', {'host': 'drawio', 'pages': str(len(pages))})
    out.extend(pages)
    target.write_text(ET.tostring(out, encoding='unicode'))
    for page in pages:
        print(page.get('name'))


if __name__ == '__main__':
    main()
