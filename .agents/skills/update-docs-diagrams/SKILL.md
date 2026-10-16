---
name: update-docs-diagrams
description: Edit, restyle and export the architecture and installation diagrams of the documentation from docs/assets/diagrams/dtaas-diagrams.drawio, in the colours of the website theme. Use when asked to change a diagram, add one from a new drawio file, refresh the exported images, or after a change to the theme colours.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires Python 3.11 or later, uv for the image step, the drawio desktop application, and the Inter font installed on the machine that exports.
---

# Update the documentation diagrams

`docs/assets/diagrams/dtaas-diagrams.drawio` holds one diagram per page. A
page named after a path under `docs/` is exported to that path, and a page
named after a path under `deploy/` to that path in the repository.
The scripts are three files:

- `scripts/config.py`: every path, page list, exception and copy a
  maintainer edits, and the theme colours with the colour map.
- `scripts/design.py`: how a diagram looks (retheme, design rules, wording,
  label backgrounds, dark variant, logo shrinking) and, in its second half,
  the layout check.
- `scripts/diagrams.py`: reading and writing drawio files, the one command
  and the export.

`docs/assets/diagrams/README.md` lists the pages, the rules and the edits
made by hand. Run every command from the repository root.

## Steps

1. **Check the prerequisites.** The drawio desktop application is installed.
   The export finds it through the `DRAWIO` variable, then `drawio` on the
   `PATH`, which is where the Linux packages put it, then the installer's
   place on macOS (`/Applications/draw.io.app/Contents/MacOS/draw.io`) and on
   Windows (`C:\Program Files\draw.io\draw.io.exe`). Set `DRAWIO` only when
   it is somewhere else. On a Linux machine without a display, run the export
   under `xvfb-run -a`. Inter 400 and 700 are installed as system fonts, or
   drawio exports with another face without a warning.
   `docs/assets/diagrams/README.md` shows how to make the two font files from
   the copies in `docs/assets/fonts`. The commands below are written for
   macOS and Linux. On Windows, run `python` in place of `python3`, and put
   each command on one line.

1. **Edit the page** in drawio, or bring in a diagram from another drawio
   file:

   ```bash
   python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py retheme new.drawio themed.drawio
   python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py split themed.drawio split.drawio
   ```

   `retheme` maps every colour to the theme and replaces the old emoji
   wordmark with the logo. It prints the colours it could not map. Add each
   one to `COLOURS` in `scripts/config.py` before going on. `split` gives
   each diagram of a crowded page its own page. Copy
   the pages you need into `dtaas-diagrams.drawio` and name each after the
   image it replaces.

1. **Apply the rules** and shrink the embedded logos:

   ```bash
   python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py restyle \
     docs/assets/diagrams/dtaas-diagrams.drawio docs/assets/diagrams/dtaas-diagrams.drawio
   uv run --with-requirements .agents/skills/update-docs-diagrams/scripts/requirements.txt python .agents/skills/update-docs-diagrams/scripts/diagrams.py shrink \
     docs/assets/diagrams/dtaas-diagrams.drawio docs/assets/diagrams/dtaas-diagrams.drawio
   ```

   Both can run again on their own output without changing it. The image
   and font tools are pinned with hashes in
   `.agents/skills/update-docs-diagrams/scripts/requirements.txt`, which
   holds only these three tools and installs on Windows, macOS and Linux. It
   is a different file from `script/docs/mkdocs-requirements.txt`. A page that
   draws a concept and not the DTaaS system goes into `NO_MARK` in
   `config.py`, or it gets the DTaaS mark on its largest box.

   Several pages carry edits made by hand after the restyle, listed in
   `docs/assets/diagrams/README.md`, and running the restyle on the whole
   file undoes them. Run it on a copy that holds only the new or changed
   page, and bring that page back into `dtaas-diagrams.drawio`. A page edited
   by hand in drawio, keeping the theme, needs no restyle.

1. **Export** every placed page in a light and a dark variant, the copies
   the installation packages carry, and the logo beside each installation
   page:

   ```bash
   python3 .agents/skills/update-docs-diagrams/scripts/diagrams.py export
   ```

   `write_dark` in `scripts/design.py` makes the dark variant from the light
   page by brightness, and the export writes it beside the light image with a
   `-dark` suffix. A page shows the pair with `#only-light` and `#only-dark`, so
   a new image needs both lines. A page in `LIGHT_ONLY` (in `config.py`) gets no
   dark variant and is shown with `{.on-white}`.

   Before it draws anything, the export runs two checks, which
   `diagrams.py check` also runs on their own:

   - **Contrast.** Every cell of a placed page whose dark text falls below
     4.5 to 1, or whose line or border falls below 3 to 1.
   - **Layout** (the second half of `scripts/design.py`), on the SVG drawio
     exports for each placed page: a connector on a slant, two connectors
     meeting a box at one point from different sides, a connector behind a box
     that is not one of its ends, a label wider than its box, and text that
     crosses a border, covers a picture or sits on a line. The text size is
     estimated from the widths of Inter, so the rules leave a few percent of
     margin.

   Either check lists what it found and stops. Fix the cell in drawio, or,
   when the drawing is intended, add it to `CONTRAST_EXCEPTIONS` or
   `LAYOUT_EXCEPTIONS` in `config.py` with the reason. A page drawn free
   hand, such as a sequence diagram, goes into `FREE_FORM`, where only the
   label rules apply. A page name that resolves outside `docs/` and
   `deploy/` also stops the export. The unit tests beside the scripts run with
   `python3 -m unittest discover --pattern 'test_*.py'` from `scripts/`.
   They also check that every logo and diagram copy equals its source, and
   that the colours repeated in the stylesheets and the scripts equal
   `client/src/theme/tokens.ts`, so a hand edit to a copy fails the build.

1. **Review every changed image**, light and dark, by opening it. The
   layout check finds most overlaps, and an eye still finds the rest:
   arrows that kept old corner points, a label that reads as belonging to
   the wrong line, and emoji. The scripts set colours, fonts and sizes, and
   a larger font can need a box moved by hand. Fix the page in drawio,
   export again, and add the hand edit to `docs/assets/diagrams/README.md`.

1. **Check the result.** Every exported PNG is a Git LFS pointer
   (`git lfs ls-files`), the images read on the light and the dark scheme of
   the site, and `mkdocs build --strict --config-file mkdocs-github.yml`
   passes.

## Rules the scripts enforce

- Lines, arrows and borders are primary or grey 700, at least 3 to 1 on
  their ground. The turquoise and cyan of the palette are only fills.
- Text is Inter, never italic, at least 4.5 to 1 on its fill, and at least
  14 pixels when the image is shown 700 pixels wide. A wide diagram needs
  larger fonts in drawio units, or a narrower layout.
- Labels are in Title Case, and code, URLs and paths keep their own case
  (`title_case` in `scripts/design.py`). A name such as GitLab has one spelling.
- A label background only masks a line, in the colour of what lies behind
  it (`label_ground` in `scripts/design.py`). A label inside its own shape has none.
- One icon per idea on every page: the person, the web app, the physical
  and the digital twin, listed in `docs/assets/diagrams/README.md`. A UML or
  C4 diagram keeps the person of its notation.
- One box style, one arrow style, no emoji, and no note written into the
  picture.
- A third-party logo is its owner's file, unchanged. GitLab's official SVG,
  in colour and in white for the dark variant, is in `assets/`, taken from
  <https://about.gitlab.com/press/press-kit/>.
