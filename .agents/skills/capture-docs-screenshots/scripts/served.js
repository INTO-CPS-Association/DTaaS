// Captures of pages served outside the signed-in website: the public
// configuration check and the library microservice's file browser. Each
// opens in its own tab, which shares the installation's sign-in cookie.
const { around, span } = require('./shots');

// An unreachable website URL, swapped into this tab's copy of env.js only.
const BAD_URL = 'http://localhost:1/';

async function openTab(ctx, route, prepare) {
  const tab = await ctx.page.context().newPage();
  if (prepare) await prepare(tab);
  await tab.goto(ctx.config.base + route);
  await tab.waitForTimeout(6000);
  return tab;
}

async function breakWebsiteUrl(tab) {
  await tab.route('**/env.js', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /REACT_APP_URL:\s*["'][^"']*["']/,
      `REACT_APP_URL: "${BAD_URL}"`,
    );
    await route.fulfill({ response, body });
  });
}

async function shootConfig(ctx, prepare, name) {
  const tab = await openTab(ctx, '/config/developer', prepare);
  const card = tab
    .locator('.MuiPaper-root')
    .filter({ hasText: 'Config verification' });
  await around({ ...ctx, page: tab }, { of: card.first() }, name);
  await tab.close();
}

async function configCheck(ctx) {
  await shootConfig(ctx, null, 'client-config-valid.png');
  await shootConfig(ctx, breakWebsiteUrl, 'client-config-invalid.png');
}

async function libraryFiles(ctx) {
  for (const [route, name] of [
    ['/lib/files', 'top-level.png'],
    [`/lib/files/fs/${ctx.config.user}/`, 'inside.png'],
  ]) {
    const tab = await openTab(ctx, route);
    const panel = tab.locator('.panel').first();
    const lastRow = tab.locator('.files li').last();
    await span(
      { ...ctx, page: tab },
      { container: panel, top: panel, bottom: lastRow },
      name,
    );
    await tab.close();
  }
}

module.exports = { configCheck, libraryFiles };
