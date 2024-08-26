// playwright.config.js
// @ts-check
// src: https://playwright.dev/docs/api/class-testconfig

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: './test/.env' });
// import fs from 'fs';
// import path from 'path';

// const storeState = JSON.parse(fs.readFileSync(path.resolve('./playwright/.auth/user.json'), 'utf-8'));
const BASE_URI = process.env.REACT_APP_URL ?? 'http://localhost:4000/';

export default defineConfig({
  webServer: {
    command: 'yarn start',
    port: 4000,
  },
  timeout: 80 * 1000,
  globalTimeout: 10 * 60 * 1000,
  testDir: './test/e2e/tests',
  testMatch: /.*\.test\.ts/,
  reporter: [
    [
      'html',
      {
        outputFile: 'playwright-report/index.html',
      },
    ],
    ['list'],
    [
      'junit',
      {
        outputFile: 'playwright-report/results.xml',
      },
    ],
    [
      'json',
      {
        outputFile: 'playwright-report/results.json',
      },
    ],
  ], // Codecov handled through Monocart-Reporter https://github.com/cenfun/monocart-reporter
  use: {
    baseURL: BASE_URI,
    trace: 'retain-on-failure',
  },
  projects: [
    // Setup project
    {
      name: 'dummy-test',
      testMatch: /Pass.dummy.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { browserName: 'firefox' },
      dependencies: ['dummy-test'],
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
  globalSetup: 'test/e2e/setup/global.setup.ts',
  globalTeardown: 'test/e2e/setup/global-teardown.ts',
});
