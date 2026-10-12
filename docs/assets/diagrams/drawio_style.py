"""Small helpers for reading and writing drawio styles and labels.

A drawio style is a string of `key=value` pairs, with a few bare words such
as `text` or `group`, joined by semicolons. A label is a fragment of HTML.
`restyle_drawio.py` uses these helpers to apply the design rules of the
documentation to every cell.
"""

import html
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

WHITE = '#ffffff'

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


def luminance(colour):
    """Return the WCAG relative luminance of a #rrggbb colour."""
    channels = [int(colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
              for c in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(first, second):
    """Return the WCAG contrast ratio of two #rrggbb colours."""
    high, low = sorted((luminance(first), luminance(second)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def blend(colour, opacity):
    """Mix a colour with white, as drawio draws it at an opacity in percent."""
    mixed = [round(255 - (255 - int(colour[i:i + 2], 16)) * opacity / 100)
             for i in (1, 3, 5)]
    return '#' + ''.join(f'{c:02x}' for c in mixed)


def text_colour(fill, candidates):
    """Return the first candidate that reaches 4.5 to 1 on the fill."""
    for colour in candidates:
        if contrast(colour, fill) >= 4.5:
            return colour
    raise ValueError(f'no text colour reaches 4.5 to 1 on {fill}')


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


def clean_label(label, minimum):
    """Strip italics, bold, colours and fonts from an HTML label."""
    label = re.sub(r'</?[ib](\s[^>]*)?>', '', label)
    label = re.sub(r'\s(color|face)="[^"]*"', '', label)
    label = re.sub(r'\sstyle="([^"]*)"', keep_declarations, label)
    # A subscript prints the instance number below the text size, so the
    # number follows the name at full size instead.
    label = re.sub(r'<sub>(.*?)</sub>', r' \1', label)
    label = re.sub(r'(<br\s*/?>)+$', '', label.strip())
    return raise_sizes(label, minimum) if minimum else label


def rewrite_file(usage, change):
    """Apply a change to every page of the file named on the command line.

    The two arguments are the input and the output file, which may be the
    same. Return the path of the output file.
    """
    if len(sys.argv) != 3:
        raise SystemExit(usage)
    source, target = (pathlib.Path(arg) for arg in sys.argv[1:])
    tree = ET.parse(source)
    for diagram in tree.getroot().iter('diagram'):
        change(diagram)
    tree.write(target, encoding='unicode')
    return target
