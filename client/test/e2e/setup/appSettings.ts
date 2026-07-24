import { expect, type Page } from '@playwright/test';
import { restoreSessionStorage } from 'test/e2e/setup/authStorage';

export const PRIMARY_RUNNER = process.env.PRIMARY_RUNNER ?? 'linux';
export const SECONDARY_RUNNER = process.env.SECONDARY_RUNNER ?? 'windows';

export async function disableRemoteLogging(page: Page) {
  await page.evaluate(() => {
    const readSettings = (): Record<string, unknown> => {
      const persistedSettings = localStorage.getItem('settings');
      if (persistedSettings === null) return {};
      try {
        return JSON.parse(persistedSettings) as Record<string, unknown>;
      } catch {
        return {};
      }
    };

    localStorage.setItem(
      'settings',
      JSON.stringify({
        ...readSettings(),
        remoteLoggingEnabled: false,
      }),
    );
  });
}

export async function openAuthenticatedApp(page: Page) {
  await restoreSessionStorage(page);
  await page.goto('./Library');
  await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible(
    { timeout: 30000 },
  );
}

export async function saveRunnerSettings(
  page: Page,
  primaryRunner = PRIMARY_RUNNER,
  secondaryRunner = SECONDARY_RUNNER,
) {
  await page.getByLabel('Open settings').click();
  await page.getByRole('menuitem', { name: 'Account' }).click();
  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(
    page.getByRole('button', { name: 'Save Settings' }),
  ).toBeVisible();
  await page.fill('#runnerTag', primaryRunner);
  await page.fill('#measurementSecondaryRunnerTag', secondaryRunner);
  await page.getByRole('button', { name: 'Save Settings' }).click();
}
