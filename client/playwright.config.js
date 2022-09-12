// playwright.config.js
// @ts-check
// src: https://playwright.dev/docs/api/class-testconfig

const { devices } = require('@playwright/test');

const config = {
  timeout: 30000,
  globalTimeout: 600000,
  testDir: './test/e2e',
  testMatch: /.*\.js/,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:4000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
};

module.exports = config;
