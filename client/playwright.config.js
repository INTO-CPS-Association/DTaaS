// playwright.config.js
// @ts-check
// src: https://playwright.dev/docs/api/class-testconfig

const config = {
  timeout: 30000,
  globalTimeout: 600000,
  testDir: './test/e2e',
  testMatch: /.*\.js/,
  reporter: [['html'], ['list']],
};

module.exports = config;
