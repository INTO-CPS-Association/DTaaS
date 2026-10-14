"""Move the DTaaS diagrams from the drawio default palette to the theme.

Every colour the diagrams use is mapped to a colour of the interface theme,
read from `client/src/theme/tokens.ts`, so the pictures in the documentation
look like the application they describe. The old wordmark, three emoji fetched
from an external site beside the words "DTaaS" and "Digital Twin as a Service",
is replaced by the logo in `docs/assets/brand`. Shapes, text and layout are
left as they are.

Usage: python3 retheme_drawio.py <input.drawio> <output.drawio>
"""

import base64
import re
import xml.etree.ElementTree as ET

from drawio_style import drawio_arguments
from palette import COLOURS, REPO, RGB

LOGO = REPO / 'docs/assets/brand/dtaas-logo-full.svg'

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


def logo_style():
    """Return the drawio style of an image cell that shows the logo."""
    data = base64.b64encode(LOGO.read_bytes()).decode('ascii')
    return f'shape=image;aspect=fixed;image=data:image/svg+xml,{data};'


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


def replace_wordmarks(root):
    """Put the logo where each old wordmark was."""
    style = logo_style()
    for model in root.iter('root'):
        # Collected first, because the loop removes cells from the model.
        found = list(old_wordmarks(model))
        for group, members, titles in found:
            place = grouped_wordmark if group.find('mxGeometry') is not None else loose_wordmark
            removed, parent, logo_id, x, y = place(group, members, titles)
            for cell in removed:
                model.remove(cell)
            logo = ET.SubElement(model, 'mxCell', {
                'id': logo_id, 'value': '', 'style': style,
                'vertex': '1', 'parent': parent,
            })
            ET.SubElement(logo, 'mxGeometry', {
                'x': str(x), 'y': str(y), 'width': str(LOGO_WIDTH),
                'height': str(LOGO_HEIGHT), 'as': 'geometry',
            })


def main():
    """Recolour the input file and write the result."""
    source, target = drawio_arguments(__doc__)
    root = ET.fromstring(recolour(source.read_text()))
    replace_wordmarks(root)
    target.write_text(ET.tostring(root, encoding='unicode'))
    left = {c.lower() for c in HEX.findall(IMAGE.sub('', target.read_text()))}
    known = set(COLOURS.values()) | {'#000000', '#ffffff'}
    print(f'wrote {target}, unmapped colours: {sorted(left - known) or "none"}')


if __name__ == '__main__':
    main()
