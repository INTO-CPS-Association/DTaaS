// playwright.config.js
// @ts-check
// src: https://playwright.dev/docs/api/class-testconfig

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Check if playwright was called with 'ext' flag.
const useExtServer = process.env.ext === 'true';

dotenv.config({ path: './test/.env', quiet: true });
// import fs from 'fs';
// import path from 'path';

// const storeState = JSON.parse(fs.readFileSync(path.resolve('./playwright/.auth/user.json'), 'utf-8'));
const BASE_URI = process.env.REACT_APP_URL ?? 'http://localhost:4000/';
const ignoreHttpsErrors = process.env.IGNORE_HTTPS_ERRORS === 'true';

export default defineConfig({
  webServer: useExtServer
    ? undefined
    : {
        command: 'yarn start',
        url: BASE_URI,
        // Playwright's default, written out: a port already in use stops the
        // run, so the suite never tests a website it did not build.
        reuseExistingServer: false,
      },
  retries: process.env.CI ? 0 : 1, // Disable retries on Github actions for now as setup always fails
  timeout: 90 * 1000, // 90 seconds per test
  // The per-test limits of the sequential projects add up to about 39 minutes
  // at worst: 600 s for each concurrent execution test, 300 s for the digital
  // twin test, about 480 s for the measurement tests and 360 s for the
  // lifecycle test, run once per browser. When the global limit stops a run,
  // no test's clean-up runs, so it has to cover that. CI keeps 25 minutes,
  // inside the 30-minute cap of its job, since sign-in cannot complete there
  // and the tests that depend on it are skipped.
  globalTimeout: (process.env.CI ? 25 : 45) * 60 * 1000,
  // Run pipeline tests in parallel to test concurrent GitLab requests.
  workers: 3,
  testDir: './test/e2e/tests',
  testMatch: '**/*.test.ts',
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
    screenshot: 'only-on-failure',
    trace: 'on-first-retry', // Will not record trace on Github actions because of no retries
    headless: true,
    ignoreHTTPSErrors: ignoreHttpsErrors,
  },
  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: '**/*.setup.ts',
      use: { browserName: 'chromium' },
    },
    // Pipeline tests use the shared worker pool to test concurrent requests.
    {
      name: 'chromium-sequential',
      testMatch: /ConcurrentExecution|DigitalTwins|Measurement/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testIgnore: /ConcurrentExecution|DigitalTwins|Measurement/,
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Use prepared auth state.
        storageState: 'playwright/.auth/user.json',
      },
      testIgnore: /ConcurrentExecution|DigitalTwins|Measurement/,
      timeout: 2 * 60 * 1000,
      dependencies: ['setup'],
    },
    {
      name: 'firefox-sequential',
      testMatch: /ConcurrentExecution|DigitalTwins|Measurement/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      timeout: 2 * 60 * 1000,
      // Start after setup so Firefox can run pipeline tests alongside Chromium.
      dependencies: ['setup'],
    },
  ],
  globalSetup: 'test/e2e/setup/global.setup.ts',
  globalTeardown: 'test/e2e/setup/global-teardown.ts',
  reportSlowTests: null,
});
