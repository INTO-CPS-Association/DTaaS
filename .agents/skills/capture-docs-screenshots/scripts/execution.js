// Captures of the Execute tab: two runs of Hello World, its log, and one
// run of Mass Spring Damper started alongside them.
const { go } = require('./session');
const { around, clearOutlines, outlineElement } = require('./shots');

const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 5000;
const COMPLETED = /Status: Completed/;

const card = (page, name) =>
  page.locator('.MuiCard-root').filter({ hasText: name });

async function openExecuteTab(page) {
  await go(page, 'preview/digitaltwins');
  await page.getByRole('tab', { name: 'Execute' }).click();
  await card(page, 'Hello World')
    .getByRole('button', { name: 'Start' })
    .waitFor();
  await page.waitForTimeout(2000);
}

// The Execute tab before anything runs, as a page and as the tab alone.
async function executeTab(ctx) {
  const { page } = ctx;
  await openExecuteTab(page);
  await page.screenshot({ path: ctx.out('dt_preview_execute.png') });
  const tabs = page.getByRole('tablist').first();
  const cards = page.locator('.MuiCard-root');
  await around(
    ctx,
    { of: [tabs, cards.first(), cards.last()] },
    'dt_execute.png',
  );
}

async function startRun(page, name) {
  await card(page, name).getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(5000);
}

async function openHistory(page, name) {
  await card(page, name).getByRole('button', { name: 'History' }).click();
  await page.waitForTimeout(2000);
  return page.getByRole('dialog');
}

// Wait until the history dialog lists more completed runs than `before`.
async function waitForCompleted(dialog, before) {
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  while ((await dialog.getByText(COMPLETED).count()) <= before) {
    if (Date.now() > deadline) throw new Error('Run did not complete');
    await dialog.page().waitForTimeout(POLL_MS);
  }
}

async function firstRun(ctx) {
  const { page } = ctx;
  await startRun(page, 'Hello World');
  await page.screenshot({ path: ctx.out('dt_execute_running.png') });
  const dialog = await openHistory(page, 'Hello World');
  await outlineElement(page, dialog.getByLabel('stop').first(), '#e02020');
  await page.screenshot({ path: ctx.out('stop-execution.png') });
  await clearOutlines(page);
  await waitForCompleted(dialog, 0);
  await dialog.locator('[aria-expanded]').first().click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: ctx.out('dt_execute_log.png') });
  await dialog.getByRole('button', { name: 'Close' }).click();
}

async function secondRun(page) {
  await startRun(page, 'Hello World');
  const dialog = await openHistory(page, 'Hello World');
  await waitForCompleted(dialog, await dialog.getByText(COMPLETED).count());
  await dialog.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(1000);
}

// Mass Spring Damper is left running; the run finishes on its own.
async function executeTwins(ctx) {
  const { page } = ctx;
  await openExecuteTab(page);
  await firstRun(ctx);
  await secondRun(page);
  await startRun(page, 'Mass Spring Damper');
  await page.screenshot({ path: ctx.out('concurrent-execution.png') });
}

module.exports = { executeTab, executeTwins };
