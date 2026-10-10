// Capture every documentation screenshot from a running DTaaS installation.
// Usage: DTAAS_USER=... DTAAS_PASSWORD=... node capture.js <output-dir>
// DTAAS_URL selects the installation (default http://localhost).
const fs = require('node:fs');
const path = require('node:path');
const { openBrowser, readConfig } = require('./session');
const pages = require('./pages');
const { enableLocalLog, settings } = require('./settings');
const automation = require('./automation');

// Logs come last so that they record the steps before them.
const STEPS = [
  pages.signIn,
  enableLocalLog,
  pages.menus,
  pages.mainPages,
  pages.workbenchTools,
  settings,
  automation.libraryPreview,
  automation.digitalTwinsPreview,
  automation.executeHelloWorld,
  pages.insights,
];

async function main(outDir) {
  const config = readConfig(process.env);
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, page } = await openBrowser();
  const ctx = { page, config, out: (name) => path.join(outDir, name) };
  try {
    for (const step of STEPS) {
      console.log(`step: ${step.name}`);
      await step(ctx);
    }
  } finally {
    await browser.close();
  }
}

main(path.resolve(process.argv[2] || 'screenshots')).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
