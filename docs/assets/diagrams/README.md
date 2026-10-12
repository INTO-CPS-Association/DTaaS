# Diagrams

The architecture and installation diagrams of the documentation, drawn in the
colours of the interface theme. `dtaas-diagrams.drawio` is the source, with one
diagram per page, and the PNG files in the documentation are exported from it.

## Pages

A page named after a path under `docs/` is exported to that path. The other
pages are diagrams the documentation does not show yet, kept so they can be
placed later.

| Page | Used by |
| --- | --- |
| `admin/dtaas/secure-server/server.png` | `admin/dtaas/secure-server/install.md` |
| `admin/dtaas/secure-server-gitlab/server.png` | `admin/dtaas/secure-server-gitlab/install.md` |
| `admin/workspace/localhost/localhost.png` | `admin/workspace/localhost/install.md` |
| `admin/workspace/secure-server/secure-server.png` | `admin/workspace/secure-server/install.md` |
| `admin/gitlab/gitlab-integrated-install.png` | `admin/gitlab/index.md` |
| `admin/gitlab/gitlab-independent-install.png` | `admin/gitlab/index.md` |
| `admin/gitlab/gitlab-integrated-runner.png` | `admin/gitlab/runner-linux.md`, `admin/gitlab/runner-windows.md` |
| `developer/system/multi-domain.png` | `developer/system/extensions.md` |
| Architecture with public and private cloud | Not placed |
| Workspace and assets | Not placed |
| DTaaS localhost, with forward-auth | Not placed, see below |
| Developer docker setup | Not placed |
| Two servers with runners | Not placed |
| Two servers with runners, release | Not placed |

`admin/dtaas/localhost/localhost.png` is not generated here. The localhost
package runs Traefik, the client, the logger and one user workspace, without
forward-auth, and the localhost diagram in this file draws forward-auth. The
image in the documentation stays as it is until the diagram matches the
package.

## Design Rules

Every page follows the rules of `docs/assets/brand/README.md`, with sizes taken
from the width the documentation shows an image at. `restyle_drawio.py` applies
them and can be run again on its own output without changing anything.

- Lines, arrows and borders are primary `#003d73` or grey 700 `#333b4c`. The
  turquoise and cyan of the palette, and the tints, are only fills, because as
  a line on white they stay under the three to one contrast floor.
- The one heavy arrow is the forward-auth check, in primary. The pages that
  show it say so in the text under the image.
- Text is Inter, never italic, bold only for a title, and at least 4.5 to 1 on
  its fill. A fill drawn see-through is replaced by the solid colour it shows.
- Every label is at least 14 pixels when the image is shown 700 pixels wide,
  the narrowest content column of the site. A wide diagram therefore needs
  larger fonts in drawio units than a narrow one.
- One user icon, one forward-auth box, one corner radius and one line width
  for every box, one style for every arrow.
- A note about the picture is page text and not part of the picture.
- The DTaaS mark sits at the top right corner of the DTaaS boundary, the
  largest box of the page. A page that already shows the full lockup as its
  title gets no second mark.

## Updating a Diagram

1. Open `dtaas-diagrams.drawio` in drawio and edit the page.
1. Apply the rules and shrink any new raster logo:

   ```bash
   python3 docs/assets/diagrams/restyle_drawio.py \
     docs/assets/diagrams/dtaas-diagrams.drawio \
     docs/assets/diagrams/dtaas-diagrams.drawio
   uv run --with pillow python docs/assets/diagrams/shrink_images.py \
     docs/assets/diagrams/dtaas-diagrams.drawio \
     docs/assets/diagrams/dtaas-diagrams.drawio
   ```

1. Export every page to its place in the documentation:

   ```bash
   python3 docs/assets/diagrams/export_diagrams.py
   ```

   The script needs the drawio desktop application. Set `DRAWIO` to its
   binary if it is not at `/Applications/draw.io.app`. Every image is 1600
   pixels wide, twice the widest content column.

1. Open every exported image and check that nothing overlaps. The scripts set
   colours, fonts and sizes, and a larger font can need a box moved by hand.

The export draws text with the fonts installed on the machine. Install Inter
first, or drawio falls back to another face without a warning. The
`@fontsource/inter` package of the client carries it as `woff2`, which
`fonttools` turns into a font the system can install:

```bash
uvx --with brotli --from fonttools fonttools ttLib.woff2 decompress \
  -o Inter-Regular.ttf \
  client/node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2
```

Do the same for the weights 500, 600 and 700, and copy the files to
`~/Library/Fonts` on macOS or `~/.local/share/fonts` on Linux.

## How the File Was Made

The file was converted once from a drawio file that held every installation
diagram on a single page, in the drawio default colours. The scripts that did
it are kept so the conversion can be repeated on a later version of that file:

```bash
python3 docs/assets/diagrams/retheme_drawio.py original.drawio themed.drawio
python3 docs/assets/diagrams/split_pages.py themed.drawio split.drawio
python3 docs/assets/diagrams/restyle_drawio.py split.drawio styled.drawio
uv run --with pillow python docs/assets/diagrams/shrink_images.py \
  styled.drawio dtaas-diagrams.drawio
```

`retheme_drawio.py` maps each colour to a colour of the theme, read from
`client/src/theme/tokens.ts`, and replaces the old wordmark with the logo in
`docs/assets/brand`. `split_pages.py` gives each diagram its own page.
`restyle_drawio.py`, with `restyle_cells.py` and `drawio_style.py`, applies the
design rules above. `shrink_images.py` scales every embedded raster logo down
to the pixels the export draws, turns the GitLab JPEG into a PNG with a
transparent background, and stores each logo with a palette, which took the
file from 3.5 MB to under 450 KB.

These edits were made by hand in drawio, because each one concerns a single
page and a script for it would be longer than the change:

- The pages were renamed after the image each one replaces.
- `/lib` instead of `/libms`, `/user1` on user workspace 1, and `intocps.org`
  instead of `intocps.com`, as the compose files in `deploy/` have them.
- The service at `/` is `Client` on every page, the name of the `client`
  service in every compose file.
- `admin/gitlab/gitlab-integrated-install.png` and
  `admin/gitlab/gitlab-integrated-runner.png` gained the Logger at `/logger`,
  which the integrated GitLab package routes.
- The WebApp picture, a bitmap with its label drawn in another typeface, is
  the drawio globe icon with an Inter label.
- Labels were moved clear of lines and frames after the switch to Inter, which
  is wider than Helvetica, and the server tags moved left of the DTaaS mark.
- `developer/system/multi-domain.png` was laid out again so its labels fit at
  25 drawio units: the columns are wider, compose, configuration and execution
  are rows instead of rotated columns, and the label of each stack of cards is
  on the card in front.
- A Storage box hidden under the Dashboard of the Generic column of the
  multi-domain page was removed. It drew nothing.

The pages the documentation does not show follow the same rules, but they were
not checked label by label for overlaps.
