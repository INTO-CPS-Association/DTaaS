// src: https://playwright.dev/docs/writing-tests

import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import {
  openAuthenticatedApp,
  requireFullPlatform,
} from 'test/e2e/setup/appSettings';

/**
 * The Automation page, end to end.
 *
 * Its two cards are the only way into the Library Page and the Digital Twins
 * Page since they left the workbench. Each has to open its page in this tab,
 * because a new tab starts with an empty sessionStorage, where the session is
 * kept, and would send the person to sign in again.
 */
test.describe('Automation', () => {
  test.beforeEach(async ({ page }) => {
    await openAuthenticatedApp(page);
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Opens the Library Page and the Digital Twins Page in this tab', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Automation' }).click();
    await expect(page).toHaveURL('./automation');

    await page.getByRole('link', { name: /Library Page/ }).click();
    await expect(page).toHaveURL('./preview/library');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Library Page' }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL('./automation');

    await page.getByRole('link', { name: /Digital Twins Page/ }).click();
    await expect(page).toHaveURL('./preview/digitaltwins');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Digital Twins Page' }),
    ).toBeVisible();
  });

  test('The workbench no longer lists the two pages', async ({ page }) => {
    // The tool list is served by the workspace.
    requireFullPlatform();
    await page.getByRole('link', { name: 'Workbench' }).click();
    await expect(page).toHaveURL('./workbench');
    // Wait for the workspace tools, so the absence below is checked on a
    // loaded list and not on a page that has not drawn it yet.
    await expect(page.getByRole('link', { name: 'JupyterLab' })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole('link', { name: /Preview/ })).toHaveCount(0);
  });
});

test.describe('Library Page Selection', () => {
  test.beforeEach(async ({ page }) => {
    await openAuthenticatedApp(page, './preview/library');
    // The Digital Twins tab, because the test account's own digital twins,
    // Hello World and Mass Spring Damper, are what the other suites run, so
    // they are there to choose. The first tab can be empty.
    await page.getByRole('tab', { name: 'Digital Twins' }).click();
  });

  test('Starts empty and offers its actions once something is chosen', async ({
    page,
  }) => {
    const empty = page.getByText(/Nothing chosen yet/);
    const create = page
      .getByRole('button', { name: 'Create a Digital Twin' })
      .first();
    const clear = page.getByRole('button', { name: 'Clear', exact: true });

    // Neither action is offered on an empty selection: Create used to carry
    // an empty selection to the next page, which had nothing to build from.
    await expect(empty).toBeVisible({ timeout: 30000 });
    await expect(create).toBeDisabled();
    await expect(clear.first()).toBeDisabled();

    await page
      .getByRole('button', { name: 'Add', exact: true })
      .first()
      .click({ timeout: 30000 });
    await expect(empty).toHaveCount(0);
    await expect(create).toBeEnabled();

    await clear.first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Yes' }).click();
    await expect(empty).toBeVisible();
    await expect(create).toBeDisabled();
  });

  test('Carries the selection to the Digital Twins Page', async ({ page }) => {
    await page
      .getByRole('button', { name: 'Add', exact: true })
      .first()
      .click({ timeout: 30000 });
    await page
      .getByRole('button', { name: 'Create a Digital Twin' })
      .first()
      .click();
    await expect(page).toHaveURL('./preview/digitaltwins');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Digital Twins Page' }),
    ).toBeVisible();
  });
});
