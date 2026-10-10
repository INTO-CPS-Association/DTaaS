// Captures of the sign-in flow, the main menu pages and the Insights pages.
const { TIMEOUT, authorizeIfAsked, gitlabLogin, go } = require('./session');
const { around, dismissJupyterNews } = require('./shots');

// Menu route and screenshot name for every main menu page.
const MAIN_PAGES = [
  ['library', 'library.png'],
  ['digitaltwins', 'digital_twins.png'],
  ['automation', 'automation.png'],
  ['bim', 'buildings.png'],
  ['workbench', 'workbench.png'],
  ['insights', 'insights.png'],
  ['account', 'account-profile.png'],
];

// Workbench link and screenshot name for every workspace tool.
const TOOLS = [
  ['Desktop', 'xfce-desktop.png'],
  ['VSCode', 'vscode.png'],
  ['JupyterLab', 'jupyterlab.png'],
  ['Jupyter Notebook', 'jupyter_notebook.png'],
];

// The installation's own sign-in (Traefik and GitLab), then the website's.
async function signIn(ctx) {
  const { page } = ctx;
  await page.goto(ctx.config.base + '/');
  const signInButton = page.getByRole('button', { name: 'Sign In' });
  const login = page.locator('#user_login');
  await login.or(signInButton).first().waitFor({ timeout: TIMEOUT });
  if (await login.isVisible()) await gitlabLogin(ctx, 'gitlab-auth-1.png');
  await authorizeIfAsked(ctx, signInButton, 'gitlab-auth-2.png');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ctx.out('visit-dtaas-1.png') });
  const card = page
    .locator('.MuiCard-root, .MuiPaper-root')
    .filter({ has: signInButton });
  await around(ctx, { of: card.first(), pad: 24 }, 'gitlab-sso-1.png');
  await signInButton.click();
  await finishWebsiteSignIn(ctx);
}

async function finishWebsiteSignIn(ctx) {
  const signedIn = ctx.page.getByRole('button', { name: 'Open settings' });
  const login = ctx.page.locator('#user_login');
  const authorize = ctx.page.getByRole('button', { name: /Authorize/ });
  await login.or(authorize).or(signedIn).first().waitFor({ timeout: TIMEOUT });
  if (await login.isVisible()) await gitlabLogin(ctx);
  await authorizeIfAsked(ctx, signedIn, 'gitlab-sso-2.png');
  await signedIn.waitFor({ timeout: TIMEOUT });
  await ctx.page.waitForTimeout(2000);
}

// The expanded menu and the account menu that holds Logout.
async function menus(ctx) {
  const { page } = ctx;
  await go(page, 'workbench');
  await page.getByRole('button', { name: 'Open drawer' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: ctx.out('menu.png') });
  await page.locator('.MuiDrawer-paper button').first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: ctx.out('logout.png') });
  await page.keyboard.press('Escape');
  // Move off the avatar so its tooltip leaves the later screenshots.
  await page.mouse.move(800, 600);
  await page.waitForTimeout(500);
}

async function mainPages(ctx) {
  for (const [route, name] of MAIN_PAGES) {
    await go(ctx.page, route, 6000);
    const frame = ctx.page.frameLocator('iframe').first();
    if (await ctx.page.locator('iframe').count()) {
      await dismissJupyterNews(frame);
    }
    await ctx.page.screenshot({ path: ctx.out(name) });
  }
  await go(ctx.page, 'workbench');
  const tools = TOOLS.map(([label]) =>
    ctx.page.getByRole('link').filter({ hasText: label }).first(),
  );
  await around(ctx, { of: tools, pad: 24 }, 'workbench_tools.png');
}

// Each workspace tool opens in its own tab, sharing the sign-in cookies.
async function workbenchTools(ctx) {
  await go(ctx.page, 'workbench');
  for (const [label, name] of TOOLS) {
    const link = ctx.page.getByRole('link').filter({ hasText: label }).first();
    const tab = await ctx.page.context().newPage();
    // Code-server keeps loading after it renders, so wait for the document.
    await tab.goto(await link.getAttribute('href'), {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    await tab.waitForTimeout(10000);
    await dismissJupyterNews(tab);
    const connect = tab.getByRole('button', { name: 'Connect', exact: true });
    if (await connect.isVisible().catch(() => false)) {
      await connect.click();
      await tab.waitForTimeout(5000);
    }
    await tab.screenshot({ path: ctx.out(name) });
    await tab.close();
  }
}

async function insights(ctx) {
  const { page } = ctx;
  await go(page, 'insights/config', 6000);
  await page.screenshot({ path: ctx.out('config.png') });
  await go(page, 'insights/measure');
  await page.screenshot({ path: ctx.out('measurement-page.png') });
  await go(page, 'insights/log', 5000);
  await page.screenshot({ path: ctx.out('logs-all.png') });
  await page.getByPlaceholder('Filter logs').fill('click');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ctx.out('logs-filter.png') });
}

module.exports = { insights, mainPages, menus, signIn, workbenchTools };
