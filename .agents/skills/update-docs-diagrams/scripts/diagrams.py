"""The one command of the update-docs-diagrams skill.

    python3 diagrams.py retheme <input.drawio> <output.drawio>
    python3 diagrams.py split   <input.drawio> <output.drawio>
    python3 diagrams.py restyle <input.drawio> <output.drawio>
    python3 diagrams.py shrink  <input.drawio> <output.drawio>
    python3 diagrams.py export

retheme maps the colours of a diagram from another drawio file to the theme,
split gives each diagram of a crowded page its own page, restyle applies the
design rules, shrink scales the embedded raster logos down, and export draws
every placed page of docs/assets/diagrams/dtaas-diagrams.drawio, light and
dark. The input and the output may be the same file. shrink needs Pillow, so
it runs through uv with requirements.txt, as SKILL.md shows.
"""

import argparse

from drawio import drawio_path, rewrite_pages
from export import export_all
from restyle import restyle_page
from retheme import retheme
from split import split_file


def run_retheme(source, target):
    """Map the colours to the theme and report the ones left unmapped."""
    left = retheme(source, target)
    print(f'wrote {target}, unmapped colours: {left or "none"}')


def run_split(source, target):
    """Give each diagram of a page its own page."""
    for name in split_file(source, target):
        print(name)


def run_restyle(source, target):
    """Apply the design rules to every page."""
    rewrite_pages(source, target, restyle_page)
    print(f'wrote {target}')


def run_shrink(source, target):
    """Scale every embedded raster logo down to the pixels it is drawn at."""
    # Imported here, so the other steps run without Pillow installed.
    from shrink import shrink_page  # pylint: disable=import-outside-toplevel
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
    steps.add_parser('export', help='Draw every placed page and write the copies.')
    args = parser.parse_args()
    if args.step == 'export':
        export_all()
    else:
        FILE_STEPS[args.step](args.source, args.target)


if __name__ == '__main__':
    main()
