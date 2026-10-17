"""Scale the embedded raster logos down to the pixels they are drawn at.

It needs Pillow, which is imported only here, so every other step runs with the
standard library.
"""

import base64
import io
import math
import re

from config import EXPORT_WIDTH
from drawio.files import Page


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


def shrink(data, form, size):
    """Return the image as base64 PNG data, no larger than the given size."""
    from PIL import Image  # pylint: disable=import-outside-toplevel
    image = Image.open(io.BytesIO(base64.b64decode(data)))
    if image.mode == 'P' and image.width <= size[0] and image.height <= size[1]:
        return data  # already shrunk by an earlier run
    image = image.convert('RGBA')
    if image.width > size[0] or image.height > size[1]:
        image.thumbnail(size, Image.Resampling.LANCZOS)
    if form != 'png':
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
