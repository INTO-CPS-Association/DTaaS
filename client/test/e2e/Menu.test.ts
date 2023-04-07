// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';

test.describe('Header Contents and Navigation Links', () => {
  test('Navigation Links on the Library page', async ({ page }) => {
    await page.goto('/library');
    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');

    await page.goto('/library');
    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');
  });

  test('Navigation Links on the Digital Twins page', async ({ page }) => {
    await page.goto('/digitaltwins');
    await page.locator('div[role="button"]:has-text("Library")').click();
    await expect(page).toHaveURL('/library');

    await page.goto('/digitaltwins');
    await page.locator('div[role="button"]:has-text("Digital Twins")').click();
    await expect(page).toHaveURL('/digitaltwins');
  });
});
