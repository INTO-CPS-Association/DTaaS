// Captures of the Settings tab on the Account page. Field values are typed
// for the screenshots and restored; only the local activity log is saved.
const { VIEWPORT, go } = require('./session');
const shots = require('./shots');

const { around, clearOutlines, field, outlineText, span, stack } = shots;

const VALID = '#1ea0e0';
const INVALID = '#e02020';

// Screenshot name and field label for each execution setting.
const FIELD_STATES = [
  ['branch-settings.png', 'Branch Name'],
  ['group-settings.png', 'Group Name'],
  ['common-settings.png', 'Common Library Project Name'],
  ['DT-directory-settings.png', 'DT Directory'],
  ['runner-settings.png', 'Runner Tag'],
];

async function openSettings(page) {
  await go(page, 'account');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.waitForTimeout(2500);
}

// The Logs page records nothing until the local activity log is enabled.
async function enableLocalLog(ctx) {
  await openSettings(ctx.page);
  const box = ctx.page.getByLabel('Keep a local activity log');
  if (!(await box.isChecked())) await box.check();
  await ctx.page.getByRole('button', { name: 'Save Settings' }).click();
  await ctx.page.waitForTimeout(1500);
}

async function settings(ctx) {
  const { page } = ctx;
  await openSettings(page);
  const paper = page
    .locator('.MuiPaper-outlined')
    .filter({ hasText: 'Application Settings' })
    .last();
  // The settings card scrolls inside a normal viewport; enlarge it once.
  await page.setViewportSize({ width: VIEWPORT.width, height: 1600 });
  await page.waitForTimeout(1500);
  await paper.screenshot({ path: ctx.out('settings-overview.png') });
  const heading = page.getByText('Measurement Settings', { exact: true });
  const last = field(page, 'Secondary Digital Twin');
  await span(ctx, paper, heading, last, 'measurement-settings.png');
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(1500);
  const buttons = page
    .getByRole('button', { name: 'Save Settings' })
    .locator('xpath=..');
  await around(ctx, buttons, 'saving-settings.png');
  for (const [name, label] of FIELD_STATES) {
    await fieldStates(ctx, label, name);
  }
}

async function setValue(page, input, value) {
  await input.fill(value);
  await input.blur();
  await page.waitForTimeout(400);
}

// A valid value, a value that does not exist and an empty field, stacked.
async function fieldStates(ctx, label, name) {
  const { page } = ctx;
  const input = page.getByLabel(label, { exact: true });
  const original = await input.inputValue();
  await input.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  const states = [
    [original, VALID],
    ['foo', INVALID],
    ['', INVALID],
  ];
  const parts = [];
  for (const [i, [value, colour]] of states.entries()) {
    await setValue(page, input, value);
    await clearOutlines(page);
    await outlineText(page, input, colour);
    parts.push(`${name}.${i}.png`);
    await around(ctx, field(page, label), parts[i], 12);
  }
  await clearOutlines(page);
  await setValue(page, input, original);
  await stack(ctx, parts.map(ctx.out), name);
}

module.exports = { enableLocalLog, settings };
