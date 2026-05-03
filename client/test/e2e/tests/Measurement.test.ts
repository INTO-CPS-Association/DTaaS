import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

// Runner tags are read from client/test/.env (PRIMARY_RUNNER, SECONDARY_RUNNER).
// They are written to app settings by tests that exercise multi-runner tasks.
const PRIMARY_RUNNER = process.env.PRIMARY_RUNNER ?? 'linux';
const SECONDARY_RUNNER = process.env.SECONDARY_RUNNER ?? 'windows';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'SignIn' }).click();
  await page.getByRole('button', { name: 'Authorize' }).click();
  await expect(
    page.getByRole('button', { name: 'Open settings' }),
  ).toBeVisible();
}

async function openSettingsTab(page: import('@playwright/test').Page) {
  await page.getByLabel('Open settings').click();
  await page.getByRole('menuitem', { name: 'Account' }).click();
  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(
    page.getByRole('button', { name: 'Save Settings' }),
  ).toBeVisible();
}

test.describe('Measurement Page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);

    // Navigate to measurement page
    await page.goto('./insight/measure');
  });

  test.afterEach(async ({ page }) => {
    const stopButton = page.getByRole('button', { name: 'Stop', exact: true });
    if (await stopButton.isEnabled()) {
      await stopButton.click();
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible()) {
        await dialog.getByRole('button', { name: 'Stop' }).click();
      }
    }
  });

  test('Should navigate to measurement page successfully', async ({ page }) => {
    // Verify page loaded correctly (not 404)
    await expect(page.locator('text=404 Not Found')).not.toBeVisible();

    // Verify correct URL
    await expect(page).toHaveURL(/insight\/measure/);

    // Verify page title renders (basic smoke test)
    await expect(
      page.getByRole('heading', { name: 'Digital Twin Measurement' }),
    ).toBeVisible();
  });

  test('Should manage button states correctly', async ({ page }) => {
    // Verify initial button states
    const startButton = page.getByRole('button', {
      name: 'Start',
      exact: true,
    });
    const restartButton = page.getByRole('button', {
      name: 'Restart',
      exact: true,
    });
    const purgeButton = page.getByRole('button', {
      name: 'Purge',
      exact: true,
    });

    await expect(startButton).toBeEnabled();
    await expect(restartButton).toBeDisabled();
    await expect(purgeButton).toBeEnabled();
  });

  test('Should run only the 4th task when others are disabled, then stop', async ({
    page,
  }) => {
    // Configure runner tags from .env and limit to 1 trial for a quick run
    await openSettingsTab(page);
    await page.fill('#runnerTag', PRIMARY_RUNNER);
    await page.fill('#measurementSecondaryRunnerTag', SECONDARY_RUNNER);
    await page.fill('#measurementTrials', '1');
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await page.goto('./insight/measure');

    // Disable all but the 4th task
    /* eslint-disable no-await-in-loop */
    for (const idx of [0, 1, 2, 4]) {
      await page
        .locator('tbody tr')
        .nth(idx * 2)
        .click();
      const checkbox = page
        .locator('tbody tr')
        .nth(idx * 2 + 1)
        .getByRole('checkbox');
      await expect(checkbox).toBeVisible();
      await checkbox.click();
    }
    /* eslint-enable no-await-in-loop */

    await page.getByRole('button', { name: 'Start', exact: true }).click();

    // Wait for the 4th task to complete
    const fourthTaskStatus = page
      .locator('tbody tr')
      .nth(6)
      .locator('td')
      .nth(1);
    await expect(fourthTaskStatus).toHaveText('SUCCESS', {
      timeout: 90000,
    });

    // Stop manually if still running when completed
    const stopButton = page.getByRole('button', { name: 'Stop', exact: true });
    if (await stopButton.isEnabled()) {
      await stopButton.click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Stop' })
        .click();
    }
    await expect(stopButton).toBeDisabled();
  });

  test('Should remain running after navigating to settings and back, then stop', async ({
    page,
  }) => {
    // Start the measurement
    await page.getByRole('button', { name: 'Start', exact: true }).click();

    // Verify measurement is running (Stop button replaces Start)
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toBeVisible();

    // Navigate to Settings
    await page.getByLabel('Open settings').click();
    await page.getByRole('menuitem', { name: 'Account' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
    await expect(
      page.getByRole('button', { name: 'Save Settings' }),
    ).toBeVisible();

    // Return to measurement page using browser back (avoids full reload that resets module state)
    await page.goBack();
    await expect(page).toHaveURL(/insight\/measure/);

    // Verify measurement is still running
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toBeVisible();

    // Stop the measurement
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Stop' })
      .click();

    // Verify measurement has stopped (Stop button is now disabled)
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toBeDisabled();
  });
});
