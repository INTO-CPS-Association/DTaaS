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

## Updating a Diagram

1. Open `dtaas-diagrams.drawio` in drawio and edit the page.
1. Export every page to its place in the documentation:

   ```bash
   python3 docs/assets/diagrams/export_diagrams.py
   ```

   The script needs the drawio desktop application. Set `DRAWIO` to its
   binary if it is not at `/Applications/draw.io.app`.

## How the File Was Made

The file was converted once from a drawio file that held every installation
diagram on a single page, in the drawio default colours. The two scripts that
did it are kept so the conversion can be repeated on a later version of that
file:

```bash
python3 docs/assets/diagrams/retheme_drawio.py original.drawio themed.drawio
python3 docs/assets/diagrams/split_pages.py themed.drawio split.drawio
```

`retheme_drawio.py` maps each colour to a colour of the theme, read from
`client/src/theme/tokens.ts`, and replaces the old wordmark with the logo in
`docs/assets/brand`. `split_pages.py` gives each diagram its own page. The
pages are then renamed by hand after the image each one replaces.
