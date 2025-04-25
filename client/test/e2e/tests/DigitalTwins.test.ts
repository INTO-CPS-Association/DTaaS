import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

test.describe('Digital Twin Execution Log Cleaning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible();

    await page.goto('./preview/digitaltwins');
  });

  // @slow - This test requires waiting for actual GitLab pipeline execution
  test('Execute Digital Twin and verify log cleaning', async ({ page }) => {
    await page.locator('li[role="tab"]:has-text("Execute")').click();

    await page.waitForLoadState('networkidle');

    const helloWorldCard = page
      .locator('.MuiPaper-root:has-text("Hello world")')
      .first();
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

    const startButton = helloWorldCard.locator('button:has-text("Start")');
    await startButton.click();

    await expect(helloWorldCard.locator('button:has-text("Stop")')).toBeVisible(
      { timeout: 15000 },
    );

    await expect(
      helloWorldCard.locator('button:has-text("Start")'),
    ).toBeVisible({ timeout: 200000 });

    const logButton = helloWorldCard.locator(
      'button:has-text("LOG"), button:has-text("Log")',
    );
    await expect(logButton).toBeEnabled({ timeout: 5000 });
    await logButton.click();

    const logDialog = page.locator('div[role="dialog"]');
    await expect(logDialog).toBeVisible({ timeout: 10000 });

    const logContent = await logDialog
      .locator('div')
      .filter({ hasText: /Running with gitlab-runner/ })
      .first()
      .textContent();

    expect(logContent).not.toBeNull();
    if (logContent) {
      // eslint-disable-next-line no-control-regex
      expect(logContent).not.toMatch(/\u001b\[[0-9;]*[mK]/);
      expect(logContent).not.toMatch(
        // eslint-disable-next-line no-control-regex
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/,
      );

      expect(logContent).not.toMatch(/section_start:[0-9]+:[a-zA-Z0-9_-]+/);
      expect(logContent).not.toMatch(/section_end:[0-9]+:[a-zA-Z0-9_-]+/);
    }

    await logDialog.locator('button:has-text("Close")').click();

    await expect(logDialog).not.toBeVisible();
  });
});
