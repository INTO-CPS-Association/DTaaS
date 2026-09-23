import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import { openAuthenticatedApp } from 'test/e2e/setup/appSettings';

/**
 * The Insights page and the measurement card on the Automation page.
 *
 * Every card follows its route in this tab, because a new tab starts with an
 * empty sessionStorage, where the session is kept.
 */
test.describe('Insights and the Measurement Card', () => {
  test.beforeEach(async ({ page }) => {
    await openAuthenticatedApp(page);
    await page.getByRole('link', { name: 'Insights' }).click();
    await expect(page).toHaveURL('./insights');
  });

  test('Opens the logs from its card', async ({ page }) => {
    await page.getByRole('link', { name: /Logs/ }).click();

    await expect(page).toHaveURL('./insights/log');
    await expect(page.getByText('Workflow Logs').first()).toBeVisible();
  });

  test('Checks the configuration inside the application', async ({ page }) => {
    await page.getByRole('link', { name: /Config/ }).click();

    await expect(page).toHaveURL('./insights/config');
    // Either result is a result. What matters is that it arrives inside the
    // application, which the menu shows, and that a signed-in person is not
    // offered the way back to sign in.
    await expect(
      page
        .getByText('Configuration appears to be valid.')
        .or(page.getByText(/Invalid Application Configuration/)),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('link', { name: 'Insights' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Return to login' }),
    ).toHaveCount(0);
  });

  test('Reaches the measurement page from the Automation page', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Automation' }).click();
    await page.getByRole('link', { name: /Measurement/ }).click();

    await expect(page).toHaveURL('./insights/measure');
    await expect(page.locator('text=404 Not Found')).toHaveCount(0);
  });
});
