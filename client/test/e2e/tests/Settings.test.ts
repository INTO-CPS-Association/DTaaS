import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

const DEFAULT_SETTINGS = {
  GROUP_NAME: 'DTaaS',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'linux',
  BRANCH_NAME: 'master',
};

test.describe('Account Settings Form', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the Settings page
    await page.goto('./');
    await page.getByRole('button', { name: 'SignIn' }).click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible();
    await page.getByLabel('Open settings').click();
    await page.getByRole('menuitem', { name: 'Account' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
  });

  test('Should save new settings', async ({ page }) => {
    // Change settings
    await page.getByLabel('Group Name').fill('DTaaS-test');
    await page.getByLabel('DT Directory').fill('digital_twins-test');
    await page.getByLabel('Common Library Project name').fill('Common-test');
    await page.getByLabel('Runner Tag').fill('Runner-test');
    await page.getByLabel('Branch Name').fill('Branch-test');

    // Save settings
    await page.getByRole('button', { name: 'Save Settings' }).click();

    // Reload settings page
    await page.reload();
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Check that settings were saved
    await expect(page.getByLabel('Group Name')).toHaveValue('DTaaS-test');
    await expect(page.getByLabel('DT Directory')).toHaveValue(
      'digital_twins-test',
    );
    await expect(page.getByLabel('Common Library Project name')).toHaveValue(
      'Common-test',
    );
    await expect(page.getByLabel('Runner Tag')).toHaveValue('Runner-test');
    await expect(page.getByLabel('Branch Name')).toHaveValue('Branch-test');
  });

  test('Should reset to default settings', async ({ page }) => {
    // Try resetting to defaults
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();

    // Check that settings returned to default values
    await expect(page.getByLabel('Group Name')).toHaveValue(
      DEFAULT_SETTINGS.GROUP_NAME,
    );
    await expect(page.getByLabel('DT Directory')).toHaveValue(
      DEFAULT_SETTINGS.DT_DIRECTORY,
    );
    await expect(page.getByLabel('Common Library Project name')).toHaveValue(
      DEFAULT_SETTINGS.COMMON_LIBRARY_PROJECT_NAME,
    );
    await expect(page.getByLabel('Runner Tag')).toHaveValue(
      DEFAULT_SETTINGS.RUNNER_TAG,
    );
    await expect(page.getByLabel('Branch Name')).toHaveValue(
      DEFAULT_SETTINGS.BRANCH_NAME,
    );
  });
});
