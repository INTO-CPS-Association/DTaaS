// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';

test.describe('Tests on Authentication Flow', () => {
  test('Homepage has correct title and signin link', async ({ page }) => {
    await page.goto('http://localhost:4000/');

    await expect(page).toHaveTitle('The Digital Twin as a Service');

    await page.locator('button:has-text("Sign In")').click();

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Fill the signin fields', async ({ page }) => {
    await page.goto('http://localhost:4000/');

    await page.locator('input[name="password"]')
      .fill('dummy password');
    await page.locator('input[name="email"]')
      .fill('user@au.dk');
    await page.locator('button')
      .first()
      .click();

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Account Button Contents and Links', async ({ page }) => {
    await page.goto('http://localhost:4000/dashboard');

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Account').click();
    await expect(page).toHaveURL('http://localhost:4000/account');

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Logout').click();
    await expect(page).toHaveURL('http://localhost:4000/');
  });
});
