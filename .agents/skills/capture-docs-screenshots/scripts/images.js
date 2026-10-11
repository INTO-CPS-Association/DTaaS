// Where each captured screenshot goes in the documentation, relative to
// the repository root. One capture can illustrate several pages.
const WEBSITE = 'docs/user/website/images';
const DEVOPS = 'docs/user/digital-twins/devops/images';
const LIBRARY = 'docs/user/library/devops';
const TWINS = 'docs/user/digital-twins';
const LIB_MS = 'docs/user/servers/lib';

const IMAGES = {
  'gitlab-auth-1.png': [`${WEBSITE}/gitlab-auth-1.png`],
  'gitlab-auth-2.png': [`${WEBSITE}/gitlab-auth-2.png`],
  'visit-dtaas-1.png': [`${WEBSITE}/visit-dtaas-1.png`],
  'gitlab-sso-1.png': [
    `${WEBSITE}/gitlab-sso-1.png`,
    `${WEBSITE}/workspace-logo.png`,
  ],
  'gitlab-sso-2.png': [`${WEBSITE}/gitlab-sso-2.png`],
  'menu.png': [`${WEBSITE}/menu.png`],
  'logout.png': [`${WEBSITE}/logout.png`],
  'library.png': [`${WEBSITE}/library.png`],
  'digital_twins.png': [`${WEBSITE}/digital_twins.png`],
  'automation.png': [`${WEBSITE}/automation.png`],
  'buildings.png': [`${WEBSITE}/buildings.png`],
  'workbench.png': [
    `${WEBSITE}/workbench.png`,
    `${WEBSITE}/workspace-workbench.png`,
  ],
  'workbench_tools.png': [`${WEBSITE}/workbench_tools.png`],
  'insights.png': [`${WEBSITE}/insights.png`],
  'account-profile.png': [`${WEBSITE}/account-profile.png`],
  'xfce-desktop.png': [`${WEBSITE}/xfce-desktop.png`],
  'vscode.png': [`${WEBSITE}/vscode.png`],
  'jupyterlab.png': [`${WEBSITE}/jupyterlab.png`],
  'jupyter_notebook.png': [`${WEBSITE}/jupyter_notebook.png`],
  'settings-overview.png': [`${WEBSITE}/settings-overview.png`],
  'saving-settings.png': [`${WEBSITE}/saving-settings.png`],
  'branch-settings.png': [`${DEVOPS}/branch-settings.png`],
  'group-settings.png': [`${DEVOPS}/group-settings.png`],
  'common-settings.png': [`${DEVOPS}/common-settings.png`],
  'DT-directory-settings.png': [`${DEVOPS}/DT-directory-settings.png`],
  'runner-settings.png': [`${DEVOPS}/runner-settings.png`],
  'measurement-settings.png': [`${DEVOPS}/measurement-settings.png`],
  'lib_preview_tools.png': [
    `${WEBSITE}/lib_preview_tools.png`,
    `${LIBRARY}/empty-list.png`,
  ],
  'library-DTs.png': [`${LIBRARY}/library-DTs.png`],
  'library-selection.png': [`${LIBRARY}/library-selection.png`],
  'dt-create-config.png': [`${DEVOPS}/dt-create-config.png`],
  'lib_preview_selection.png': [
    `${WEBSITE}/lib_preview_selection.png`,
    `${LIBRARY}/dt_selection.png`,
  ],
  'dt_preview_create.png': [
    `${WEBSITE}/dt_preview_create.png`,
    `${DEVOPS}/dt-create-empty.png`,
  ],
  'dt_preview_tabs.png': [`${WEBSITE}/dt_preview_tabs.png`],
  'dt_preview_manage.png': [
    `${WEBSITE}/dt_preview_manage.png`,
    `${DEVOPS}/dt_manage.png`,
    `${TWINS}/dt_manage.png`,
  ],
  'dt_manage_details.png': [
    `${DEVOPS}/dt_manage_details.png`,
    `${TWINS}/dt_manage_details.png`,
  ],
  'dt_preview_manage_reconfigure.png': [
    `${WEBSITE}/dt_preview_manage_reconfigure.png`,
    `${DEVOPS}/dt_manage_reconfigure.png`,
    `${TWINS}/dt_manage_reconfigure.png`,
  ],
  'dt_preview_execute.png': [`${WEBSITE}/dt_preview_execute.png`],
  'dt_execute.png': [`${DEVOPS}/dt_execute.png`],
  'dt_execute_running.png': [`${TWINS}/dt_execute_running.png`],
  'concurrent-execution.png': [`${DEVOPS}/concurrent-execution.png`],
  'stop-execution.png': [`${DEVOPS}/stop-execution.png`],
  'dt_execute_log.png': [
    `${DEVOPS}/dt_execute_log.png`,
    `${TWINS}/dt_execute_log.png`,
  ],
  'client-config-valid.png': ['docs/admin/guides/client-config-valid.png'],
  'client-config-invalid.png': ['docs/admin/guides/client-config-invalid.png'],
  'top-level.png': [`${LIB_MS}/top-level.png`, 'servers/lib/top-level.png'],
  'inside.png': [`${LIB_MS}/inside.png`, 'servers/lib/inside.png'],
  'logging-settings.png': ['docs/user/servers/logger/logging-settings.png'],
  'config.png': [`${WEBSITE}/config.png`],
  'measurement-page.png': [`${DEVOPS}/measurement-page.png`],
  'logs-all.png': [`${WEBSITE}/logs-all.png`],
  'logs-filter.png': [`${WEBSITE}/logs-filter.png`],
};

// Images that no page shows yet. They are still retaken so that they match
// the current website when a page starts to use them.
const UNREFERENCED = [
  `${LIBRARY}/library-DTs.png`,
  `${LIBRARY}/library-selection.png`,
  `${DEVOPS}/dt-create-config.png`,
  `${DEVOPS}/dt_execute.png`,
  `${WEBSITE}/dt_preview_tabs.png`,
  `${WEBSITE}/dt_preview_execute.png`,
  `${TWINS}/dt_execute_running.png`,
];

module.exports = { IMAGES, UNREFERENCED };
