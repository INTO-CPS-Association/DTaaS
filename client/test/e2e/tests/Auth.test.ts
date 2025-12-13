// src: https://playwright.dev/docs/writing-tests
import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import links from 'test/e2e/tests/Links';

test.describe('Tests on Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('Homepage has correct title and signin link', async ({ page }) => {
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Account Button Contents and Links', async ({ page, baseURL }) => {
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*Library/);

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
      await page.goto(link.url.charAt(1).toUpperCase());
      await expect(page).toHaveURL(baseURL?.replace(/\/$/, '') ?? './');
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible({
        timeout: 10000,
      });
    }, Promise.resolve());
  });
});
