"""The colour arithmetic every step uses: WCAG luminance and contrast.
"""

import re

from config import SLATE


# Minimum WCAG contrast ratios, for text and for lines and borders.
TEXT_MINIMUM = 4.5


LINE_MINIMUM = 3.0


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


HEX_VALUE = re.compile(r'^#[0-9a-fA-F]{6}$')


def hex_of(value, default):
    """A #rrggbb colour from a drawio value, or the default for 'default'."""
    if value in (None, 'default'):
        return default
    return value.lower() if HEX_VALUE.match(value or '') else None
