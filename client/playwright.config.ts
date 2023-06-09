// playwright.config.js
// @ts-check
// src: https://playwright.dev/docs/api/class-testconfig

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
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
    browserName: 'firefox',
    baseURL: 'http://localhost:4000/',
  },
  projects: [
    // Setup project
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Use prepared auth state.
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
