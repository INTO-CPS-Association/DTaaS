// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';

test.describe('Header Contents and Navigation Links', () => {
  test('Navigation Links on the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('The Digital Twin as a Service');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL('/dashboard');

    await page.locator('div[role="button"]:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/dashboard');

    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');

    await page.locator('div[role="button"]:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/dashboard');
    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');

    await page.locator('div[role="button"]:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/dashboard');
    await page
      .locator('div[role="button"]:has-text("Scenario Analysis")')
      .click();
    await expect(page).toHaveURL('/sanalysis');

    await page.locator('div[role="button"]:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/dashboard');
    await page.locator('div[role="button"]:has-text("History")').click();
    await expect(page).toHaveURL('/history');
  });

  test('Navigation Links on the Library page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('The Digital Twin as a Service');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL('/dashboard');

    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');
    await page.locator('div[role="button"]:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/dashboard');

    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');
    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');

    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');

    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');
    await page
      .locator('div[role="button"]:has-text("Scenario Analysis")')
      .click();
    await expect(page).toHaveURL('/sanalysis');

    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');
    await page.locator('div[role="button"]:has-text("History")').click();
    await expect(page).toHaveURL('/history');
  });

  test('Navigation Links on the Digital Twins page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('The Digital Twin as a Service');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL('/dashboard');

    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');
    await page.locator('div[role="button"]:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/dashboard');

    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');
    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');

    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');
    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');

    await page
      .locator('div[role="button"]:has-text("Scenario Analysis")')
      .click();
    await expect(page).toHaveURL('/sanalysis');

    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');
    await page.locator('div[role="button"]:has-text("History")').click();
    await expect(page).toHaveURL('/history');
  });

  test('Navigation Links on the Scenario Analysis page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('The Digital Twin as a Service');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL('/dashboard');

    await page
      .locator('div[role="button"]:has-text("Scenario Analysis")')
      .click();
    await expect(page).toHaveURL('/sanalysis');
    await page.locator('div[role="button"]:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/dashboard');

    await page
      .locator('div[role="button"]:has-text("Scenario Analysis")')
      .click();
    await expect(page).toHaveURL('/sanalysis');
    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');

    await page
      .locator('div[role="button"]:has-text("Scenario Analysis")')
      .click();
    await expect(page).toHaveURL('/sanalysis');
    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');

    await page
    .locator('div[role="button"]:has-text("Scenario Analysis")')
    .click();
    await expect(page).toHaveURL('/sanalysis');
    await page
      .locator('div[role="button"]:has-text("Scenario Analysis")')
      .click();
    await expect(page).toHaveURL('/sanalysis');

    await page.locator('div[role="button"]:has-text("History")').click();
    await expect(page).toHaveURL('/history');
  });
});
