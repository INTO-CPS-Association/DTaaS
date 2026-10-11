// Capture every documentation screenshot from a running DTaaS installation.
// Usage: DTAAS_USER=... DTAAS_PASSWORD=... node capture.js <output-dir> [step...]
// DTAAS_URL selects the installation (default http://localhost). Naming
// steps runs only those, after signing in, to retry a step that failed.
const fs = require('node:fs');
const path = require('node:path');
const { openBrowser, readConfig } = require('./session');
const pages = require('./pages');
const { enableLogging, settings } = require('./settings');
const automation = require('./automation');
const execution = require('./execution');
const served = require('./served');

// Logs come last so that they record the steps before them.
const STEPS = [
  pages.signIn,
  enableLogging,
  pages.menus,
  pages.mainPages,
  pages.workbenchTools,
  settings,
  automation.libraryPreview,
  automation.digitalTwinsPreview,
  execution.executeTab,
  execution.executeTwins,
  served.configCheck,
  served.libraryFiles,
  pages.insights,
];

function selectSteps(names) {
  if (names.length === 0) return STEPS;
  const unknown = names.filter((n) => !STEPS.some((s) => s.name === n));
  if (unknown.length) throw new Error(`Unknown steps: ${unknown.join(', ')}`);
  const chosen = STEPS.filter(
    (s) => s !== pages.signIn && names.includes(s.name),
  );
  return [pages.signIn, ...chosen];
}

// A failed step leaves failure.png showing the page it gave up on.
async function main(outDir, names) {
  const config = readConfig(process.env);
  const steps = selectSteps(names);
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, page } = await openBrowser();
  const ctx = { page, config, out: (name) => path.join(outDir, name) };
  try {
    for (const step of steps) {
      console.log(`step: ${step.name}`);
      await step(ctx);
    }
  } catch (error) {
    await page.screenshot({ path: ctx.out('failure.png') }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

const [outDir = 'screenshots', ...names] = process.argv.slice(2);
main(path.resolve(outDir), names).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
