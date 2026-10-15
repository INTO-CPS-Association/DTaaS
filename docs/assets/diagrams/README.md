# Diagrams

The architecture and installation diagrams of the documentation, drawn in the
colours of the interface theme. `dtaas-diagrams.drawio` is the source, with one
diagram per page, and the PNG files in the documentation are exported from it.

The scripts that make and export the file are the `update-docs-diagrams` agent
skill, in `.agents/skills/update-docs-diagrams/`. Its `SKILL.md` gives the
steps, and every command below runs from the repository root.

## Pages

A page named after a path under `docs/` is exported to that path. The other
pages are diagrams the documentation does not show yet, kept so they can be
placed later.

| Page | Used by |
| --- | --- |
| `admin/dtaas/secure-server/server.png` | `admin/dtaas/secure-server/install.md` |
| `admin/dtaas/secure-server-gitlab/server.png` | `admin/dtaas/secure-server-gitlab/install.md` |
| `admin/dtaas/localhost/localhost.png` | `admin/dtaas/localhost/install.md` |
| `admin/workspace/localhost/localhost.png` | `admin/workspace/localhost/install.md` |
| `admin/workspace/secure-server/secure-server.png` | `admin/workspace/secure-server/install.md` |
| `admin/gitlab/gitlab-integrated-install.png` | `admin/gitlab/index.md` |
| `admin/gitlab/gitlab-independent-install.png` | `admin/gitlab/index.md` |
| `admin/gitlab/gitlab-integrated-runner.png` | `admin/gitlab/runner-linux.md`, `admin/gitlab/runner-windows.md` |
| `developer/system/multi-domain.png` | `developer/system/extensions.md` |
| `user/DTaaS-user-view.png` | `user/features.md` |
| `developer/system/research-overview/system-architecture.png` | `developer/system/research-overview.md` |
| `deploy/dtaas/docker/server/server.png` | `deploy/dtaas/docker/server/README.md`, the insecure server package, drawn with an `http` URL |
| `developer/system/architecture.png` | `developer/system/architecture.md` |
| `developer/system/research-overview/devops.png` | `developer/system/research-overview.md` |
| `developer/system/research-overview/dt-assets-relationship.png` | `developer/system/research-overview.md` |
| `developer/system/research-overview/dtaas-class-instance.png` | `developer/system/research-overview.md` |
| `developer/system/research-overview/dtaas-userview.png` | `developer/system/research-overview.md` |
| `developer/system/research-overview/federated-dtaas.png` | `developer/system/research-overview.md` |
| `admin/servers/lib/file-system-layout.png` | `admin/servers/lib/docker.md`, `admin/servers/lib/npm.md` |
| `user/digital-twins/asset-relationship.png` | `user/digital-twins/create.md` |
| `user/servers/lib/author.png` | `FAQ.md` |
| `developer/system/research-overview/lifecycle-phases.png` | `developer/system/research-overview.md`, `developer/technical-concepts/gitlab.md`, `user/digital-twins/devops/ui.md` |
| `developer/system/research-overview/user-interaction-in-federated-DTaaS.png` | `developer/system/research-overview.md` |
| `developer/system/research-overview/shm-dt-workflow.png` | `developer/system/research-overview.md` |
| `developer/system/current-status-developer.png` | `developer/system/current-status.md`, light only |
| `developer/system/research-overview/system-architecture-c4.png` | `developer/system/research-overview.md`, `developer/system/architecture.md`, light only |
| `developer/system/research-overview/implementation-status.png` | `developer/system/research-overview.md`, `developer/system/current-status.md`, light only |
| `developer/contributions/docker-check.png` | `developer/contributions/docker.md`, and its copy in `developer/check/README.md` |
| `admin/gitlab/gitlab-runner-two-servers.png` | `admin/gitlab/runner-linux.md` |
| `developer/technical-concepts/oauth/design-sequence.png` | `developer/technical-concepts/oauth/design.md` |
| `developer/technical-concepts/oauth/oauth2-workflow.png` | `developer/technical-concepts/oauth/authms.md`, `developer/technical-concepts/oauth/oauth2.0.md` |
| `admin/servers/traefik-oauth.png` | `admin/servers/auth.md` |
| `user/servers/lib/library-assets.png` | `user/servers/lib/assets.md` |
| Architecture with public and private cloud | Not placed, the source of the two architecture images above |
| Workspace and assets | Not placed |
| Two servers with runners, release | Not placed, it shows the addresses of the release servers |

The installation packages under `deploy/` keep their own copy of five of these
images, so a downloaded package shows its diagram without the website, and
`developer/check/developer-docker.png` is a copy of `docker-check.png` for the
README of the developer check stack. The export writes those copies from the
exported images (see `DEPLOY_COPIES` in `settings.py`), so a copy is never
edited by hand.
In the same way, each installation page under `docs/admin/dtaas/` and
`docs/admin/workspace/` shows the logo from a copy beside it, as the packages
do, and the export writes those copies from `docs/assets/brand/png` (see
`LOGO_PAGES`).

## Light and Dark Variants

Every page under `docs/` is exported twice. `dark.py` turns each light
fill, including the white drawio draws when a shape names none, into the slate
page of the site with a fifth of its own colour, so tints keep their hue. Dark
lines and dark stencil icons become light, text takes the light or the dark
text colour by contrast with its new fill, and the DTaaS lockup and the GitLab
logo become their white versions. Text drawn in the colour of its ground stays
hidden, as it is in the light image. The pages show the pair with
`#only-light` and `#only-dark`, and the PDF prints the light one.

The export stops when a cell of a placed page has text below 4.5 to 1 or a
line or border below 3 to 1 in the dark variant, unless the cell is listed in
`CONTRAST_EXCEPTIONS` in `settings.py` with its reason. The list is
empty: every dark image meets both minimums.

A page listed in `LIGHT_ONLY` in `settings.py` gets no dark variant,
and the documentation shows its light image with the `{.on-white}` class, on a
white backing in both schemes. `current-status-developer.png` is there because
its product logos keep dark lettering that does not read on the slate page.
`system-architecture-c4.png` and `implementation-status.png` are there because
their fills code the four layers of ISO 23247, which the slate page would
leave indistinguishable.

## Layout Check

Before it draws anything, the export checks every placed page as drawio
draws it, from the SVG drawio exports for that page, and stops on a problem
not listed in `LAYOUT_EXCEPTIONS` in `settings.py`. `diagrams.py check` runs
the same checks without writing images. The rules, in `layout.py` and
`labels.py`:

- A connector runs in horizontal and vertical segments.
- Two connectors do not meet a box at one point from different sides.
  Branches of one trunk, which leave a box together, are allowed.
- A connector does not pass behind a box that is not one of its ends.
- A label fits in its box, and loose text crosses no border, covers no
  picture and sits on no line unless its background masks it.

The connectors and the place of every label come from the SVG, so a path is
checked where drawio routes it. The width of a label is estimated from the
advance widths of Inter, and the rules leave a few percent of margin for
the kerning the estimate leaves out. A turned label is not checked.

Pages drawn free hand are listed in `FREE_FORM`, where only the label rules
apply: `architecture.png` and `current-status-developer.png`, a hub with
spokes and curves, the two OAuth sequence diagrams, whose messages cross the
lifelines, and `author.png`, a flow drawn along a diagonal. The lines of the
network pictogram inside Communication are listed in `LAYOUT_EXCEPTIONS`.

## Design Rules

Every page follows the rules of `docs/assets/brand/README.md`, with sizes taken
from the width the documentation shows an image at. The restyle step applies
them and can be run again on its own output without changing anything.

- Lines, arrows and borders are primary `#003d73` or grey 700 `#333b4c`. The
  turquoise and cyan of the palette, and the tints, are only fills, because as
  a line on white they stay under the three to one contrast floor.
- A heavy arrow in primary marks the main path of a page: the forward-auth
  check on the installation pages, the flows between twins and services in
  `federated-dtaas.png`, and the platform links in `architecture.png` and
  `devops.png`. Every other arrow is grey 700 at the normal width.
- Text is Inter, never italic, bold only for a title, and at least 4.5 to 1 on
  its fill. A fill drawn see-through is replaced by the solid colour it shows.
- Every label is at least 14 pixels when the image is shown 700 pixels wide,
  the narrowest content column of the site. A wide diagram therefore needs
  larger fonts in drawio units than a narrow one.
- Labels are in Title Case: each word starts with a capital except the
  short joining words inside a line (of, and, to, with and the like). A URL,
  a path, a name with an underscore and a word already carrying an inner
  capital keep their case. GitLab, WebApp and Node.js have one spelling, and
  systemd keeps its own lower case. `wording.py` holds the rule, which the
  restyle applies.
- A label background only masks a line, in the colour of what lies behind
  it: the fill of the smallest box holding both ends of the connector, or
  the page. A label inside its own shape has no background, so it never
  shows as a white patch on a coloured box. `masks.py` holds the rule.
- One forward-auth box, one corner radius and one line width for every box,
  one style for every arrow, and one icon per idea:

  | Idea | Icon |
  | --- | --- |
  | A person | `mxgraph.ios7.icons.user` |
  | The web application | `mxgraph.ios7.icons.globe` |
  | Docker | `img/lib/mscae/Docker.svg` |
  | GitLab | the official logo in the skill's `assets/` |
  | A physical or digital twin | `mxgraph.signs.transportation.car_3` and `mxgraph.ios7.icons.home` |

  A UML diagram keeps its stick figure and a C4 diagram its person, since
  they belong to the notation. A product logo, such as Traefik or Keycloak,
  stays its owner's.
- A note about the picture is page text and not part of the picture.
- The DTaaS mark sits at the top right corner of the DTaaS boundary, the
  largest box of the page. A page that already shows the full lockup as its
  title gets no second mark.

## Updating a Diagram

1. Open `dtaas-diagrams.drawio` in drawio and edit the page.
1. Apply the rules and shrink any new raster logo. The restyle undoes the
   hand edits listed below, so run it on a copy that holds only the new or
   changed page and bring that page back:

   ```bash
   python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py restyle \
     docs/assets/diagrams/dtaas-diagrams.drawio \
     docs/assets/diagrams/dtaas-diagrams.drawio
   uv run --with-requirements .agents/skills/update-docs-diagrams/scripts/requirements.txt python .agents/skills/update-docs-diagrams/scripts/diagrams.py shrink \
     docs/assets/diagrams/dtaas-diagrams.drawio \
     docs/assets/diagrams/dtaas-diagrams.drawio
   ```

1. Export every page to its place in the documentation:

   ```bash
   python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py export
   ```

   The export needs the drawio desktop application. It finds it through
   `DRAWIO`, then `drawio` on the `PATH`, as on Linux, then its install place
   on macOS and Windows. On a Linux machine without a display, run the command
   under `xvfb-run -a`. On Windows, run `python` in place of `python3`. Every
   image is 1600 pixels wide, twice the widest content column.

1. Open every exported image and check that nothing overlaps. The scripts set
   colours, fonts and sizes, and a larger font can need a box moved by hand.

The export draws text with the fonts installed on the machine. Install Inter
first, or drawio falls back to another face without a warning. The diagrams use
two weights, 400 and 700, and the documentation site already carries both as
`woff2` in `docs/assets/fonts`. `fonttools` turns each into a font the system
can install:

```bash
for weight in 400 700; do
  uv run --with-requirements .agents/skills/update-docs-diagrams/scripts/requirements.txt \
    fonttools ttLib.woff2 decompress -o "Inter-$weight.ttf" \
    "docs/assets/fonts/inter-latin-$weight-normal.woff2"
done
```

Copy the two files to `~/Library/Fonts` on macOS or `~/.local/share/fonts` on
Linux. On Windows, make the two files in PowerShell, then open each one and
choose Install:

```powershell
foreach ($weight in 400, 700) { uv run --with-requirements .agents/skills/update-docs-diagrams/scripts/requirements.txt fonttools ttLib.woff2 decompress -o "Inter-$weight.ttf" "docs/assets/fonts/inter-latin-$weight-normal.woff2" }
```

## How the File Was Made

The file was converted once from a drawio file that held every installation
diagram on a single page, in the drawio default colours. The steps that did
it are kept so the conversion can be repeated on a later version of that file:

```bash
python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py retheme original.drawio themed.drawio
python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py split themed.drawio split.drawio
python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py restyle split.drawio styled.drawio
uv run --with-requirements .agents/skills/update-docs-diagrams/scripts/requirements.txt python .agents/skills/update-docs-diagrams/scripts/diagrams.py shrink \
  styled.drawio dtaas-diagrams.drawio
```

The steps that take files on the command line accept only `.drawio` files
under the current directory.

`retheme` maps each colour to a colour of the theme, through the `COLOURS`
table of `colours.py`, which reads the brand colours from
`client/src/theme/tokens.ts`, and replaces the old wordmark with the logo in
`docs/assets/brand`. `split` gives each diagram its own page. `restyle`
applies the design rules above. `shrink` scales every embedded raster logo down
to the pixels the export draws, turns a JPEG into a PNG with a transparent
background, and stores each logo with a palette, which took the
file from 3.5 MB to about 750 KB.

These edits were made by hand in drawio, because each one concerns a single
page and a script for it would be longer than the change:

- The pages were renamed after the image each one replaces.
- `/lib` instead of `/libms`, `/user1` on user workspace 1, and `intocps.org`
  instead of `intocps.com`, as the compose files in `deploy/` have them.
- The service at `/` is `Client` on every page, the name of the `client`
  service in every compose file.
- `admin/gitlab/gitlab-integrated-install.png`,
  `admin/gitlab/gitlab-integrated-runner.png` and
  `admin/gitlab/gitlab-independent-install.png` gained the Logger at
  `/logger`, which the secure server packages route. On the independent page
  Server 2 became narrower so the page stays under 600 units wide, where
  12-unit text is still 14 pixels.
- The WebApp picture, a bitmap with its label drawn in another typeface, is
  the drawio globe icon with an Inter label.
- Labels were moved clear of lines and frames after the switch to Inter, which
  is wider than Helvetica. Route labels such as `/logger` and `/auth` sit
  between two connector lines with space on both sides, and the server tags
  moved left of the DTaaS mark with a clear gap.
- `developer/system/multi-domain.png` was laid out again so its labels fit at
  25 drawio units: the columns are wider, compose, configuration and execution
  are rows instead of rotated columns, and the label of each stack of cards is
  on the card in front.
- A Storage box hidden under the Dashboard of the Generic column of the
  multi-domain page was removed. It drew nothing.

The pages the documentation does not show follow the same rules, but they were
not checked label by label for overlaps.

## The Pages Added in October 2026

The drawio files received are kept as they arrived, in `originals/`, so every
page can be traced back to its source: `2026-10-12_DTaaS-new-theme.drawio`
for the installation and architecture pages, and
`2026-10-13_DTaaS_new_theme_more_figures.drawio` with
`2026-10-13_DTaaS-layers-on-devops.drawio` for the nine pages below. They are
Git LFS objects and are not published with the site.

Nine pages were added from two drawio files Prasad Talasila shared on 13
October 2026: `DTaaS_new_theme_more_figures.drawio`, a working canvas with
several versions of most figures, and `DTaaS-layers-on-devops.drawio`, the
source of `devops.png`. Each page is the version that matches the image the
documentation showed before, cut out of the canvas and passed through
the retheme, restyle and shrink steps. The other
figures of the canvas stay with Prasad, as they differ from the images in the
documentation or are not used yet.

Two steps changed for these pages. The retheme maps the colours the new
figures use, added to `COLOURS` in `colours.py`, and replaces a wordmark that
lies loose on the page instead of in a group. The restyle leaves
the DTaaS mark off the pages listed in `NO_MARK`, which draw a concept and not
the DTaaS system, so their largest box is not the DTaaS boundary.

The hand edits, by page:

- `developer/system/architecture.png`: the running figures, the clipboard and
  the DTs icon were emoji, two of them fetched from an external site. The
  runners are gone, the clipboard is a note shape and the DTs icon is the
  drawio users icon. The two boxes on the right are wider and several labels
  moved off their icons.
- `developer/system/research-overview/dt-assets-relationship.png` and
  `dtaas-class-instance.png`: the title written into the picture is gone, as
  the page text names the figure. In the first, every arrow joins its two
  boxes and carries its own label, where the sketch split each arrow around a
  label with loose ends.
- `developer/system/research-overview/federated-dtaas.png` and
  `user/digital-twins/asset-relationship.png`: labels moved off the lines.
- `developer/system/research-overview/dtaas-userview.png`: redrawn in about
  1000 units instead of 2000, with the data acquisition below the platform,
  so its labels reach 14 pixels at the column width. Every element and arrow
  of the sketch is kept.
- `developer/system/research-overview/dt-assets-relationship.png`,
  `dtaas-userview.png`, `federated-dtaas.png`,
  `admin/dtaas/localhost/localhost.png` and three pages not placed yet:
  Prasad Talasila corrected the line routing and bends in drawio on 13
  October 2026 (`dtaas-diagrams-changes-diff.drawio`), and the pages are taken
  from his file as they are. The thin arrows of `federated-dtaas.png` keep his
  width of 1. The localhost diagram draws no logger, although the localhost
  package still runs one, because the logger has no use on localhost (Prasad
  Talasila, 14 October 2026).
- Every page with GitLab: the cell shows the official logo from the GitLab
  press kit (<https://about.gitlab.com/press/press-kit/>), the SVG unchanged,
  in a box of its own proportions centred where the older logo was. The two
  SVG files are in `.agents/skills/update-docs-diagrams/assets/`. On
  `admin/gitlab/gitlab-integrated-runner.png` the two curves to the runners
  start at the right edge of the wider logo.
- `admin/servers/lib/file-system-layout.png`: redrawn. The sketch put five
  labelled cards in each of seven folders, up to twelve labels in a row, which
  no font size makes legible at the column width. Each folder shows the five
  asset types as coloured squares, and one legend names them.
- The eight figures added on 14 October 2026, from `lifecycle-phases.png` to
  `library-assets.png` in the table above, had no drawio source. They are
  redrawn from the images the documentation showed, keeping every box, arrow
  and label, and then themed with the retheme, restyle and shrink steps.
  Each page is at most 1000 units wide, so its text
  reaches 14 pixels at the column width, and the concept pages are in
  `NO_MARK`. Illustrations and third-party product logos, such as the wind
  turbine of `shm-dt-workflow.png` and the service logos of
  `current-status-developer.png`, are cropped from those images without
  changing a pixel, apart from a white or pale background made transparent.
  `user/digital-twins/devops/ui.md` now shows `lifecycle-phases.png`, which
  was the same drawing as its own copy, `devops-lifecycle.png`.
- `system-architecture-c4.png` and `implementation-status.png`: redrawn in
  portrait, 1000 units wide, so their text reaches 14 pixels at the column
  width. Every element, connection and legend of the original is kept, and
  some edges enter their shapes from another side. Their fills code the four
  layers of ISO 23247, and the theme palette has two tints and a grey scale,
  so after the theme the layer fills are set by hand to a light tint of each
  original colour: Services `#fdf1d3`, Digital Twin `#ddf0e2`, Data
  `#fbe1df` and Physical Twin `#ebe3f3`. They are the only fills outside the
  palette. `developer/system/current-status-developer-c4.png`, the same
  drawing as `implementation-status.png`, is removed and `current-status.md`
  shows the redrawn one.
- `admin/gitlab/gitlab-runner-two-servers.png` and
  `developer/contributions/docker-check.png` are the pages "Two servers with
  runners" and "Developer docker setup", placed. On the first, the GitLab logo
  moved left so the two lines to the runners start at its edge, the runner
  labels are wider, and three lines that ended above the bus at the old
  position of traefik end on the bus.
- On 15 October 2026 the layout check found these, each fixed by hand:
  - The lines from GitLab to the runners, on `gitlab-integrated-runner.png`
    and `gitlab-runner-two-servers.png`, and the Evaluate arrow of
    `asset-relationship.png` were curved or slanted, and run in right
    angles. The Evaluate arrow ends inside the box above it.
  - User 1 of `user-interaction-in-federated-DTaaS.png` sent two arrows
    from one point, and the second leaves lower on its right side.
  - Labels touched a border, a line or a logo and moved clear of it:
    OAuth2 PKCE on `localhost.png` and `gitlab-runner-two-servers.png`,
    OAuth2 Webserver, /user2 on `docker-check.png`, Instantiate, Feed, and
    DT Execution Manager, User Workspaces and Data and Control on
    `architecture.png`. Services and Reusable Assets of `architecture.png`
    sit in a gap narrower than their 20 point text, and are set at 18.
  - The cards of Graphical Digital Twins take the height of the
    Heterogeneous Digital Twins ones, so two lines fit.
  - A Common Services label on `multi-domain.png`, hidden behind the
    Dashboard and Storage boxes since the original, is removed.
  - Every arrow of `dtaas-class-instance.png` is grey 700 at the normal
    width, as its Link arrows were.
  - The icons follow the table under the design rules: the person on
    `architecture.png` and `author.png`, the web app on `architecture.png`
    and `current-status-developer.png`, and the cars and houses of
    `current-status-developer.png`.
  - Every label is in Title Case. A joining word that continues the line
    above, such as "and DTs", keeps its lower case, and "Dashboards" is
    broken with a hyphen where it does not fit beside its icon.
- A side-by-side review of every changed image against the one before
  found more, also fixed by hand:
  - The runner lines of `gitlab-integrated-runner.png` and
    `gitlab-runner-two-servers.png` turned on a dashed border. They turn in
    the gap between the servers, and the remote servers on the second page
    moved right to widen that gap.
  - OAuth2 PKCE sat on the border on `localhost.png` and on its arrow on
    `server.png`, and moved clear of both, with the GitLab URLs below it.
  - The legend title of `file-system-layout.png` is on one line again.
  - `architecture.png` shows several users with three copies of the one
    user icon, as `current-status-developer.png` does.
  - User 1 of `user-interaction-in-federated-DTaaS.png` sends both arrows
    from its arm, as one trunk.
  - Digital Twins in the narrow box of `devops.png` is set at 20.
  - May Have of `dt-assets-relationship.png` is on two lines, in the gap
    between Reusable Assets and the configuration box.
  The layout check now also reports an icon under the label of its box and
  a connector label that crosses a border or covers a picture.
