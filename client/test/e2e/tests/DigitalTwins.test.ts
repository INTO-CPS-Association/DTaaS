import { expect, type Page } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import {
  openAuthenticatedApp,
  saveRunnerSettings,
} from 'test/e2e/setup/appSettings';
import DEBOUNCE_TIME from 'test/e2e/tests/constants';
import {
  getCurrentExecutionCount,
  waitForExecutionCount,
} from 'test/e2e/tests/execution.helpers';

const TERMINAL_STATUS = /Status: (Completed|Failed|Canceled|Timed out)/;

async function stopRunningExecution(page: Page) {
  const dialog = page.getByRole('dialog', {
    name: 'Hello world Execution History',
  });
  if (!(await dialog.isVisible({ timeout: 1000 }).catch(() => false))) return;
  const stopButton = dialog.getByRole('button', { name: 'stop' }).first();
  if (!(await stopButton.isVisible({ timeout: 1000 }).catch(() => false)))
    return;
  await stopButton.click();
  await expect(stopButton)
    .not.toBeVisible({ timeout: 10000 })
    .catch(() => undefined);
}

// Increase the test timeout to 5 minutes
test.setTimeout(300000);

test.describe('Digital Twin Log Cleaning', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page and authenticate
    await openAuthenticatedApp(page);
    await saveRunnerSettings(page);

    // Navigate directly to the Digital Twins page
    await page.goto('./preview/digitaltwins');

    // Navigate to the Execute tab
    await page.getByRole('tab', { name: 'Execute' }).click();

    // Wait for the page to load
    await page.waitForLoadState('load');
  });

  test.afterEach(async ({ page }) => {
    await stopRunningExecution(page);
  });

  // @slow - This test requires waiting for actual GitLab pipeline execution
  test('Execute Digital Twin and verify log cleaning', async ({ page }) => {
    // Find the Hello world Digital Twin card
    const helloWorldCard = page
      .locator('.MuiPaper-root')
      .filter({ has: page.getByText('Hello world', { exact: true }) })
      .first();

    await expect(helloWorldCard).toBeVisible({ timeout: 30000 });

    // Get the Start button
    const startButton = helloWorldCard
      .getByRole('button', { name: 'Start' })
      .first();
    await expect(startButton).toBeVisible({ timeout: 10000 });

    const historyButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    const previousCount = await getCurrentExecutionCount(historyButton);
    // Enforce debounce between requests to avoid overwhelming GitLab
    await page.waitForTimeout(DEBOUNCE_TIME); // NOSONAR
    await startButton.click();
    await waitForExecutionCount(historyButton, previousCount + 1);

    await historyButton.click();

    // Verify that the execution history dialog is displayed
    const historyDialog = page.getByRole('dialog', {
      name: 'Hello world Execution History',
    });
    await expect(historyDialog).toBeVisible({ timeout: 10000 });

    // Wait for execution history to load
    await expect(
      historyDialog.getByRole('heading', {
        name: 'Execution History',
        exact: true,
      }),
    ).toBeVisible({ timeout: 10000 });

    // Wait for execution to complete using dynamic waiting instead of fixed timeout
    await expect(async () => {
      const completedExecutions = historyDialog
        .locator('.MuiAccordionSummary-root')
        .filter({ hasText: TERMINAL_STATUS });
      const completedCount = await completedExecutions.count();
      expect(completedCount).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 180000 }); // Increased timeout for GitLab pipeline

    const completedExecution = historyDialog
      .locator('.MuiAccordionSummary-root')
      .filter({ hasText: TERMINAL_STATUS })
      .first();

    // Expand the accordion to view the logs for the completed execution
    await completedExecution.click();

    // Wait for logs content to be loaded and properly cleaned in the expanded accordion
    const logsPanel = historyDialog
      .locator('[role="region"][aria-labelledby*="execution-"]')
      .filter({ hasText: /Running with gitlab-runner|No logs available/ });
    await expect(logsPanel).toBeVisible({ timeout: 10000 });

    // Get the log content
    const logContent = await logsPanel.textContent();

    // Verify log cleaning
    expect(logContent).not.toBeNull();
    if (logContent) {
      // Verify ANSI escape codes are removed
      // eslint-disable-next-line no-control-regex
      expect(logContent).not.toMatch(/\u001b\[[0-9;]*[mK]/);
      expect(logContent).not.toMatch(
        // eslint-disable-next-line no-control-regex
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/,
      );

      // Verify GitLab section markers are removed
      expect(logContent).not.toMatch(/section_start:[0-9]+:[a-zA-Z0-9_-]+/);
      expect(logContent).not.toMatch(/section_end:[0-9]+:[a-zA-Z0-9_-]+/);
    }

    // Clean up by deleting the execution
    await completedExecution.locator('[aria-label="delete"]').click();

    // Wait for confirmation dialog and confirm deletion
    const confirmDialog = page.locator('div[role="dialog"]').nth(1); // Second dialog (confirmation)
    await expect(confirmDialog).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'DELETE' }).click();
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Verify the dialog is closed
    await expect(historyDialog).not.toBeVisible({ timeout: 10000 });
  });
});
