import { expect, type Page } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
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

/**
 * Finish a GitLab sign-in, authorizing the application only when GitLab asks.
 *
 * GitLab shows the Authorize page the first time a user signs in to an
 * application. After that it sends the browser straight back to the website,
 * so a run that always waits for the button fails for every user who has
 * signed in before. This waits for whichever page comes first.
 */
export async function authorizeIfAsked(page: Page) {
  const authorize = page.getByRole('button', { name: /Authorize/ });
  const signedIn = page.getByRole('button', { name: 'Open settings' });
  await expect(authorize.or(signedIn)).toBeVisible({ timeout: 30000 });
  if (await authorize.isVisible()) {
    await authorize.press('Enter');
  }
  await expect(signedIn).toBeVisible({ timeout: 30000 });
}

/**
 * Open the signed-in website directly at the page a test needs.
 *
 * Tests move on from there by clicking, as a person does, and not by loading
 * a second address. Loading one unloads the running application, and the
 * Firefox driver of Playwright can fail that unload when it has to stop the
 * application's own unload handler (react-router saves its state to
 * sessionStorage there). The failure reads "Assertion error" and is the
 * driver's, not the website's.
 */
export async function openAuthenticatedApp(page: Page, path = './Library') {
  await restoreSessionStorage(page);
  await page.goto(path);
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

/**
 * Skip the tests of the enclosing describe block unless the whole platform
 * runs.
 *
 * Library, Building Models and the Workbench read the signed-in user's
 * workspace, which a deployment serves on the same origin as the website.
 * When the tests start the website on its own at localhost:4000, those
 * addresses are answered by the website itself, so these tests would fail for
 * a reason that is not a defect. `FULL_PLATFORM=true` in `test/.env` says the
 * address in `REACT_APP_URL` is a deployment of the whole platform.
 */
export function requireFullPlatform() {
  test.skip(
    process.env.FULL_PLATFORM !== 'true',
    'Needs the whole platform. Start a deployment, point REACT_APP_URL at it ' +
      'and set FULL_PLATFORM=true in test/.env, as test/README.md describes.',
  );
}
