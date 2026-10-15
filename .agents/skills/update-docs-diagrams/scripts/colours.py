"""The colours of the diagrams, and the arithmetic that judges them.

The brand colours are read from `client/src/theme/tokens.ts`, the
authoritative source. The greys are its hsl() greys written as hex, since
drawio wants hex, and test_colours.py checks that they and the dark scheme
colours still match the theme and the site stylesheets. COLOURS maps every
colour the original drawio files use to one of the theme colours.
"""

import re

from settings import TOKENS

WHITE = '#ffffff'

# Minimum WCAG contrast ratios, for text and for lines and borders.
TEXT_MINIMUM = 4.5
LINE_MINIMUM = 3.0


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

# The dark variant. SLATE is the page of Material's slate scheme,
# hsl(220, 15%, 14%) with the hue the site sets, so an image blends into the
# page. The text and line colours are those of the landing page dark scheme.
SLATE = '#1e2229'
LIGHT_TEXT = '#e8ecf3'
DARK_TEXT = '#1e2229'
LIGHT_LINE = '#a9b3c6'
LIGHT_BLUE_LINE = '#8cc8e6'


def channels(colour):
    """The red, green and blue of a #rrggbb colour, from 0 to 255."""
    return [int(colour[i:i + 2], 16) for i in (1, 3, 5)]


def to_hex(values):
    """The #rrggbb colour of three channels from 0 to 255."""
    return '#' + ''.join(f'{round(c):02x}' for c in values)


def luminance(colour):
    """Return the WCAG relative luminance of a #rrggbb colour."""
    linear = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
              for c in (value / 255 for value in channels(colour))]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(first, second):
    """Return the WCAG contrast ratio of two #rrggbb colours."""
    high, low = sorted((luminance(first), luminance(second)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def blend(colour, opacity):
    """Mix a colour with white, as drawio draws it at an opacity in percent."""
    return to_hex(255 - (255 - c) * opacity / 100 for c in channels(colour))


def mix(colour, share):
    """The slate page with a share of a colour mixed in."""
    return to_hex(s * (1 - share) + c * share
                  for s, c in zip(channels(SLATE), channels(colour)))


def text_colour(fill, candidates):
    """Return the first candidate that reaches the text minimum on the fill."""
    for colour in candidates:
        if contrast(colour, fill) >= TEXT_MINIMUM:
            return colour
    raise ValueError(f'no text colour reaches {TEXT_MINIMUM} to 1 on {fill}')


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
