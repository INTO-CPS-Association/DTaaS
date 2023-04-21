// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';
// import config from '../../playwright.config';

test.describe('Tests on Authentication Flow', () => {
  test('Homepage has correct title and signin link', async ({ page }) => {
    //    await page.goto(config.baseURL);
    await page.goto('/');

    await expect(page).toHaveTitle('The Digital Twin as a Service');

    await page.locator('button:has-text("Sign In")').click();

    await expect(page).toHaveURL(/.*library/);
  });

  test('Fill the signin fields', async ({ page }) => {
    await page.goto('/');

    await page.locator('input[name="password"]').fill('dummy password');
    await page.locator('input[name="email"]').fill('user@au.dk');
    await page.locator('button').first().click();

    await expect(page).toHaveURL(/.*library/);
  });

  test('Account Button Contents and Links', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('The Digital Twin as a Service');

    await page.locator('button:has-text("Sign In")').click();
    await expect(page).toHaveURL(/.*library/);

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Account').click();
    await expect(page).toHaveURL('/account');

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Logout').click();
    await expect(page).toHaveURL('/');
  });

  test('Accessing protected routes without authentication', async ({
    page,
  }) => {
    await page.goto('/library');

    // Check if redirected back to the Signin page
    await expect(page).toHaveURL('/');

    // Check if "Sign In" button is visible
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();

    await page.goto('/library');
    await expect(page).toHaveURL('/');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();

    await page.goto('/digitaltwins');
    await expect(page).toHaveURL('/');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();

    await page.goto('/workbench');
    await expect(page).toHaveURL('/');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });
});
