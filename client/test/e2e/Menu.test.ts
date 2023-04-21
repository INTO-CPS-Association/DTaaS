// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';

interface TestLink {
  text: string;
  url: string;
}
const links: TestLink[] = [
  { text: 'Library', url: '/library' },
  { text: 'Digital Twins', url: '/digitaltwins' },
  { text: 'Workbench', url: '/workbench' },
];

test.describe('Menu Links from first page (Layout)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Sign In")').click();
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
