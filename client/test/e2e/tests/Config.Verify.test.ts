import test from 'test/e2e/setup/fixtures';
import { expect } from '@playwright/test';

test('Developer config is visible', async ({ page }) => {
  await page.goto('./config/developer');
  await expect(page.getByText('Verifying configuration')).toBeVisible();

  await page.waitForSelector('[data-testid="success-icon"]', {
    timeout: 12000,
    state: 'visible',
  });

  await expect(
    page.getByRole('heading', { name: 'Config verification' }),
  ).toBeVisible();

  await expect(
    page.getByText('REACT_APP_CLIENT_ID:', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('REACT_APP_AUTH_AUTHORITY:', { exact: true }),
  ).toBeVisible();

  await expect(
    page
      .getByLabel('REACT_APP_ENVIRONMENT field is configured correctly.')
      .locator('path'),
  ).toBeVisible();

  await expect(page.getByTestId('error-icon')).toBeHidden();
});

test('User config is visible', async ({ page }) => {
  await page.goto('./config/user');
  await expect(page.getByText('Verifying configuration')).toBeVisible();
  await expect(
    page.getByText('Configuration appears to be valid.'),
  ).toBeVisible({ timeout: 12000 });
});
