import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import {
  openAuthenticatedApp,
  requireFullPlatform,
} from 'test/e2e/setup/appSettings';

/**
 * The pages that show the workspace itself, each opened directly, the way a
 * bookmark or a reload opens it and not after passing through the Library.
 *
 * The address of the workspace carries the user name. A page that opened
 * before the name was known asked for //lab, and the frame showed the
 * website's own page for an address that does not exist.
 */
const username = (process.env.REACT_APP_TEST_USERNAME ?? '').toLowerCase();

test.describe('Workspace Pages Opened Directly', () => {
  requireFullPlatform();

  test.beforeEach(() => {
    // An empty name would turn the address checks below into //tree/ and
    // fail without saying why.
    expect(username, 'REACT_APP_TEST_USERNAME is set in test/.env').not.toBe(
      '',
    );
  });

  test('Library shows the workspace file browser', async ({ page }) => {
    await openAuthenticatedApp(page, './library');

    const frame = page.frameLocator('iframe').first();
    await expect(frame.getByRole('menuitem', { name: 'File' })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('iframe').first()).toHaveAttribute(
      'src',
      new RegExp(`/${username}/tree/`),
    );
  });

  test('Digital Twins shows JupyterLab from the workspace', async ({
    page,
  }) => {
    await openAuthenticatedApp(page, './digitaltwins');

    await expect(page.locator('iframe').first()).toHaveAttribute(
      'src',
      new RegExp(`/${username}/lab`),
      { timeout: 30000 },
    );
    const frame = page.frameLocator('iframe').first();
    await expect(frame.getByText('This Page Does Not Exist')).toHaveCount(0);
    await expect(frame.getByRole('menuitem', { name: 'File' })).toBeVisible({
      timeout: 60000,
    });
  });

  test('Workbench lists the workspace tools', async ({ page }) => {
    await openAuthenticatedApp(page, './workbench');

    await expect(page.getByRole('link', { name: 'JupyterLab' })).toBeVisible({
      timeout: 30000,
    });
  });
});
