import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import { openAuthenticatedApp } from 'test/e2e/setup/appSettings';

/**
 * An address the website does not have gets the website's own page, which
 * names the address, and not the router's developer error screen.
 */
const MISSING = './no-such-page';

test.describe('Page for an Address That Does Not Exist', () => {
  test('Names the address and offers the way back to a visitor', async ({
    page,
  }) => {
    await page.goto(MISSING);

    await expect(
      page.getByRole('heading', { level: 1, name: 'This Page Does Not Exist' }),
    ).toBeVisible();
    await expect(page.getByText('/no-such-page')).toBeVisible();
    await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);

    await page.getByRole('link', { name: 'Back to the Start' }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('Keeps the menu for a person who is signed in', async ({ page }) => {
    await openAuthenticatedApp(page, MISSING);

    await expect(
      page.getByRole('heading', { level: 1, name: 'This Page Does Not Exist' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Library' }).click();
    await expect(page).toHaveURL(/.*library/i);
  });
});
