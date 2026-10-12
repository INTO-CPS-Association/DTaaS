"""Export each page of the diagrams file to the image the documentation uses.

A page named after a path under `docs/`, such as
`admin/workspace/localhost/localhost.png`, is exported to that path. A page
with any other name is a diagram the documentation does not show yet, and is
skipped.

The drawio desktop application does the drawing. Its binary is taken from the
DRAWIO environment variable, and defaults to the macOS install location.

Usage: python3 export_diagrams.py
"""

import os
import pathlib
import subprocess
import xml.etree.ElementTree as ET

# Resolved from this file, so the script runs from any directory.
HERE = pathlib.Path(__file__).resolve().parent
DOCS = HERE.parents[1]
SOURCE = HERE / 'dtaas-diagrams.drawio'

DRAWIO = os.environ.get(
    'DRAWIO', '/Applications/draw.io.app/Contents/MacOS/draw.io')

# Twice the drawn size, so the images stay sharp on a high density screen.
SCALE = 2


def main():
    if not pathlib.Path(DRAWIO).exists():
        raise SystemExit(f'drawio not found at {DRAWIO}, set DRAWIO')
    print(f'using {DRAWIO}')
    pages = ET.parse(SOURCE).getroot().iter('diagram')
    for number, page in enumerate(pages, start=1):
        name = page.get('name')
        if not name.endswith('.png'):
            print(f'skipped page {number}, {name}')
            continue
        target = DOCS / name
        # drawio numbers pages from 1.
        subprocess.run([DRAWIO, '-x', '-f', 'png', '-s', str(SCALE),
                        '-p', str(number), '-o', str(target), str(SOURCE)],
                       check=True, capture_output=True)
        print(f'wrote {target.relative_to(DOCS.parent)}')


if __name__ == '__main__':
    main()
