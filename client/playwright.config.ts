// playwright.config.js
// @ts-check
// src: https://playwright.dev/docs/api/class-testconfig

import { devices } from '@playwright/test';

const config = {
  timeout: 30000,
  globalTimeout: 600000,
  testDir: './test/e2e',
  testMatch: /.*\.test\.ts/,
  reporter: [
    ['html', { outputFile: 'playwright-report/index.html' }],
    ['list'],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
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

export default config;
