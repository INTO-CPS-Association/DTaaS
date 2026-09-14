"""Build the DTaaS brand kit from one description of the mark.

The geometry is written once here and every file is generated from it, so a
change to the mark cannot leave one variant behind. The mark itself is the
same geometry as client/src/components/BrandMark.tsx and
client/public/favicon.svg.
"""

import pathlib
import re

# Resolved from this file, so the output lands beside the generator
# whatever directory the command was run from.
OUT = pathlib.Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)

# The colours are read from client/src/theme/tokens.ts, which the brand README
# names as authoritative. Repeating them here would mean two places to change
# and one of them silently stale.
TOKENS = pathlib.Path(__file__).resolve().parents[3] / 'client/src/theme/tokens.ts'


def token(name):
    """One `name: '#value'` entry from the theme's brand block."""
    match = re.search(rf"^\s*{name}:\s*'(#[0-9a-fA-F]{{6}})'", TOKENS.read_text(), re.M)
    if match is None:
        raise SystemExit(f'{name} not found in {TOKENS}')
    return match.group(1)


# AU blue, Pantone 287, RGB 0 61 115, as the university publishes it.
BLUE = token('primary')
# The navy the university's own site uses for a solid field. It appears ninety
# times in cdn.au.dk/2016/assets/css/app.css, as text and as background, where
# #003d73 appears thirteen, so this is what a block of AU colour looks like in
# practice.
NAVY = token('primaryDark')
# The cyan of the secondary palette. It carries the drawn half, and it is read
# on the navy field and never on white, which is where it would fail contrast.
CYAN = token('markAccent')
WHITE = '#ffffff'
BLACK = '#000000'

# The field. A corner of 22 percent and a margin of 17 percent, which keeps the
# figure off the edge and the corner visible down to sixteen pixels.
TILE_RADIUS = 24 * 0.22
TILE_MARGIN = 24 * 0.17
TILE_SCALE = 1 - 0.17 * 2

SHOULDERS = 'M3.6 21.5 c0 -4.7 3.8 -7.4 8.4 -7.4 s8.4 2.7 8.4 7.4 Z'

FIGURE = """  <defs>
    <clipPath id="dtaas-built-{u}"><rect x="0" y="0" width="12" height="24"/></clipPath>
    <clipPath id="dtaas-drawn-{u}"><rect x="12" y="0" width="12" height="24"/></clipPath>
  </defs>
  <g clip-path="url(#dtaas-built-{u})">
    <circle cx="12" cy="7.8" r="4.1" fill="{a}" stroke="{a}" stroke-width="1.7"/>
    <path d="%s" fill="{a}" stroke="{a}" stroke-width="1.7" stroke-linejoin="round"/>
  </g>
  <g clip-path="url(#dtaas-drawn-{u})">
    <circle cx="12" cy="7.8" r="4.1" fill="none" stroke="{b}" stroke-width="1.7"/>
    <path d="%s" fill="none" stroke="{b}" stroke-width="1.7" stroke-linejoin="round"/>
  </g>""" % (SHOULDERS, SHOULDERS)


def figure(built, drawn, uid=''):
    """The figure on its own, for a ground that is already coloured."""
    return FIGURE.format(a=built, b=drawn, u=uid)


def tile(ground, built, drawn, uid=''):
    """The figure on its own field, which is how the university uses colour."""
    inner = figure(built, drawn, uid).replace('\n', '\n    ')
    return (f'  <rect width="24" height="24" rx="{TILE_RADIUS:g}" fill="{ground}"/>\n'
            f'  <g transform="translate({TILE_MARGIN:g},{TILE_MARGIN:g}) '
            f'scale({TILE_SCALE:g})">\n  {inner}\n  </g>')

NOTE = """  <!--
    One figure, built on one side and drawn on the other, because a twin is one
    thing in two states. The drawn half is a continuous outline and not a
    dashed one: a dash breaks into specks at the sixteen pixels a browser tab
    gives it.

    Generated from docs/assets/brand/build_brand.py. Do not edit by hand.
  -->"""

FONT = ("Inter, 'Inter var', -apple-system, BlinkMacSystemFont, "
        "'Segoe UI', Roboto, Helvetica, Arial, sans-serif")


def mark(body, uid=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
            f'role="img" aria-label="DTaaS">\n{NOTE}\n' + body + '\n</svg>\n')


def lockup(body, word_colour, text, width, size, weight, tracking):
    """The mark with a wordmark beside it, on one baseline."""
    inner = body.replace('\n', '\n  ')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 24" '
            f'role="img" aria-label="{text}">\n{NOTE}\n'
            f'  <g>\n  {inner}\n  </g>\n'
            f'  <text x="30" y="16.6" fill="{word_colour}" font-family="{FONT}" '
            f'font-size="{size}" font-weight="{weight}" '
            f'letter-spacing="{tracking}">{text}</text>\n</svg>\n')


# The two wordmarks, each written once, so a rename cannot leave a lockup
# behind. SHORT_NAME is what a toolbar has room for, FULL_NAME what a title
# slide wants.
SHORT_NAME = 'DTaaS'
FULL_NAME = 'Digital Twin as a Service'

# Width, font size, weight and letter spacing, per wordmark.
SHORT_METRICS = (96, 13.5, 700, '0.2')
FULL_METRICS = (232, 11.5, 600, '0.1')

# Three forms, each in three colourways. The primary carries its own field,
# which is how the university uses colour and what lets one file work on a light
# page and a dark one. The white and the mono forms are the figure alone, for a
# ground that is already coloured and for one colour printing.
FILES = {
    'dtaas-mark.svg': mark(tile(NAVY, WHITE, CYAN, 'm')),
    'dtaas-mark-white.svg': mark(figure(WHITE, CYAN, 'mw')),
    'dtaas-mark-mono.svg': mark(figure(BLACK, BLACK, 'mm')),
    'dtaas-logo.svg': lockup(tile(NAVY, WHITE, CYAN, 'l'), NAVY, SHORT_NAME, *SHORT_METRICS),
    'dtaas-logo-white.svg': lockup(figure(WHITE, CYAN, 'lw'), WHITE, SHORT_NAME, *SHORT_METRICS),
    'dtaas-logo-mono.svg': lockup(figure(BLACK, BLACK, 'lm'), BLACK, SHORT_NAME, *SHORT_METRICS),
    'dtaas-logo-full.svg': lockup(tile(NAVY, WHITE, CYAN, 'f'), NAVY, FULL_NAME, *FULL_METRICS),
    'dtaas-logo-full-white.svg': lockup(figure(WHITE, CYAN, 'fw'), WHITE, FULL_NAME, *FULL_METRICS),
    'dtaas-logo-mono-full.svg': lockup(figure(BLACK, BLACK, 'fm'), BLACK, FULL_NAME, *FULL_METRICS),
}

for name, body in FILES.items():
    (OUT / name).write_text(body, encoding='utf-8')

print(f'{len(FILES)} SVG files written to {OUT}')
