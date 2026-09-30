// src: https://playwright.dev/docs/writing-tests
import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import links from 'test/e2e/tests/Links';
import { authorizeIfAsked } from 'test/e2e/setup/appSettings';

test.describe('Tests on Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('Homepage has correct title and signin link', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await authorizeIfAsked(page);
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Account Button Contents and Links', async ({ page, baseURL }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await authorizeIfAsked(page);
    await expect(page).toHaveURL(/.*Library/);

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Account').click();
    await expect(page).toHaveURL('./account');

    await page.locator('[aria-label="Open settings"]').click();
    await page.locator('text=Logout').click();
    await expect(page).toHaveURL(baseURL?.replace(/\/$/, '') ?? './');
  });

  test('Accessing protected routes without authentication', async ({
    context,
    baseURL,
  }) => {
    // A page of its own for each address, so each one is opened the way a
    // visitor opens a link, and never by unloading the previous page (see
    // openAuthenticatedApp).
    await links.reduce(async (previousPromise, link) => {
      await previousPromise;
      const page = await context.newPage();
      await page.goto(link.url);
      await expect(page).toHaveURL(baseURL?.replace(/\/$/, '') ?? './');
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible({
        timeout: 10000,
      });
      await page.close();
    }, Promise.resolve());
  });
});
