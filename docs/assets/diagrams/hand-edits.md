# Hand Edits to the Diagrams

The edits made by hand in drawio after a step of the
`.agents/skills/update-docs-diagrams` skill, page by page. The rules and the
steps are in [README.md](README.md).

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
figures use, added to `COLOURS` in `config.py`, and replaces a wordmark that
lies loose on the page instead of in a group. The restyle leaves
the DTaaS mark off the pages listed in `NO_MARK`, which draw a concept and not
the DTaaS system, so their largest box is not the DTaaS boundary.

The hand edits, by page:

- `developer/system/architecture.png`: the running figures, the clipboard and
  the DTs icon were emoji, two of them fetched from an external site. The
  clipboard is a note shape. The running figures and the DTs icon were later
  drawn with icons of the set (see the second review below). The two boxes
  on the right are wider and several labels moved off their icons.
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
- The ten figures added on 14 and 15 October 2026, from `lifecycle-phases.png` to
  `library-assets.png` in the table of [README.md](README.md), had no drawio
  source. They are
  redrawn from the images the documentation showed, keeping every box, arrow
  and label, and then themed with the retheme, restyle and shrink steps.
  Each page is about 1000 units wide (1044 for `lifecycle-phases.png`), so its
  text reaches 14 pixels at the column width, and the concept pages are in
  `NO_MARK`. Third-party product logos, such as the service logos of
  `current-status-developer.png`, are cropped from those images without
  changing a pixel, apart from a white background made transparent. The wind
  turbine of `shm-dt-workflow.png` was cropped too, and is now the shared
  turbine icon (see the entry for that page below).
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
- A review of every placed image against the first images, from before the
  theme work, found more, also fixed by hand:
  - The red padlock of `dtaas-userview.png` is the outline padlock of the
    icon set, in the colour of the person beside it.
  - `secure-server-gitlab/server.png` shows two people, as the first image.
  - The running figures of the twins on `architecture.png` are back, drawn
    with the running pictogram of the drawio signs library.
  - The Else line of `design-sequence.png` ends in a circle again.
  - Mandatory of `asset-relationship.png` and User of
    `current-status-developer.png` moved clear of the boxes and icons.
- The second review of #1853 on 16 October 2026 found more, fixed as follows:
  - Subscripts, such as the 1 of DT Instance 1, are written at full size
    after the name: a restyle rule, stated here because the figures show it.
  - The running figures on `architecture.png` and
    `current-status-developer.png` are the running pictogram of the drawio
    signs library, in primary, and no longer emoji crops. The DTs asset icon
    of `architecture.png` is the twin car of the icon table.
  - The cropped logos and icons on `architecture.png` and
    `shm-dt-workflow.png` have a transparent background, so none shows as a
    white tile in a dark image. On `current-status-developer.png`, which has
    no dark image, the ThingsBoard logo and the folder have a transparent
    background, the terminal keeps the white of its window, and the VNC icon
    keeps its pale hexagon, which is part of the icon.
  - The Single Page Web Application of `system-architecture-c4.png` is in the
    Services layer tint, as in the first image, and no fill or line on the
    two C4 pages is drawn see-through. The Services label keeps 18 units
    from the hexagon outline. The missing parenthesis of Cloud Services on
    `implementation-status.png` is back.
  - `gitlab-runner-two-servers.png` and `docker-check.png` went through the
    restyle, so their text reaches 14 pixels. `docker-check.png` shows two
    people, as the image it replaces, and its route labels end clear of the
    lines they name.
  - The connector labels of the two OAuth pages are Inter in grey 700, and
    connector labels everywhere read as sentences: "May have", "Run inside",
    "GET authcode (using OAUTH_CLIENT_ID)". A UML guard reads as a sentence
    too.
  - The two bars of `lifecycle-phases.png` are narrow filled boxes, so the
    restyle no longer resets their width. The arrows that cross them are
    listed in `LAYOUT_EXCEPTIONS`. Terminate has its own tint.
  - The asset types share one colour code on `library-assets.png` and
    `asset-relationship.png`, in the order of the swatches of
    `file-system-layout.png`: Functions white, Tools grey, Models turquoise,
    Data cyan and Digital Twins blue. `library-assets.png` is 100 units
    shorter.
  - `current-status-developer.png`: one cloud round the workspaces, the
    terminal clear of VNC, the labels of the mesh lines apart, the Direct
    arrow reaching its cloud and the arrow to the twins leaving from the top
    of the workspace cloud.
  - The trunk of `traefik-oauth.png` meets the bus on the riser of Service 2,
    and its two people are grey like every other person.
  - The users of `user-interaction-in-federated-DTaaS.png` use the one user
    icon, with both arrows leaving from its side.
  - Page ids that read as drafts, such as `p1` and `redraw-4`, are the slug
    of the page name.
- On 16 October 2026 the maintainer corrected seven pages by hand, and
  they are kept as he sent them:
  - `user-interaction-in-federated-DTaaS.png` is drawn compact, with the
    two users closer together and smaller boxes.
  - `implementation-status.png` has GitLab inside the DTaaS boundary,
    with Reusable Assets, File System and their labels moved to make room.
  - `gitlab-integrated-runner.png`, `gitlab-runner-two-servers.png` and
    its release version have wider remote boxes, so each runner label
    fits on one line, and the runner lines leave GitLab on one side.
  - `gitlab-integrated-install.png` has a straight `/gitlab` route, so
    the two segments that retrace it are in `LAYOUT_EXCEPTIONS`.
  - `dtaas-userview.png` has the user icon moved 5 units to the right.
  - `gitlab-runner-two-servers.png` reads `https://intocps.com/gitlab`
    under Server 2, the one place that keeps `intocps.com`. The maintainer
    confirmed it on 16 October 2026.
- `shm-dt-workflow.png` shows the turbine icon of `system-architecture.png`
  in place of three crops of the old picture, with three vibration sensors on
  the tower and the sensor legend clear of the line that leaves it.
- `federated-dtaas.png` draws every arrow as a thin grey line. Eleven were
  thick and in primary, a weight the figure did not explain.
- The DevOps box of `DTaaS-user-view.png` and `system-architecture.png`
  grew 35 units upward, so its three lines of text stay inside it.
