// src: https://playwright.dev/docs/writing-tests

import { test, expect, Page } from '@playwright/test';

const title = 'The Digital Twin as a Service';
const signInButton = 'button:has-text("Sign In")';

async function signInAndNavigateToDashboard(page: Page) {
  await page.goto('/');
  await expect(page).toHaveTitle(title);
  await page.locator(signInButton).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Header Contents and Navigation Links', () => {
  test('Navigation Links on the dashboard page', async ({ page }) => {
    await signInAndNavigateToDashboard(page);

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
    await signInAndNavigateToDashboard(page);

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
    await signInAndNavigateToDashboard(page);

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
    await signInAndNavigateToDashboard(page);

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
