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
exported images (see `DEPLOY_COPIES` in `config/pages.py`), so a copy is never
edited by hand.
In the same way, each installation page under `docs/admin/dtaas/` and
`docs/admin/workspace/` shows the logo from a copy beside it, as the packages
do, and the export writes those copies from `docs/assets/brand/png` (see
`LOGO_PAGES`).

## Light and Dark Variants

Every page under `docs/` is exported twice, except a page in `LIGHT_ONLY`.
`write_dark` in `design/dark.py` turns
each light fill, including the white drawio draws when a shape names none, into
the slate page of the site with a fifth of its own colour, so tints keep their
hue. Dark lines and dark stencil icons become light, text takes the light or the
dark text colour by contrast with its new fill, and the DTaaS lockup and the
GitLab logo become their white versions. The traefik and Docker logos have
no white version, so they are drawn unchanged on a light plate, listed in
`DARK_LETTERING`. An embedded SVG whose every colour falls below 3 to 1 on
slate, such as the navy wind turbines, is redrawn in the light line colour.
Text drawn in the colour of its ground
stays hidden, as it is in the light image. The pages show the pair with
`#only-light` and `#only-dark`, and the PDF prints the light one.

The export stops when a cell of a placed page has text below 4.5 to 1 or a
line or border below 3 to 1 in the dark variant, unless the cell is listed in
`CONTRAST_EXCEPTIONS` in `config/pages.py` with its reason. The list is
empty: every dark image meets both minimums.

A page listed in `LIGHT_ONLY` in `config/pages.py` gets no dark variant, and
the reason for each is written beside it there. Its image is exported on an
opaque white page, so the slate scheme shows it as it is, on white.

## Layout Check

Before it draws anything, the export checks every placed page as drawio
draws it, from the SVG drawio exports for that page, and stops on a problem
not listed in `LAYOUT_EXCEPTIONS` in `config/pages.py`. `diagrams.py check`
runs the same checks without writing images. The rules, in the `layout/`
package of the scripts:

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
- The label of a box is in Title Case, with the short joining words inside a
  line (of, and, to, with) in lower case. The label of a connector, a UML guard
  and a note on a sequence diagram state a relation or a condition, so they
  read as a sentence ("May have", "User login verified"). A URL, a path, a
  name with an underscore or an inner capital keeps its case. GitLab, WebApp
  and Node.js have one spelling, and systemd and authcode stay lower case.
  `title_case` and `sentence_case` in `design/wording.py` hold the rules.
- A label background only masks a line, in the colour of what lies behind it:
  the fill of the smallest box holding both ends of the connector, or the page.
  A label inside its own shape has no background, so it never shows as a white
  patch on a coloured box. `label_ground` in `design/masks.py` holds the rule.
- One forward-auth box, one corner radius and one line width for every box,
  one style for every arrow, and one icon per idea:

  | Idea | Icon |
  | --- | --- |
  | A person | `mxgraph.ios7.icons.user` |
  | The web application | `mxgraph.ios7.icons.globe` |
  | Docker | `img/lib/mscae/Docker.svg` |
  | GitLab | the official logo in the skill's `assets/` |
  | A physical or digital twin | `mxgraph.signs.transportation.car_3` and `mxgraph.ios7.icons.home` |
  | A twin that is running | `mxgraph.signs.sports.running` |

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
   hand edits listed in [hand-edits.md](hand-edits.md), so run it on a copy
   that holds only the new or changed page and bring that page back. The
   image and font tools run from their own virtual environment, made once
   with `--require-hashes`, because `uv run --with-requirements` does not
   check the hashes. On Windows, the interpreter is
   `.agents\skills\update-docs-diagrams\scripts\.venv\Scripts\python`.

   ```bash
   uv venv .agents/skills/update-docs-diagrams/scripts/.venv
   uv pip install --python .agents/skills/update-docs-diagrams/scripts/.venv \
     --require-hashes -r .agents/skills/update-docs-diagrams/scripts/requirements.txt
   python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py restyle \
     docs/assets/diagrams/dtaas-diagrams.drawio \
     docs/assets/diagrams/dtaas-diagrams.drawio
   .agents/skills/update-docs-diagrams/scripts/.venv/bin/python .agents/skills/update-docs-diagrams/scripts/diagrams.py shrink \
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
`woff2` in `docs/assets/fonts`. `fonttools`, from the virtual environment of
the steps above, turns each into a font the system can install:

```bash
for weight in 400 700; do
  .agents/skills/update-docs-diagrams/scripts/.venv/bin/fonttools ttLib.woff2 decompress -o "Inter-$weight.ttf" \
    "docs/assets/fonts/inter-latin-$weight-normal.woff2"
done
```

Copy the two files to `~/Library/Fonts` on macOS or `~/.local/share/fonts` on
Linux. On Windows, make the two files in PowerShell, then open each one and
choose Install:

```powershell
foreach ($weight in 400, 700) { .agents\skills\update-docs-diagrams\scripts\.venv\Scripts\fonttools ttLib.woff2 decompress -o "Inter-$weight.ttf" "docs/assets/fonts/inter-latin-$weight-normal.woff2" }
```

## How the File Was Made

The file was converted once from a drawio file that held every installation
diagram on a single page, in the drawio default colours. The steps that did
it are kept so the conversion can be repeated on a later version of that file:

```bash
python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py retheme original.drawio themed.drawio
python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py split themed.drawio split.drawio
python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py restyle split.drawio styled.drawio
.agents/skills/update-docs-diagrams/scripts/.venv/bin/python .agents/skills/update-docs-diagrams/scripts/diagrams.py shrink \
  styled.drawio dtaas-diagrams.drawio
```

The steps that take files on the command line accept only `.drawio` files
under the current directory.

`retheme` maps each colour to a colour of the theme, through the `COLOURS`
table of `config/theme.py`, which reads the brand colours from
`client/src/theme/tokens.ts`, and replaces the old wordmark with the logo in
`docs/assets/brand`. `split` gives each diagram its own page. `restyle`
applies the design rules above. `shrink` scales every embedded raster logo down
to the pixels the export draws, turns a JPEG into a PNG with a transparent
background, and stores each logo with a palette, which took the
file from 3.5 MB to about 750 KB.

Every edit made by hand after a step, page by page, is recorded in
[hand-edits.md](hand-edits.md). A restyle run on a whole page undoes them,
which is why the restyle runs on new or changed pages only.
