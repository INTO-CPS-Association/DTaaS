import test from 'test/e2e/setup/fixtures';
import { expect } from '@playwright/test';

test('Verification is visible', async ({ page }) => {
  await page.goto('./verify');

  await page.waitForSelector('[data-testid="success-icon"]', {
    timeout: 4000,
    state: 'visible',
  });

  await expect(
    page.getByRole('heading', { name: 'Config verification' }),
  ).toBeVisible();

  await expect(page.getByText('CLIENT ID:', { exact: true })).toBeVisible();
  await expect(
    page.getByText('AUTH AUTHORITY:', { exact: true }),
  ).toBeVisible();

  await expect(
    page
      .getByLabel('ENVIRONMENT field is configured correctly.')
      .locator('path'),
  ).toBeVisible();

  await expect(page.getByTestId('error-icon')).toBeHidden();
});
