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
import pathlib
import re
import xml.etree.ElementTree as ET

from drawio_style import drawio_arguments

# Resolved from this file, so the script runs from any directory.
HERE = pathlib.Path(__file__).resolve().parent
# scripts, update-docs-diagrams, skills, .agents, then the repository.
REPO = HERE.parents[3]
LOGO = REPO / 'docs/assets/brand/dtaas-logo-full.svg'
TOKENS = REPO / 'client/src/theme/tokens.ts'


def token(name):
    """Read one brand colour from the theme, the authoritative source."""
    pattern = rf"^\s*{name}:\s*'(#[0-9a-fA-F]{{6}})'"
    match = re.search(pattern, TOKENS.read_text(), re.M)
    if match is None:
        raise SystemExit(f'{name} not found in {TOKENS}')
    return match.group(1)


PRIMARY = token('primary')
PRIMARY_DARK = token('primaryDark')
PRIMARY_TINT = token('primaryTint')
ACCENT = token('accent')
MARK_ACCENT = token('markAccent')
ERROR = token('error')

# Steps the theme does not name, derived from the accent for the stacked
# digital twins: a darker edge and a light fill.
ACCENT_DARK = '#00807a'
ACCENT_TINT = '#d9f2f1'

# The theme greys are hsl(220, ...) in tokens.ts. drawio wants hex.
GREY_50 = '#f5f6fa'
GREY_100 = '#ebeef4'
GREY_400 = '#94a0b8'
GREY_600 = '#47536b'
GREY_700 = '#333b4c'

# Old colour, lower case, to theme colour, grouped by what the colour drew.
COLOURS = {
    # Green: the web interface, compose, configuration and execution, the
    # asset types, the forward-auth middleware and its arrows.
    '#d5e8d4': PRIMARY_TINT,
    '#82b366': PRIMARY,
    '#008a00': PRIMARY,
    '#005700': PRIMARY_DARK,
    '#60a917': PRIMARY,
    '#2d7600': PRIMARY_DARK,
    '#c0f5a9': PRIMARY_TINT,
    '#00b050': ACCENT,
    '#499100': PRIMARY,
    '#009900': ACCENT,
    # Orange: the stacked digital twins and the nodes of the network icon.
    '#f0a30a': ACCENT,
    '#bd7000': ACCENT_DARK,
    '#fffbc0': ACCENT_TINT,
    '#fff2cc': ACCENT_TINT,
    '#d6b656': ACCENT,
    # Red and pink: the DTaaS boundary, the clouds and the server tags.
    '#cc0000': PRIMARY,
    '#f8cecc': PRIMARY_TINT,
    '#b85450': PRIMARY,
    '#99004d': PRIMARY,
    '#ffccff': PRIMARY_TINT,
    '#ff66b3': MARK_ACCENT,
    # Blue and purple: the workspace, the automation layer, the services.
    '#dae8fc': GREY_50,
    '#6c8ebf': MARK_ACCENT,
    '#99ccff': PRIMARY_TINT,
    '#c6d9f1': PRIMARY_TINT,
    '#e1d5e7': GREY_100,
    '#9673a6': GREY_400,
    '#76608a': PRIMARY,
    '#432d57': PRIMARY_DARK,
    '#6a00ff': PRIMARY,
    '#6666ff': PRIMARY,
    '#4f42ff': PRIMARY,
    '#1ba1e2': MARK_ACCENT,
    '#006eaf': PRIMARY,
    # Storage and dashboards in the multi-domain view.
    '#a20025': PRIMARY_DARK,
    '#6f0000': PRIMARY_DARK,
    '#647687': GREY_600,
    '#314354': GREY_700,
    '#434445': GREY_700,
    # The grey frames of the installation diagrams.
    '#f5f5f5': GREY_50,
    '#666666': GREY_400,
    '#333333': GREY_700,
    '#999999': GREY_400,
    # The lock on the workspace keeps a red, the theme's error colour.
    '#b20000': ERROR,
    '#e51400': ERROR,
    # Orange titles written inside labels as HTML.
    '#cc6600': PRIMARY,
    '#ff8000': PRIMARY,
    # The research and library figures added in October 2026. Strong blues,
    # purples and greens become the primary family, light fills the tints.
    '#0000cc': PRIMARY,
    '#001dbc': PRIMARY,
    '#0050ef': PRIMARY,
    '#10739e': PRIMARY,
    '#3700cc': PRIMARY,
    '#3f8624': PRIMARY,
    '#4277bb': PRIMARY,
    '#4d27aa': PRIMARY,
    '#990099': PRIMARY,
    '#b0084d': PRIMARY,
    '#006600': PRIMARY_DARK,
    '#006633': PRIMARY_DARK,
    '#1a3300': PRIMARY_DARK,
    '#a50040': PRIMARY_DARK,
    '#006666': ACCENT_DARK,
    '#b09500': ACCENT_DARK,
    '#d79b00': ACCENT_DARK,
    '#00cc00': ACCENT,
    '#e3c800': ACCENT,
    '#0080f0': MARK_ACCENT,
    '#326ce5': MARK_ACCENT,
    '#66b2ff': MARK_ACCENT,
    '#232f3d': GREY_700,
    '#232f3e': GREY_700,
    '#36393d': GREY_700,
    '#505050': GREY_700,
    '#f9f7ed': GREY_50,
    '#b1ddf0': PRIMARY_TINT,
    '#ccccff': PRIMARY_TINT,
    '#cce5ff': PRIMARY_TINT,
    '#66ff66': ACCENT_TINT,
    '#9ac7bf': ACCENT_TINT,
    '#ccffff': ACCENT_TINT,
    '#cdeb8b': ACCENT_TINT,
    '#ffd966': ACCENT_TINT,
    '#ffe6cc': ACCENT_TINT,
    '#ffff88': ACCENT_TINT,
    '#ff3333': ERROR,
}

# Navy written inside labels as rgb().
RGB = {'rgb(0, 0, 153)': PRIMARY}

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
