// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';
import links from './Links.ts'; // Extension is required with Playwright import

test.describe('Menu Links from first page (Layout)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Open settings' })
    ).toBeVisible();
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Menu Links are visible', async ({ page }) => {
    await links.reduce(async (previousPromise, link) => {
      await previousPromise;
      const linkElement = await page.locator(
        `div[role="button"]:has-text("${link.text}")`
      );
      await expect(linkElement).toBeVisible();
    }, Promise.resolve());
  });

  test('Menu Links are clickable', async ({ page }) => {
    await links.reduce(async (previousPromise, link) => {
      await previousPromise;
      await page.locator(`div[role="button"]:has-text("${link.text}")`).click();
      await expect(page).toHaveURL(link.url);
      await expect(page.locator('text=404 Not Found')).not.toBeVisible();
    }, Promise.resolve());
  });
});
