"""Where the diagrams live, and the lists a maintainer edits.

Every path, size and list of pages the scripts use is set here, so a change
to which pages carry the mark, which get a dark variant or where a copy goes
is one edit in one file.
"""

import pathlib

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

# The narrowest content column of the documentation theme, in CSS pixels.
# Text is sized so it reaches MIN_TEXT_PX when a page is shown this wide.
DISPLAY_WIDTH = 700
MIN_TEXT_PX = 14

# Every image is drawn this many pixels wide: twice the widest content column
# of the documentation, so it stays sharp on a high density screen.
EXPORT_WIDTH = 1600

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

# Pages drawn free hand, where the connector rules of layout.py (no slant, no
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
