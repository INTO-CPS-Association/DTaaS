// playwright.config.js
// @ts-check
// src: https://playwright.dev/docs/api/class-testconfig

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: './test/.env' });
// import fs from 'fs';
// import path from 'path';

// const storeState = JSON.parse(fs.readFileSync(path.resolve('./playwright/.auth/user.json'), 'utf-8'));
const BASE_URI = process.env.REACT_APP_URL.toString() ?? '';

export default defineConfig({
  timeout: 45000,
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
    baseURL: BASE_URI,
    trace: 'retain-on-failure',
  },
  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { browserName: 'firefox' },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
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
