// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';
import links from './Links.ts'; // Extension is required with Playwright import - ignore VSCode warning

test.describe('Tests on Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('Homepage has correct title and signin link', async ({ page }) => {
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Open settings' })
    ).toBeVisible();
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Account Button Contents and Links', async ({ page, baseURL }) => {
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Open settings' })
    ).toBeVisible();
    await expect(page).toHaveURL(/.*Library/);

    await page.getByLabel('Open settings').click();
    await page.getByText('Account').click();
    await expect(page).toHaveURL('./account');

    await page.getByLabel('Open settings').click();
    await page.getByText('Logout').click();
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
      await expect(
        page.getByRole('button').filter({ hasText: 'Sign In' })
      ).toBeVisible();
    }, Promise.resolve());
  });
});
