"""Map the drawio default colours to the theme, and put the logo in place of
the old wordmark.
"""

import re
import xml.etree.ElementTree as ET

from config import COLOURS, LOCKUP, RGB, WHITE
from drawio.style import svg_image


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
    root = ET.fromstring(recolour(source.read_text(encoding='utf-8')))
    replace_wordmarks(root)
    ET.indent(root, space='  ')
    target.write_text(ET.tostring(root, encoding='unicode') + '\n', encoding='utf-8')
    written = target.read_text(encoding='utf-8')
    left = {c.lower() for c in HEX.findall(IMAGE.sub('', written))}
    known = set(COLOURS.values()) | {'#000000', WHITE}
    return sorted(left - known)
