---
name: capture-docs-screenshots
description: Capture the DTaaS website screenshots used in the user documentation from a running installation, in light mode, and copy them over the images in docs/. Use when asked to retake, refresh or update documentation screenshots, or after a change to the website's layout or theme.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires Node.js 24 or later, Playwright with Chromium installed in client/node_modules, and a running DTaaS installation with a GitLab user whose workspace is running.
---

# Capture documentation screenshots

The scripts in `scripts/` sign in to a DTaaS installation with Playwright,
visit every main menu page and the pages linked from them, and save one
PNG per documentation image. `scripts/images.js` maps each capture to the
images it replaces. Work through every step.

## Steps

1. **Check the prerequisites.** The installation answers at its URL
   (default `http://localhost`), the user's workspace is running, and
   `client/node_modules/playwright` exists (`yarn install` in `client/`,
   then `npx playwright install chromium`). In a worktree without
   `node_modules`, set `PLAYWRIGHT_FROM` to a `client/` directory that has
   them. Ask the user for the username and password; never write them to
   a file.

1. **Confirm the side effects** with the user before the first run. The
   run executes the **Hello World** digital twin twice and starts one
   execution of **Mass Spring Damper** on the installation's GitLab
   runners. It turns on **Send logs to**, so the installation's logger
   microservice records the run's clicks. Everything else stays in a
   throwaway browser profile: typed settings are restored, the Create and
   Reconfigure editors are left without saving, and the local activity
   log lives only in that profile.

1. **Capture** from the repository root, passing the credentials only
   through the environment:

   ```bash
   DTAAS_USER=<user> DTAAS_PASSWORD=<password> DTAAS_URL=http://localhost \
     node .agents/skills/capture-docs-screenshots/scripts/capture.js <out-dir>
   ```

   It prints `step: <name>` per page group and takes several minutes,
   mostly waiting for the Hello World runs to finish. Done when it exits 0. A
   step that fails names the locator it waited for; the page has changed,
   so update that step's selector in the matching module and rerun.

1. **Review every capture** by opening the images. Look for tooltips,
   notifications or dialogs that cover content, crops that cut off a
   control, and pages still loading. Fix the step and rerun until each
   image shows what the page beside it in `docs/` describes.

1. **Apply** the captures:

   ```bash
   node .agents/skills/capture-docs-screenshots/scripts/apply.js <out-dir>
   ```

   It lists captures that were not taken. `gitlab-auth-2.png` and
   `gitlab-sso-2.png` are taken only while GitLab still asks the user to
   authorise the installation and the website, so their absence after the
   first sign-in is expected. Revoking both applications under the user's
   GitLab **User settings > Applications** brings the pages back.

1. **Keep the docs and map in step.** A new page or image needs an entry
   in `scripts/images.js` and a reference in the markdown beside the
   image; `node --test` in `scripts/` fails otherwise. An image that no
   page shows yet goes in the `UNREFERENCED` list instead. Then build the
   docs (`mkdocs build -f mkdocs-github.yml` on Windows) and run
   markdownlint on the pages you touched.

1. **Report** which images changed (`git status docs/`), which were not
   captured and why, and which digital twin executions ran.

## Modules

| File | Captures |
| :--- | :--- |
| `pages.js` | Sign-in flow, menus, main menu pages, workspace tools, Insights |
| `settings.js` | Account settings, the logging options and the stacked field-state images |
| `automation.js` | Library and Digital Twins pages, the Create tab and the Manage dialogs |
| `execution.js` | Execute tab, the Hello World runs and log, and Mass Spring Damper running |
| `served.js` | Public configuration check and the library microservice's file browser |
| `shots.js` | Crop, outline and stacking helpers shared by the modules |
| `session.js` | Browser launch, GitLab sign-in and in-app navigation |
