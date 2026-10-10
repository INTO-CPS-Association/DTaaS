// Captures of the Library and Digital Twins pages reached from Automation,
// including one run of the Hello World digital twin and its log.
const { go } = require('./session');
const { clearOutlines, outlineElement } = require('./shots');

const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const RUN_FINISHED = /Status: (Completed|Failed|Canceled)/;

async function libraryPreview(ctx) {
  const { page } = ctx;
  await go(page, 'preview/library');
  await page.getByRole('tab', { name: 'Tools' }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: ctx.out('lib_preview_tools.png') });
  await page.getByRole('tab', { name: 'Functions' }).click();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ctx.out('lib_preview_selection.png') });
}

// Details only reads; the Reconfigure dialog is left by navigating away,
// never through its Save button, so no digital twin changes.
async function digitalTwinsPreview(ctx) {
  const { page } = ctx;
  await go(page, 'preview/digitaltwins');
  await page.screenshot({ path: ctx.out('dt_preview_create.png') });
  await page.getByRole('tab', { name: 'Manage' }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: ctx.out('dt_preview_manage.png') });
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

// Start Hello World, show it running, then show its log once it finishes.
async function executeHelloWorld(ctx) {
  const { page } = ctx;
  await go(page, 'preview/digitaltwins');
  await page.getByRole('tab', { name: 'Execute' }).click();
  await page.waitForTimeout(5000);
  const card = page.locator('.MuiCard-root').filter({ hasText: 'Hello World' });
  await card.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: ctx.out('concurrent-execution.png') });
  await card.getByRole('button', { name: 'History' }).click();
  await page.waitForTimeout(2000);
  const dialog = page.getByRole('dialog');
  await outlineElement(page, dialog.getByLabel('stop').first(), '#e02020');
  await page.screenshot({ path: ctx.out('stop-execution.png') });
  await clearOutlines(page);
  await waitForRun(dialog);
  await dialog.locator('[aria-expanded]').first().click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: ctx.out('dt_execute_log.png') });
  await dialog.getByRole('button', { name: 'Close' }).click();
}

async function waitForRun(dialog) {
  const entry = dialog.getByText(RUN_FINISHED).first();
  await entry.waitFor({ timeout: RUN_TIMEOUT_MS });
}

module.exports = { digitalTwinsPreview, executeHelloWorld, libraryPreview };
