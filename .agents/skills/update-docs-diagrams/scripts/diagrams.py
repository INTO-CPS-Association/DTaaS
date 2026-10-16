"""The one command of the update-docs-diagrams skill, and the export.

    python3 diagrams.py retheme <input.drawio> <output.drawio>
    python3 diagrams.py split   <input.drawio> <output.drawio>
    python3 diagrams.py restyle <input.drawio> <output.drawio>
    python3 diagrams.py shrink  <input.drawio> <output.drawio>
    python3 diagrams.py check
    python3 diagrams.py export

The input and the output may be the same file. shrink needs Pillow, so it
runs through uv with requirements.txt, as SKILL.md shows.

A page named after a path under `docs/` is exported to that path, and a page
named after a path under `deploy/` there. A page with any other name is a
diagram the documentation does not show yet, and is skipped. Before it draws
anything, the export checks the dark variant against the contrast minimums
and every placed page against the layout rules, and stops on a problem not
listed in config.py. Every page under `docs/` is exported light and, unless
it is in LIGHT_ONLY, dark. The copies in DEPLOY_COPIES and the logos beside
the installation pages are then written from their sources.

The drawio binary is taken from the DRAWIO environment variable, then from
drawio on the PATH, then from the default install location on macOS and
Windows.

The first half of the file reads and writes drawio files. A drawio style is a
string of `key=value` pairs, with a few bare words such as `text` or `group`,
joined by semicolons. A label is a fragment of HTML. Every step reads and
writes cells through these helpers. The end of the file splits a page that
draws several diagrams into one page each.
"""

import argparse
import base64
import copy
import html
import math
import os
import pathlib
import platform
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from config import (
    BORDER, CONTRAST_EXCEPTIONS, DEPLOY_COPIES, DISPLAY_WIDTH, DOCS, EXPORT_WIDTH, FREE_FORM,
    LAYOUT_EXCEPTIONS, LIGHT_ONLY, LOGOS, LOGO_PAGES, MIN_TEXT_PX, REPO, SOURCE,
)


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


def drawio_path(argument):
    """Resolve a file named on the command line.

    It must be a .drawio file inside the current directory, so a mistyped or
    crafted argument cannot read or overwrite a file elsewhere.
    """
    base = pathlib.Path.cwd().resolve()
    path = pathlib.Path(argument).resolve()
    if path.suffix != '.drawio' or not path.is_relative_to(base):
        raise SystemExit(f'{path} must be a .drawio file under {base}')
    return path


def rewrite_pages(source, target, change):
    """Apply a change to every page of a drawio file and write the result."""
    tree = ET.parse(source)
    for diagram in tree.getroot().iter('diagram'):
        change(diagram)
    write_drawio(tree, target)


def write_drawio(tree, target):
    """Write a drawio file one element per line, with its page count and a last newline."""
    root = tree.getroot()
    root.set('pages', str(len(root.findall('diagram'))))
    ET.indent(tree, space='  ')
    pathlib.Path(target).write_text(ET.tostring(root, encoding='unicode') + '\n', encoding='utf-8')


class Page:
    """One diagram page, with the scale its sizes are converted by.

    Sizes are written in displayed pixels and converted per page, so a line
    or a label looks the same in a small diagram and a large one.
    """

    def __init__(self, diagram):
        self.name = diagram.get('name')
        self.root = diagram.find('mxGraphModel/root')
        self.cells = {c.get('id'): c for c in self.root}
        boxes = [self.absolute(c) for c in self.root if c.get('vertex') == '1']
        boxes = [b for b in boxes if b]
        # A page with no boxes is drawn at the column width.
        width = max(b[2] for b in boxes) - min(b[0] for b in boxes) if boxes else 0
        self.width = width or DISPLAY_WIDTH
        self.units_per_px = self.width / DISPLAY_WIDTH
        self.placed = self.name.endswith('.png')

    def units(self, pixels):
        """Convert displayed pixels to drawio units, in quarter steps."""
        return round(pixels * self.units_per_px * 4) / 4

    def min_font(self):
        """Return the smallest font size, in units, a label may have."""
        if not self.placed:
            return 0
        return max(12, math.ceil(MIN_TEXT_PX * self.units_per_px))

    def absolute(self, cell):
        """Return (x, y, right, bottom) of a vertex in page coordinates."""
        box = cell.find('mxGeometry')
        if box is None or box.get('width') is None:
            return None
        x, y = float(box.get('x', 0)), float(box.get('y', 0))
        parent = self.cells.get(cell.get('parent'))
        while parent is not None and parent.find('mxGeometry') is not None:
            x += float(parent.find('mxGeometry').get('x', 0))
            y += float(parent.find('mxGeometry').get('y', 0))
            parent = self.cells.get(parent.get('parent'))
        return x, y, x + float(box.get('width')), y + float(box.get('height'))


# Cells closer than this, in drawio units, belong to the same diagram.
GAP = 40


# The section titles of the original are 16 pixel bold text.
TITLE = 'font-size: 16px'


def cell_box(cell):
    """Return the bounding box of a top level cell, or None if it has none."""
    geometry = cell.find('mxGeometry')
    if geometry is None:
        return None
    if cell.get('edge') == '1':
        return edge_box(cell, geometry)
    x, y = float(geometry.get('x', 0)), float(geometry.get('y', 0))
    return (x, y, x + float(geometry.get('width', 0)),
            y + float(geometry.get('height', 0)))


def edge_box(cell, geometry):
    """Return the bounding box of the free points of an edge."""
    # drawio keeps a stale end point after an end is connected to a shape,
    # so only the ends that are not connected count.
    ignored = {'sourcePoint'} if cell.get('source') else set()
    ignored |= {'targetPoint'} if cell.get('target') else set()
    points = [(float(p.get('x', 0)), float(p.get('y', 0)))
              for p in geometry.iter('mxPoint') if p.get('as') not in ignored]
    if not points:
        return None
    xs, ys = zip(*points)
    return min(xs), min(ys), max(xs), max(ys)


def near(a, b):
    """Tell whether two boxes are closer than the gap."""
    return (a[0] - GAP < b[2] and b[0] - GAP < a[2]
            and a[1] - GAP < b[3] and b[1] - GAP < a[3])


def clusters(boxes):
    """Group indices of boxes that touch, directly or through a chain."""
    parent = list(range(len(boxes)))

    def find(i):
        """Return the root of the group that holds box i."""
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i, a in enumerate(boxes):
        for j in range(i + 1, len(boxes)):
            if near(a, boxes[j]):
                parent[find(i)] = find(j)
    groups = {}
    for i in range(len(boxes)):
        groups.setdefault(find(i), []).append(i)
    return list(groups.values())


def is_text(cell):
    """Tell whether a cell is a plain text label."""
    return (cell.get('style') or '').startswith('text;')


def is_title(cell):
    """Tell whether a cell is a section title of the original page."""
    return is_text(cell) and TITLE in (cell.get('value') or '')


def top_level_ids(root, layer):
    """Map every cell id to the id of the top level cell that contains it."""
    parents = {c.get('id'): c.get('parent') for c in root}
    result = {}
    for cid in parents:
        current = cid
        while parents.get(current) not in (layer, None):
            current = parents[current]
        result[cid] = current
    return result


def attached(cell, keep, top_of):
    """Tell whether an edge ends on a cell that is kept."""
    ends = (cell.get('source'), cell.get('target'))
    return any(end and top_of.get(end) in keep for end in ends)


def split(diagram):
    """Yield one diagram element per diagram drawn on the page."""
    root = diagram.find('mxGraphModel/root')
    # The first cell has no parent, and the layer is its child.
    base = [c for c in root if c.get('parent') is None][0].get('id')
    layer = [c for c in root if c.get('parent') == base][0].get('id')
    top = [c for c in root if c.get('parent') == layer and not is_title(c)]
    boxed = [(c, cell_box(c)) for c in top]
    boxed = [(c, b) for c, b in boxed if b is not None]
    top_of = top_level_ids(root, layer)
    for index, members in enumerate(clusters([b for _, b in boxed])):
        if all(is_text(boxed[i][0]) for i in members):
            continue
        keep = {boxed[i][0].get('id') for i in members}
        # An edge with no points of its own goes with the cells it joins.
        keep |= {c.get('id') for c in top if attached(c, keep, top_of)}
        page = copy.deepcopy(diagram)
        page.set('name', f"{diagram.get('name')}-{index:02d}")
        page.set('id', f"{diagram.get('id')}-{index:02d}")
        keep_only(page.find('mxGraphModel/root'), keep, top_of, (base, layer))
        yield page


def keep_only(root, keep, top_of, structural):
    """Remove every cell outside the kept top level cells."""
    # A removed group takes its children with it.
    doomed = [cell for cell in root
              if cell.get('id') not in structural
              and top_of.get(cell.get('id')) not in keep]
    for cell in doomed:
        root.remove(cell)


def split_file(source, target):
    """Write a drawio file with one page per diagram, and return the page names."""
    tree = ET.parse(source)
    pages = [p for d in tree.getroot().iter('diagram') for p in split(d)]
    out = ET.Element('mxfile', {'host': 'drawio', 'pages': str(len(pages))})
    out.extend(pages)
    write_drawio(ET.ElementTree(out), target)
    return [page.get('name') for page in pages]


# Where the drawio desktop installer puts the binary on each system.
DRAWIO_INSTALLED = {
    'Darwin': '/Applications/draw.io.app/Contents/MacOS/draw.io',
    'Windows': r'C:\Program Files\draw.io\draw.io.exe',
}


# A page name is a path, and a page brought in from another drawio file can
# carry any name, so every target must stay inside these two folders.
ALLOWED = (DOCS.resolve(), (REPO / 'deploy').resolve())


def find_drawio():
    """The drawio binary: DRAWIO, then drawio on the PATH, then the installer's place."""
    return (os.environ.get('DRAWIO') or shutil.which('drawio')
            or DRAWIO_INSTALLED.get(platform.system(), 'drawio'))


def target_of(name):
    """Return where a page is exported, or None for an unplaced page."""
    if not name or not name.endswith('.png') or pathlib.PurePath(name).is_absolute():
        return None
    target = ((REPO if name.startswith('deploy/') else DOCS) / name).resolve()
    if not any(target.is_relative_to(root) for root in ALLOWED):
        raise SystemExit(f'page name {name!r} resolves outside docs/ and deploy/')
    return target


def dark_target(target):
    """Where the dark image of a documentation page goes, or None."""
    resolved = target.resolve()
    if not resolved.is_relative_to(ALLOWED[0]):
        return None
    if resolved.relative_to(ALLOWED[0]).as_posix() in LIGHT_ONLY:
        return None
    return target.with_name(f'{target.stem}-dark{target.suffix}')


def has_dark_image(page):
    """Whether a page is exported with a dark variant: placed under docs/, not LIGHT_ONLY."""
    target = target_of(page)
    return bool(target and dark_target(target))


def stop_on(problems, exceptions, what, hint):
    """Print the problems not listed as exceptions, and stop when there are any."""
    unlisted = [problem for problem in problems if problem[:2] not in exceptions]
    for page, cell, problem in unlisted:
        print(f'{what} on {page}, cell {cell}: {problem}')
    if unlisted:
        raise SystemExit(f'{len(unlisted)} {what} problems, {hint}')


def check_contrast(failures):
    """Stop the export on an unlisted contrast failure of a page with a dark image.

    Pages under deploy/ and LIGHT_ONLY pages have no dark image, so their
    dark cells are not judged.
    """
    failures = [failure for failure in failures if has_dark_image(failure[0])]
    stop_on(failures, CONTRAST_EXCEPTIONS, 'contrast',
            'fix them in drawio or list them in CONTRAST_EXCEPTIONS')
    print('every dark variant meets the contrast minimums')


def copy_logos():
    """Write the copies of the logo beside the installation pages."""
    for folder in LOGO_PAGES:
        for logo in LOGOS:
            shutil.copyfile(DOCS / 'assets/brand/png' / logo, DOCS / folder / logo)
        print(f'copied the logos to docs/{folder}')


def copy_to_packages():
    """Write the package copies of the documentation images."""
    for source, copies in DEPLOY_COPIES.items():
        for package_copy in copies:
            shutil.copyfile(DOCS / source, REPO / package_copy)
            print(f'copied {source} to {package_copy}')


def draw(drawio, source, number, target, form='png'):
    """Draw one page of a drawio file to a PNG or an SVG file.

    The SVG keeps the scale of the drawio file, so the layout check can
    compare its lines with the cells.
    """
    size = ['--width', str(EXPORT_WIDTH), '--border', str(BORDER)] if form == 'png' else []
    # drawio numbers pages from 1.
    result = subprocess.run([drawio, '-x', '-f', form, '--theme', 'light', *size,
                             '-p', str(number), '-o', str(target), str(source)],
                            check=False, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f'drawio could not export page {number}: {result.stderr.strip()}')


def check_layout(drawio, scratch):
    """Stop the export when a placed page has an unlisted layout problem."""
    # design.py reads drawio files through this one, so it is imported here.
    from design import check_page  # pylint: disable=import-outside-toplevel
    problems = []
    for number, diagram in enumerate(ET.parse(SOURCE).getroot().iter('diagram'), start=1):
        name = diagram.get('name')
        if target_of(name):
            svg = scratch / f'page-{number}.svg'
            draw(drawio, SOURCE, number, svg, form='svg')
            problems += check_page(diagram, svg.read_text(encoding='utf-8'),
                                   connectors=name not in FREE_FORM)
    stop_on(problems, LAYOUT_EXCEPTIONS, 'layout',
            'fix them in drawio or list them in LAYOUT_EXCEPTIONS')
    print('every placed page meets the layout rules')


def located_drawio():
    """The drawio binary, or a stop with the reason when it is missing."""
    drawio = find_drawio()
    if not pathlib.Path(drawio).exists():
        raise SystemExit(f'drawio not found at {drawio}, set DRAWIO')
    print(f'using {drawio}')
    return drawio


def check_all():
    """Run the contrast and the layout checks without drawing any image."""
    # design.py reads drawio files through this one, so it is imported here.
    from design import write_dark  # pylint: disable=import-outside-toplevel
    with tempfile.TemporaryDirectory() as scratch:
        check_contrast(write_dark(SOURCE, pathlib.Path(scratch) / 'dark.drawio'))
        check_layout(located_drawio(), pathlib.Path(scratch))


def export_all():
    """Check, export every placed page, then copy images into the packages and pages."""
    # design.py reads drawio files through this one, so it is imported here.
    from design import write_dark  # pylint: disable=import-outside-toplevel
    drawio = located_drawio()
    names = [page.get('name') for page in ET.parse(SOURCE).getroot().iter('diagram')]
    with tempfile.TemporaryDirectory() as scratch:
        dark = pathlib.Path(scratch) / 'dark.drawio'
        check_contrast(write_dark(SOURCE, dark))
        check_layout(drawio, pathlib.Path(scratch))
        for number, name in enumerate(names, start=1):
            target = target_of(name)
            if target is None:
                print(f'skipped page {number}, {name}')
                continue
            draw(drawio, SOURCE, number, target)
            print(f'wrote {target.relative_to(REPO)}')
            if dark_target(target):
                draw(drawio, dark, number, dark_target(target))
                print(f'wrote {dark_target(target).relative_to(REPO)}')
    copy_to_packages()
    copy_logos()


def run_retheme(source, target):
    """Map the colours to the theme and report the ones left unmapped."""
    # design.py reads drawio files through this one, so it is imported here.
    from design import retheme  # pylint: disable=import-outside-toplevel
    left = retheme(source, target)
    print(f'wrote {target}, unmapped colours: {left or "none"}')


def run_split(source, target):
    """Give each diagram of a page its own page."""
    for name in split_file(source, target):
        print(name)


def run_restyle(source, target):
    """Apply the design rules to every page."""
    # design.py reads drawio files through this one, so it is imported here.
    from design import restyle_page  # pylint: disable=import-outside-toplevel
    rewrite_pages(source, target, restyle_page)
    print(f'wrote {target}')


def run_shrink(source, target):
    """Scale every embedded raster logo down to the pixels it is drawn at."""
    # design.py reads drawio files through this one, so it is imported here.
    from design import shrink_page  # pylint: disable=import-outside-toplevel
    rewrite_pages(source, target, shrink_page)
    print(f'wrote {target}, {target.stat().st_size // 1024} KiB')


FILE_STEPS = {
    'retheme': run_retheme,
    'split': run_split,
    'restyle': run_restyle,
    'shrink': run_shrink,
}


def main():
    """Run the step named on the command line."""
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    steps = parser.add_subparsers(dest='step', required=True)
    for name, step in FILE_STEPS.items():
        command = steps.add_parser(name, help=step.__doc__)
        command.add_argument('source', type=drawio_path)
        command.add_argument('target', type=drawio_path)
    steps.add_parser('check', help='Check contrast and layout without drawing.')
    steps.add_parser('export', help='Check, then draw every placed page and write the copies.')
    args = parser.parse_args()
    if args.step == 'check':
        check_all()
    elif args.step == 'export':
        export_all()
    else:
        FILE_STEPS[args.step](args.source, args.target)


if __name__ == '__main__':
    main()
