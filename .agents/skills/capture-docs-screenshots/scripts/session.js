// Browser session for a DTaaS installation: launch, sign in, navigate.
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
// Playwright comes from the client's dev dependencies, so this skill adds
// no dependency of its own. PLAYWRIGHT_FROM points at another directory
// that has it installed, such as the client of a different checkout.
const PLAYWRIGHT_FROM =
  process.env.PLAYWRIGHT_FROM || path.join(REPO_ROOT, 'client');
const { chromium } = require(
  require.resolve('playwright', { paths: [PLAYWRIGHT_FROM] }),
);

const TIMEOUT = 60000;
const VIEWPORT = { width: 1600, height: 900 };

function readConfig(env) {
  const { DTAAS_USER: user, DTAAS_PASSWORD: password } = env;
  if (!user || !password) {
    throw new Error('Set DTAAS_USER and DTAAS_PASSWORD');
  }
  const base = (env.DTAAS_URL || 'http://localhost').replace(/\/+$/, '');
  return { base, user, password };
}

async function openBrowser() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'light',
  });
  return { browser, context, page: await context.newPage() };
}

async function gitlabLogin(ctx, shot) {
  const { page, config } = ctx;
  await page.waitForSelector('#user_login', { timeout: TIMEOUT });
  if (shot) await page.screenshot({ path: ctx.out(shot) });
  await page.fill('#user_login', config.user);
  await page.fill('#user_password', config.password);
  await page.press('#user_password', 'Enter');
}

// GitLab asks to authorize an application only until the user agrees once.
async function authorizeIfAsked(ctx, ready, shot) {
  const authorize = ctx.page.getByRole('button', { name: /Authorize/ });
  await authorize.or(ready).first().waitFor({ timeout: TIMEOUT });
  if (await authorize.isVisible()) {
    await ctx.page.screenshot({ path: ctx.out(shot) });
    await authorize.press('Enter');
  }
}

// Navigate inside the single page app; a full reload would drop the
// in-memory sign-in session.
async function go(page, route, settle = 4000) {
  await page.evaluate((r) => {
    window.history.pushState({}, '', '/' + r);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await page.waitForTimeout(settle);
}

module.exports = {
  REPO_ROOT,
  TIMEOUT,
  VIEWPORT,
  authorizeIfAsked,
  gitlabLogin,
  go,
  openBrowser,
  readConfig,
};
