"""The paths, page lists, sizes and theme colours a maintainer edits.

The word lists of the wording rules (TITLES, MINOR and SPELLING) stay beside
the rules in design.py, since they are read only there. Paths are resolved
from this file, so the scripts run from any directory. The brand colours are
read from `client/src/theme/tokens.ts`, the authoritative source, and
test_design.py checks that the colours repeated here and in the
site stylesheets still match it. COLOURS maps every colour the original
drawio files use to a theme colour.
"""

import pathlib
import re


# Resolved from this file, so the scripts run from any directory.
HERE = pathlib.Path(__file__).resolve().parent


# scripts, update-docs-diagrams, skills, .agents, then the repository.
REPO = HERE.parents[3]


DOCS = REPO / 'docs'


SOURCE = DOCS / 'assets/diagrams/dtaas-diagrams.drawio'


TOKENS = REPO / 'client/src/theme/tokens.ts'


BRAND = DOCS / 'assets/brand'


ASSETS = HERE.parent / 'assets'


LOCKUP = BRAND / 'dtaas-logo-full.svg'


MARK = BRAND / 'dtaas-mark.svg'


# Each logo drawn with dark text, and the white version its owner publishes,
# which the dark variant shows in its place.
WHITE_VERSIONS = [
    (LOCKUP, BRAND / 'dtaas-logo-full-white.svg'),
    (ASSETS / 'gitlab-logo-100-rgb.svg', ASSETS / 'gitlab-logo-200-rgb.svg'),
]

# Sequence diagrams, whose loose text annotates a message, as the label of an
# arrow does, so it reads as a sentence and not as a title.
SEQUENCE_DIAGRAMS = {
    'developer/technical-concepts/oauth/design-sequence.png',
    'developer/technical-concepts/oauth/oauth2-workflow.png',
}

# Logos drawn with dark lettering that have no white version to swap in. The
# dark variant draws them on a light plate, unchanged. A cell matches when its
# style holds one of these strings: the drawio library path of the Docker logo,
# or the darkLettering key set on the cells that embed the traefik logo.
DARK_LETTERING = ('img/lib/mscae/Docker.svg', 'darkLettering=1')


# The narrowest content column of the documentation theme, in CSS pixels.
# Text is sized so it reaches MIN_TEXT_PX when a page is shown this wide.
DISPLAY_WIDTH = 700


MIN_TEXT_PX = 14


# Every image is drawn this many pixels wide: twice the widest content column
# of the documentation, so it stays sharp on a high density screen.
EXPORT_WIDTH = 1600

# The empty margin, in pixels, the export leaves round each image.
BORDER = 8


# Pages that draw a concept and not the DTaaS system, so their largest box is
# not the DTaaS boundary and they carry no mark.
NO_MARK = {
    'developer/system/architecture.png',
    'developer/system/research-overview/devops.png',
    'developer/system/research-overview/dt-assets-relationship.png',
    'developer/system/research-overview/dtaas-class-instance.png',
    'developer/system/research-overview/federated-dtaas.png',
    'admin/servers/lib/file-system-layout.png',
    'user/digital-twins/asset-relationship.png',
    'user/servers/lib/author.png',
    'developer/system/current-status-developer.png',
    'developer/system/research-overview/implementation-status.png',
    'developer/system/research-overview/lifecycle-phases.png',
    'developer/system/research-overview/shm-dt-workflow.png',
    'developer/system/research-overview/system-architecture-c4.png',
    'developer/system/research-overview/user-interaction-in-federated-DTaaS.png',
    'developer/technical-concepts/oauth/design-sequence.png',
    'developer/technical-concepts/oauth/oauth2-workflow.png',
    'user/servers/lib/library-assets.png',
}


# Pages exported in their light version only. The documentation shows the
# light image on a white backing (the on-white class) in both schemes.
LIGHT_ONLY = {
    # Its third-party logos keep dark lettering that does not read on slate.
    'developer/system/current-status-developer.png',
    # The fills code the four layers of ISO 23247, and the slate page would
    # leave them indistinguishable.
    'developer/system/research-overview/implementation-status.png',
    'developer/system/research-overview/system-architecture-c4.png',
}


# Cells of placed pages allowed below the contrast minimums of the dark
# variant, as (page name, cell id): the reason. Empty: every dark image passes.
CONTRAST_EXCEPTIONS = {}


# Pages drawn free hand, where the connector rules of the layout check in design.py (no slant, no
# shared attach point, no line behind another box) do not apply. The label
# rules still do.
FREE_FORM = {
    'developer/system/architecture.png':
        'spokes and curved arrows drawn around the service mesh',
    'developer/system/current-status-developer.png':
        'the same hub as architecture.png, with the status of each part',
    'developer/technical-concepts/oauth/design-sequence.png':
        'a sequence diagram, whose messages cross the lifelines between ends',
    'developer/technical-concepts/oauth/oauth2-workflow.png':
        'a sequence diagram, whose messages cross the lifelines between ends',
    'user/servers/lib/author.png':
        'a two-step flow drawn along a diagonal, with its labels turned to match',
}


# The network pictogram inside Communication is drawn with lines between
# small boxes, which are not connectors.
NETWORK_ICON = 'a line of the network pictogram inside Communication'


# Cells of placed pages allowed to break a layout rule, as (page name, cell
# id): the reason.
LAYOUT_EXCEPTIONS = {
    **{(page, f'j32rHh5SlOpBDfbG7lMq-{cell}'): NETWORK_ICON
       for page in ('user/DTaaS-user-view.png',
                    'developer/system/research-overview/system-architecture.png')
       for cell in (1117, 1118, 1119, 1120)},
    **{('developer/system/research-overview/dtaas-userview.png', f'u-net-l{line}'):
       NETWORK_ICON for line in range(4)},
    # The two bars mark the boundaries between the lifecycle phases, and the
    # arrows from one phase to the next cross them on purpose.
    **{('developer/system/research-overview/lifecycle-phases.png', edge):
       'an arrow crossing a phase boundary' for edge in ('c12', 'c13', 'c15', 'c16')},
}


# The installation packages under deploy/ carry their own copy of some
# documentation images, so a downloaded package shows its diagram offline.
# Documentation image, relative to docs/, and its copies.
DEPLOY_COPIES = {
    'admin/dtaas/localhost/localhost.png': [
        'deploy/dtaas/docker/localhost/localhost.png'],
    'admin/dtaas/secure-server/server.png': [
        'deploy/dtaas/docker/secure-server/server.png'],
    'admin/dtaas/secure-server-gitlab/server.png': [
        'deploy/dtaas/docker/secure-server_with_integrated-gitlab/server.png'],
    'admin/workspace/localhost/localhost.png': [
        'deploy/workspace/dex/localhost/localhost.png'],
    'admin/workspace/secure-server/secure-server.png': [
        'deploy/workspace/keycloak/production/secure-server.png'],
    # Not a package: the README of the developer check stack shows it.
    'developer/contributions/docker-check.png': [
        'developer/check/developer-docker.png'],
}


# The installation pages show the logo from a copy beside the page, as the
# packages under deploy/ do, so a page and its images move together.
LOGOS = ['dtaas-logo-full-192h.png', 'dtaas-logo-full-white-192h.png']


LOGO_PAGES = [
    'admin/dtaas/localhost',
    'admin/dtaas/secure-server',
    'admin/dtaas/secure-server-gitlab',
    'admin/workspace/localhost',
    'admin/workspace/secure-server',
]


WHITE = '#ffffff'


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

# Two more light fills, so a figure that codes kinds of things by colour has
# one tint per kind: data in a light cyan, the tint of the data swatch of
# file-system-layout.png, and an end or a failure in a light tint of the error
# colour.
DATA_TINT = '#cde7f2'
ERROR_TINT = '#f4dedd'


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
