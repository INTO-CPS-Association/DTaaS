"""Rasterise each brand SVG at the sizes a consumer actually asks for.

Headless Chrome instead of a converter, because it resolves the same font
stack a browser would, and a wordmark rendered any other way would not match
what the site shows.

The binary comes from the CHROME environment variable, falling back to the
usual paths on macOS and on Linux, so this runs in CI as well as here.

Run it from anywhere: every path is resolved from this file.
"""

import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

BRAND = pathlib.Path(__file__).resolve().parent
OUT = BRAND / 'png'

CANDIDATES = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
]

# The mark is square. These are the sizes a favicon, a README badge, a slide
# and a print asset ask for.
MARK_SIZES = (16, 32, 48, 64, 128, 256, 512)
# The lockups keep their aspect ratio, so only a height is given.
LOCKUP_HEIGHTS = (24, 48, 96, 192)

# Width per unit of height, from each lockup's own viewBox.
SHORT_RATIO = 96 / 24
FULL_RATIO = 232 / 24

PAGE = """<!doctype html><meta charset="utf-8">
<style>
  html,body{{margin:0;padding:0;background:transparent}}
  img{{display:block;width:{w}px;height:{h}px}}
</style>
<img src="{src}">
"""


def find_chrome():
    """The browser to rasterise with, or an explanation of why there is none."""
    named = os.environ.get('CHROME')
    if named:
        if not pathlib.Path(named).is_file():
            sys.exit(f'CHROME is set to {named}, which is not a file.')
        return named
    for candidate in CANDIDATES:
        if pathlib.Path(candidate).is_file():
            return candidate
    for name in ('google-chrome', 'chromium', 'chromium-browser'):
        found = shutil.which(name)
        if found:
            return found
    sys.exit('No Chrome or Chromium found. Set CHROME to the binary.')


def render(chrome, work, svg, out, width, height):
    """One PNG, at exactly the size asked for, on a transparent ground."""
    page = work / 'page.html'
    page.write_text(PAGE.format(w=width, h=height, src=svg.as_uri()), encoding='utf-8')
    subprocess.run(
        [chrome, '--headless', '--disable-gpu', '--hide-scrollbars',
         '--default-background-color=00000000', '--force-device-scale-factor=1',
         f'--window-size={width},{height}', f'--screenshot={out}', str(page)],
        check=True, capture_output=True,
    )
    # A browser that cannot resolve the image writes a blank file and exits
    # zero, so the size is the only signal that anything was drawn.
    if not out.exists() or out.stat().st_size < 200:
        sys.exit(f'{out.name} came out empty. The SVG was not resolved.')


def main():
    chrome = find_chrome()
    print(f'rasterising with {chrome}')
    OUT.mkdir(parents=True, exist_ok=True)

    jobs = []
    for variant in ('dtaas-mark', 'dtaas-mark-white', 'dtaas-mark-mono'):
        for size in MARK_SIZES:
            jobs.append((variant, f'{variant}-{size}.png', size, size))
    for variant, ratio in (
        ('dtaas-logo', SHORT_RATIO), ('dtaas-logo-white', SHORT_RATIO),
        ('dtaas-logo-mono', SHORT_RATIO), ('dtaas-logo-full', FULL_RATIO),
        ('dtaas-logo-full-white', FULL_RATIO), ('dtaas-logo-mono-full', FULL_RATIO),
    ):
        for height in LOCKUP_HEIGHTS:
            jobs.append((variant, f'{variant}-{height}h.png', round(height * ratio), height))

    with tempfile.TemporaryDirectory() as work:
        for variant, name, width, height in jobs:
            render(chrome, pathlib.Path(work), BRAND / f'{variant}.svg', OUT / name, width, height)
            print(f'  {name}')
    print(f'{len(jobs)} PNG files written to {OUT}')


if __name__ == '__main__':
    main()
