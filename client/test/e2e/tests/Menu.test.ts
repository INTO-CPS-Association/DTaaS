// src: https://playwright.dev/docs/writing-tests

import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import {
  openAuthenticatedApp,
  requireFullPlatform,
} from 'test/e2e/setup/appSettings';
import links, { workbenchLinks } from './Links';

test.describe('Menu Links From First Page (Layout)', () => {
  test.beforeEach(async ({ page }) => {
    await openAuthenticatedApp(page);
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Menu Links are visible', async ({ page }) => {
    await links.reduce(async (previousPromise, link) => {
      await previousPromise;
      const linkElement = page.getByRole('link', { name: link.text });
      await expect(linkElement).toBeVisible();
    }, Promise.resolve());
  });

  test('Menu Links are clickable', async ({ page }) => {
    await links.reduce(async (previousPromise, link) => {
      await previousPromise;
      await page.getByRole('link', { name: link.text }).click();
      await expect(page).toHaveURL(link.url);
      await expect(page.getByText('This Page Does Not Exist')).toHaveCount(0);
    }, Promise.resolve());
  });

  test('Workbench Links are visible', async ({ page }) => {
    // The tool list is served by the workspace.
    requireFullPlatform();
    await page.getByRole('link', { name: 'Workbench' }).click();
    await expect(page).toHaveURL('./workbench');
    await workbenchLinks.reduce(async (previousPromise, link) => {
      await previousPromise;
      const linkElement = await page.getByRole('link', { name: link.text });
      await expect(linkElement).toBeVisible();
    }, Promise.resolve());
  });

  test('Workbench Links open in new windows', async ({ page }) => {
    requireFullPlatform();
    await page.getByRole('link', { name: 'Workbench' }).click();
    await expect(page).toHaveURL('./workbench');
    await workbenchLinks.reduce(async (previousPromise, link) => {
      await previousPromise;
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: link.text }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState('load', { timeout: 30000 });
      // A server may answer a tool address with its canonical form, which adds
      // a slash before the query: tools/vnc?path= arrives as tools/vnc/?path=.
      // It is the same address, so neither side carries that slash here.
      const canonical = (url: string) => url.replace(/\/(?=\?|$)/, '');
      expect(canonical(popup.url())).toContain(
        canonical(link.url.replace('./', '')),
      );
      await popup.close();
      return Promise.resolve();
    }, Promise.resolve());
  });
});
