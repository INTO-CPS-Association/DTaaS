// src: https://playwright.dev/docs/writing-tests

import { test, expect, Page } from '@playwright/test';

async function navigateAndCheckURL(page: Page, buttonSelector: string, expectedURL: string) {
  await page.locator(buttonSelector).click();
  await expect(page).toHaveURL(expectedURL);
}

test.describe('Header Contents and Navigation Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('The Digital Twin as a Service');
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL('/dashboard');
  });
  test('Navigation Links on the dashboard page', async ({ page }) => {

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Dashboard")', '/dashboard')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Dashboard")', '/dashboard')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Dashboard")', '/dashboard')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Dashboard")', '/dashboard')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("History")', '/history')
  });

  test('Navigation Links on the Library page', async ({ page }) => {

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Dashboard")', '/dashboard')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("History")', '/history')
  });

  test('Navigation Links on the Digital Twins page', async ({ page }) => {

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Dashboard")', '/dashboard')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("History")', '/history')
  });

  test('Navigation Links on the Scenario Analysis page', async ({ page }) => {

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Dashboard")', '/dashboard')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Library")', '/library')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Digital Twins")', '/digitaltwins')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')
    await navigateAndCheckURL(page, 'div[role="button"]:has-text("Scenario Analysis")', '/sanalysis')

    await navigateAndCheckURL(page, 'div[role="button"]:has-text("History")', '/history')
  });
});