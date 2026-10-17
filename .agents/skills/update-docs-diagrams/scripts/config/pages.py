"""The page lists, sizes and exceptions a maintainer edits.

Each list says which pages a rule treats differently, and why, beside the entry.
"""

from config.paths import ASSETS, BRAND, LOCKUP


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


# Pages exported in their light version only, on an opaque white page, so
# the documentation shows the light image as it is in both schemes.
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


# Pages drawn free hand, where the connector rules of the layout check (no
# slant, no shared attach point, no line behind another box) do not apply.
# The label rules still do.
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
    # Two short segments retrace the /gitlab route where it reaches GitLab,
    # so they share its attach point by construction.
    **{('admin/gitlab/gitlab-integrated-install.png', f'2WJjZC69SbeaYorzOpKH-{cell}'):
       'a segment retracing the /gitlab route' for cell in (34, 35)},
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


LOGO_PAGES = [
    'admin/dtaas/localhost',
    'admin/dtaas/secure-server',
    'admin/dtaas/secure-server-gitlab',
    'admin/workspace/localhost',
    'admin/workspace/secure-server',
]
