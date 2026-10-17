"""Where the scripts read and write, resolved from the scripts folder.

The scripts therefore run from any directory.
"""

import pathlib


# The scripts folder, resolved from this file, which sits in scripts/config.
HERE = pathlib.Path(__file__).resolve().parent.parent


# scripts, update-docs-diagrams, skills, .agents, then the repository.
REPO = HERE.parents[3]


DOCS = REPO / 'docs'


SOURCE = DOCS / 'assets/diagrams/dtaas-diagrams.drawio'


TOKENS = REPO / 'client/src/theme/tokens.ts'


BRAND = DOCS / 'assets/brand'


ASSETS = HERE.parent / 'assets'


LOCKUP = BRAND / 'dtaas-logo-full.svg'


MARK = BRAND / 'dtaas-mark.svg'


# The installation pages show the logo from a copy beside the page, as the
# packages under deploy/ do, so a page and its images move together.
LOGOS = ['dtaas-logo-full-192h.png', 'dtaas-logo-full-white-192h.png']
