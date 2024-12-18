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

    await expect(page.getByText('REACT_APP_CLIENT_ID:', { exact: true })).toBeVisible();
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
