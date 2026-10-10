// Captures of the Library and Digital Twins pages reached from Automation.
// Nothing is saved: the Create and Reconfigure editors are left by
// navigating away, never through their Save buttons.
const { go } = require('./session');
const { around } = require('./shots');

async function openLibraryTab(page, tab) {
  await page.getByRole('tab', { name: tab }).click();
  await page.waitForTimeout(2500);
}

async function libraryPreview(ctx) {
  const { page } = ctx;
  await go(page, 'preview/library');
  await openLibraryTab(page, 'Tools');
  await page.screenshot({ path: ctx.out('lib_preview_tools.png') });
  await openLibraryTab(page, 'Functions');
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ctx.out('lib_preview_selection.png') });
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await openLibraryTab(page, 'Digital Twins');
  await page.screenshot({ path: ctx.out('library-DTs.png') });
  await page
    .locator('.MuiCard-root')
    .filter({ hasText: 'Mass Spring Damper' })
    .getByRole('button', { name: 'Add' })
    .click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ctx.out('library-selection.png') });
  await createFromSelection(ctx);
}

// The Create tab with the CI configuration of the selected twin open.
async function createFromSelection(ctx) {
  const { page } = ctx;
  await page.getByRole('button', { name: 'Create a Digital Twin' }).click();
  await page.waitForTimeout(5000);
  await page.getByText(/configuration$/).click();
  await page.waitForTimeout(1000);
  await page.getByText('.gitlab-ci.yml', { exact: true }).last().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: ctx.out('dt-create-config.png') });
  await go(page, 'automation', 1000);
}

async function digitalTwinsPreview(ctx) {
  const { page } = ctx;
  await go(page, 'preview/digitaltwins');
  await page.screenshot({ path: ctx.out('dt_preview_create.png') });
  const heading = page.getByText('Digital Twins Page', { exact: true });
  await around(
    ctx,
    { of: [heading, page.getByRole('tablist').first()] },
    'dt_preview_tabs.png',
  );
  await page.getByRole('tab', { name: 'Manage' }).click();
  // The cards replace a loading spinner once the repository is read.
  await page.getByRole('button', { name: 'Details' }).first().waitFor();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: ctx.out('dt_preview_manage.png') });
  await manageDialogs(ctx);
}

async function manageDialogs(ctx) {
  const { page } = ctx;
  await page.getByRole('button', { name: 'Details' }).nth(1).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: ctx.out('dt_manage_details.png') });
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Reconfigure' }).nth(1).click();
  await page.waitForTimeout(4000);
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Description', { exact: true }).click();
  await page.waitForTimeout(1000);
  await dialog.getByText('README.md', { exact: true }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: ctx.out('dt_preview_manage_reconfigure.png') });
  await go(page, 'automation', 1000);
}

module.exports = { digitalTwinsPreview, libraryPreview };
