"""Build the drawio file that carries every brand variant on its own page.

drawio embeds an SVG as a data URI, so each page holds the real vector and not
a screenshot. Someone opens the file, goes to the page they need, and exports
at whatever size they want. The SVG files beside it stay the source of truth,
and this file is generated from them.
"""

import base64
import pathlib
import re
import urllib.parse
import xml.etree.ElementTree as ET

# Resolved from this file, so the output lands beside the generator
# whatever directory the command was run from.
BRAND = pathlib.Path(__file__).resolve().parent

# Page name, file, width, height. The mark is square, the lockups are not.
PAGES = [
    ('Mark', 'dtaas-mark.svg', 160, 160),
    ('Mark, white', 'dtaas-mark-white.svg', 160, 160),
    ('Mark, mono', 'dtaas-mark-mono.svg', 160, 160),
    ('DTaaS', 'dtaas-logo.svg', 320, 80),
    ('DTaaS, white', 'dtaas-logo-white.svg', 320, 80),
    ('DTaaS, mono', 'dtaas-logo-mono.svg', 320, 80),
    ('Digital Twin as a Service', 'dtaas-logo-full.svg', 464, 48),
    ('Digital Twin as a Service, white', 'dtaas-logo-full-white.svg', 464, 48),
    ('Digital Twin as a Service, mono', 'dtaas-logo-mono-full.svg', 464, 48),
]

# Read from the theme, which the README names as authoritative, so the swatch
# page cannot drift from what the interface uses.
def token(name):
    tokens = pathlib.Path(__file__).resolve().parents[3] / 'client/src/theme/tokens.ts'
    match = re.search(rf"^\s*{name}:\s*'(#[0-9a-fA-F]{{6}})'", tokens.read_text(), re.M)
    if match is None:
        raise SystemExit(f'{name} not found in {tokens}')
    return match.group(1)


PALETTE = [
    ('Primary', token('primary'), 'AU blue, Pantone 287, RGB 0 61 115'),
    ('Primary dark', token('primaryDark'), 'The navy of a solid AU field, and the mark ground'),
    ('Primary tint', token('primaryTint'), 'Behind a selected row or a quiet panel'),
    ('Accent', token('accent'), 'The turquoise of the secondary palette'),
    ('Mark accent', token('markAccent'), 'The cyan, on the drawn half of the mark'),
    ('White', '#ffffff', 'On the primary, and the mark on a dark ground'),
    ('Black', '#000000', 'The mono mark, for one colour printing'),
]


def data_uri(path):
    return 'data:image/svg+xml,' + base64.b64encode(
        path.read_bytes()).decode('ascii')


def cell(root, cid, value, style, x, y, w, h):
    c = ET.SubElement(root, 'mxCell', {
        'id': cid, 'value': value, 'style': style,
        'vertex': '1', 'parent': '1',
    })
    ET.SubElement(c, 'mxGeometry', {
        'x': str(x), 'y': str(y), 'width': str(w), 'height': str(h),
        'as': 'geometry',
    })


def page(build):
    model = ET.Element('mxGraphModel', {
        'dx': '800', 'dy': '600', 'grid': '1', 'gridSize': '10',
        'page': '1', 'pageWidth': '850', 'pageHeight': '1100',
        'math': '0', 'shadow': '0',
    })
    root = ET.SubElement(model, 'root')
    ET.SubElement(root, 'mxCell', {'id': '0'})
    ET.SubElement(root, 'mxCell', {'id': '1', 'parent': '0'})
    build(root)
    return model


def variant_page(svg, w, h, dark):
    def build(root):
        if dark:
            # A white mark needs something to sit on, or the page looks empty.
            cell(root, 'ground', '',
                 'rounded=0;fillColor=#002e56;strokeColor=none;', 40, 40,
                 w + 80, h + 80)
        cell(root, 'art', '',
             f'shape=image;verticalLabelPosition=bottom;verticalAlign=top;'
             f'imageAspect=1;aspect=fixed;image={data_uri(BRAND / svg)};',
             80, 80, w, h)
    return build


def palette_page(root):
    cell(root, 'title', 'DTaaS colours',
         'text;html=1;fontSize=20;fontStyle=1;fontColor=#003d73;', 40, 30, 400, 30)
    for i, (label, value, note) in enumerate(PALETTE):
        y = 80 + i * 70
        cell(root, f'sw{i}', '',
             f'rounded=0;fillColor={value};strokeColor=#c6c6c6;', 40, y, 90, 50)
        cell(root, f'lb{i}', f'<b>{label}</b><br>{value}<br>{note}',
             'text;html=1;fontSize=12;align=left;verticalAlign=middle;',
             145, y, 520, 50)
    return None


doc = ET.Element('mxfile', {'host': 'app.diagrams.net', 'type': 'device'})
for name, svg, w, h in PAGES:
    d = ET.SubElement(doc, 'diagram', {'name': name, 'id': name.replace(' ', '-')})
    d.append(page(variant_page(svg, w, h, 'white' in svg)))
d = ET.SubElement(doc, 'diagram', {'name': 'Colours', 'id': 'Colours'})
d.append(page(palette_page))

out = BRAND / 'dtaas-brand.drawio'
out.write_bytes(ET.tostring(doc, encoding='utf-8', xml_declaration=True))
print(f'{out} written, {len(PAGES) + 1} pages')
