// src: https://playwright.dev/docs/writing-tests

import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import { openAuthenticatedApp } from 'test/e2e/setup/appSettings';

/**
 * The Building Models route, end to end.
 *
 * A single page application answers HTTP 200 for every path, so reaching the
 * URL proves nothing. Each test below asserts on something only this page
 * renders.
 *
 * The viewer itself is not asserted on. It draws to a canvas, and a WebGL
 * canvas has no accessible content to query. What is checked is everything
 * around it: that the route is reachable when signed in, that it names the
 * library directory it reads from, and that it states what it found there.
 * The drawing is covered by the package's own tests, which run without a
 * browser.
 */
test.describe('Building Models', () => {
  test.beforeEach(async ({ page }) => {
    await openAuthenticatedApp(page);
    await expect(page).toHaveURL(/.*Library/);
  });

  test('is reachable from the menu and renders its own heading', async ({
    page,
  }) => {
    await page
      .locator('div[role="button"]:has-text("Building Models")')
      .click();

    await expect(page).toHaveURL('./bim');
    await expect(
      page.getByRole('heading', { name: 'Building Models' }),
    ).toBeVisible();
  });

  test('names the library directory it reads models from', async ({ page }) => {
    // The address comes from the deployment's own configuration. A page that
    // did not say where it was looking would leave an empty list ambiguous
    // between "no models" and "wrong directory".
    await page.goto('./bim');

    await expect(page.getByText('common/models')).toBeVisible();
  });

  test('says what it found instead of leaving the list blank', async ({
    page,
  }) => {
    // Either outcome is correct and the page has to distinguish them: a
    // library with no IFC file says so, and a library with one lists it.
    await page.goto('./bim');

    const empty = page.getByText('No IFC file is in the shared library yet.');
    const list = page.getByRole('list');

    await expect(empty.or(list).first()).toBeVisible();
  });

  test('is behind authentication', async ({ page, context }) => {
    // The route reads the signed-in user's own library, so it must not be
    // reachable without a session.
    await context.clearCookies();
    await page.goto('./bim');

    await expect(page).not.toHaveURL(/.*bim/);
  });
});
