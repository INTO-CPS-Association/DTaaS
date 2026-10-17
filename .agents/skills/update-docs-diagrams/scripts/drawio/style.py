"""Read and write the style and the label of a drawio cell.

A drawio style is a string of `key=value` pairs, with a few bare words such as
`text` or `group`, joined by semicolons. A label is a fragment of HTML.
"""

import base64
import html
import re


# Inline declarations a label may keep. Everything else, such as a font
# family, an italic style or a colour, is decided by the cell style so that
# one rule sets it for the whole file.
KEPT_DECLARATIONS = ('font-size', 'text-align')


def parse_style(style):
    """Return the style as an ordered dict.

    A bare word is stored under the key `(word,)`, because drawio uses the
    same name for a bare word and a key: `image;image=img/docker.svg` is an
    image shape that shows the file, and both parts have to survive.
    """
    result = {}
    for part in (style or '').split(';'):
        if not part:
            continue
        key, sep, value = part.partition('=')
        if sep:
            result[key] = value
        else:
            result[(key,)] = None
    return result


def dump_style(style):
    """Join an ordered style dict back into a drawio style string."""
    parts = [key[0] if isinstance(key, tuple) else f'{key}={value}'
             for key, value in style.items()]
    return ';'.join(parts) + ';'


def kind(style, cell):
    """Name what a cell draws: edge, group, image, text, stencil or box."""
    if cell.get('edge') == '1':
        return 'edge'
    for word in ('group', 'image', 'text'):
        if (word,) in style:
            return word
    if style.get('shape') == 'image':
        return 'image'
    return 'stencil' if 'shape' in style or ('ellipse',) in style else 'box'


def size_text(value):
    """Write a size the way drawio writes it, without a trailing .0."""
    return f'{value:g}'


def svg_data(path):
    """The base64 form drawio keeps an embedded SVG in."""
    return base64.b64encode(path.read_bytes()).decode('ascii')


def svg_image(path):
    """Return the drawio style of an image cell that shows an SVG file."""
    return f'shape=image;aspect=fixed;image=data:image/svg+xml,{svg_data(path)};'


def plain_text(label):
    """Return the visible text of an HTML label on one line."""
    text = re.sub(r'<[^>]+>', ' ', label or '')
    text = html.unescape(text).replace('\xa0', ' ')
    return ' '.join(text.split())


def keep_declarations(match):
    """Rewrite one style attribute, keeping only the allowed declarations."""
    kept = [d.strip() for d in match.group(1).split(';')
            if d.split(':')[0].strip().lower() in KEPT_DECLARATIONS]
    return f' style="{"; ".join(kept)};"' if kept else ''


def raise_sizes(label, minimum):
    """Raise every inline font size in a label to at least the minimum."""
    def bigger(match):
        return f'font-size: {max(int(match.group(1)), minimum)}px'
    return re.sub(r'font-size:\s*(\d+)px', bigger, label)


def strip_trailing_breaks(label):
    """Remove line breaks at the end of a label, without a regex."""
    label = label.strip()
    endings = ('<br>', '<br/>', '<br />')
    while label.lower().endswith(endings):
        label = label[:label.rfind('<')].rstrip()
    return label


def clean_label(label, minimum):
    """Strip italics, bold, colours and fonts from an HTML label."""
    label = re.sub(r'</?[ib](\s[^>]*)?>', '', label)
    label = re.sub(r'\s(color|face)="[^"]*"', '', label)
    label = re.sub(r'\sstyle="([^"]*)"', keep_declarations, label)
    # A subscript prints the instance number below the text size, so the
    # number follows the name at full size instead.
    label = re.sub(r'<sub>(.*?)</sub>', r' \1', label)
    label = strip_trailing_breaks(label)
    return raise_sizes(label, minimum) if minimum else label
