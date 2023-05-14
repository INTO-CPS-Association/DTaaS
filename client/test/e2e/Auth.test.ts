// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';
import links from './Links.ts'; // Extension is required with Playwright import

test.describe('Tests on Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.getByRole('textbox', { name: 'username' }).fill('user-test');
  });

  test('Homepage has correct title and signin link', async ({ page }) => {
    //    await page.goto(config.baseURL);
    await expect(page).toHaveTitle('The Digital Twin as a Service');

    await page.locator('button:has-text("Sign In")').click();

    await expect(page).toHaveURL(/.*library/);
  });

  test('Fill the signin fields', async ({ page }) => {
    await page.locator('input[name="password"]').fill('dummy password');
    await page.locator('input[name="username"]').fill('user@au.dk');
    await page.locator('button').first().click();

    await expect(page).toHaveURL(/.*library/);
  });

  test('Account Button Contents and Links', async ({ page, baseURL }) => {
    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL(/.*library/);

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Account').click();
    await expect(page).toHaveURL('./account');

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Logout').click();
    await expect(page).toHaveURL(baseURL?.replace(/\/$/, '') ?? './');
  });

  test('Accessing protected routes without authentication', async ({
    page,
    baseURL,
  }) => {
    await links.reduce(async (previousPromise, link) => {
      await previousPromise;
      await page.goto(link.url);
      await expect(page).toHaveURL(baseURL?.replace(/\/$/, '') ?? './');
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    }, Promise.resolve());
  });
});
