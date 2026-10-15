"""Shrink the raster logos embedded in the diagrams file.

drawio cannot share an image between cells, so every cell carries its own
copy as base64. The traefik logo alone was an 870 by 1200 PNG repeated in
eleven cells. Each raster image is scaled down to the pixels the export
actually draws, which is twice the size the documentation shows at its widest
column, so nothing is lost in the PNG files.

A JPEG has no transparency, so it is turned into a PNG and its white
background into transparency. A logo whose owner forbids changes to it, such
as GitLab's, is embedded as the owner's SVG and never passes through here,
since only raster images are rewritten.

Needs Pillow, so run it through uv with the pinned requirements:

    uv run --with-requirements .agents/skills/update-docs-diagrams/scripts/requirements.txt \
        python .agents/skills/update-docs-diagrams/scripts/diagrams.py shrink in out
"""

import base64
import io
import math
import re

from PIL import Image

from drawio import Page
from settings import EXPORT_WIDTH

RASTER = re.compile(r'image=data:image/(png|jpg|jpeg),([A-Za-z0-9+/=]+)')


def white_to_alpha(image):
    """Turn a white background into transparency, keeping soft edges."""
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    for x in range(rgba.width):
        for y in range(rgba.height):
            pixels[x, y] = clear_white(pixels[x, y])
    return rgba


def clear_white(pixel):
    """Return one pixel with its white part made transparent."""
    # How far the pixel is from white decides how opaque it stays, and the
    # colour is divided back out so an edge does not keep a white halo.
    alpha = 255 - min(pixel[:3])
    if alpha == 0:
        return 0, 0, 0, 0
    colour = (round(255 - (255 - c) * 255 / alpha) for c in pixel[:3])
    return (*colour, alpha)


def shrink(data, kind, size):
    """Return the image as base64 PNG data, no larger than the given size."""
    image = Image.open(io.BytesIO(base64.b64decode(data)))
    if image.mode == 'P' and image.width <= size[0] and image.height <= size[1]:
        return data  # already shrunk by an earlier run
    image = image.convert('RGBA')
    if image.width > size[0] or image.height > size[1]:
        image.thumbnail(size, Image.Resampling.LANCZOS)
    if kind != 'png':
        image = white_to_alpha(image)
    # A logo has few colours, so a palette of 256 keeps it unchanged to the
    # eye at half the bytes.
    image = image.quantize(256, method=Image.Quantize.FASTOCTREE)
    out = io.BytesIO()
    image.save(out, 'PNG', optimize=True)
    return base64.b64encode(out.getvalue()).decode('ascii')


def shrink_cell(cell, pixels_per_unit):
    """Rewrite the raster image of one cell, if it has one."""
    style = cell.get('style') or ''
    match = RASTER.search(style)
    box = cell.find('mxGeometry')
    if match is None or box is None:
        return
    size = tuple(math.ceil(float(box.get(side)) * pixels_per_unit)
                 for side in ('width', 'height'))
    data = shrink(match.group(2), match.group(1), size)
    cell.set('style', style.replace(match.group(0),
                                    f'image=data:image/png,{data}'))


def shrink_page(diagram):
    """Shrink every raster image on one page."""
    page = Page(diagram)
    pixels_per_unit = EXPORT_WIDTH / page.width
    for cell in page.root:
        shrink_cell(cell, pixels_per_unit)
