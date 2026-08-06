import { expect, Locator } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import {
  openAuthenticatedApp,
  saveRunnerSettings,
} from 'test/e2e/setup/appSettings';
import DEBOUNCE_TIME from 'test/e2e/tests/constants';
import {
  EXECUTION_START_TIMEOUT,
  getCurrentExecutionCount,
  waitForExecutionCount,
  getExecutionIds,
  waitForNewExecutionIds,
} from 'test/e2e/tests/execution.helpers';

// Increase the test timeout to 10 minutes
test.setTimeout(600000);

async function expectExecutionLogs(
  historyDialog: Locator,
  executionIds: string[],
  index = 0,
): Promise<void> {
  const executionId = executionIds[index];
  if (!executionId) return;
  const execution = historyDialog.locator(
    `[id="execution-${executionId}-header"]`,
  );
  await expect(execution).toHaveText(/Status: (Completed|Failed|Canceled)/, {
    timeout: 300000,
  });
  await execution.click();
  const logs = historyDialog.locator(
    `[aria-labelledby="execution-${executionId}-header"]`,
  );
  await expect(logs).toContainText(
    /Running with gitlab-runner|No logs available/,
    { timeout: 10000 },
  );
  await expectExecutionLogs(historyDialog, executionIds, index + 1);
}

test.describe('Concurrent Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page and authenticate
    await openAuthenticatedApp(page);
    await saveRunnerSettings(page);

    // Navigate directly to the Digital Twins page
    await page.goto('./preview/digitaltwins');

    // Navigate to the Execute tab
    await page.getByRole('tab', { name: 'Execute' }).click();

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  // @slow - This test requires waiting for actual GitLab pipeline execution
  test('should start multiple executions concurrently and view logs', async ({
    page,
  }) => {
    // Find the Hello world Digital Twin card
    const helloWorldCard = page
      .locator('.MuiPaper-root')
      .filter({ has: page.getByText('Hello world', { exact: true }) })
      .first();
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

    // Get the Start button
    const startButton = helloWorldCard
      .getByRole('button', { name: 'Start' })
      .first();
    const historyButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    await expect(startButton).toBeVisible();
    const previousCount = await getCurrentExecutionCount(historyButton);

    await historyButton.click();
    const historyDialog = page.getByRole('dialog', {
      name: 'Hello world Execution History',
    });
    await expect(historyDialog).toBeVisible();
    const knownExecutionIds = await getExecutionIds(historyDialog);
    await historyDialog.getByRole('button', { name: 'Close' }).click();

    // Wait for the persisted history entry before triggering another start.
    await page.waitForTimeout(DEBOUNCE_TIME); // NOSONAR
    await startButton.click();
    await waitForExecutionCount(historyButton, previousCount + 1);
    await expect(startButton).toBeEnabled({
      timeout: EXECUTION_START_TIMEOUT,
    });
    await startButton.click();
    await waitForExecutionCount(historyButton, previousCount + 2);

    await historyButton.click();
    await expect(historyDialog).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Hello world Execution History/ }),
    ).toBeVisible();

    // Wait for execution history to load
    await expect(
      historyDialog.getByText('Execution History', { exact: true }),
    ).toBeVisible();

    const startedExecutionIds = await waitForNewExecutionIds(
      historyDialog,
      knownExecutionIds,
      2,
    );
    await expectExecutionLogs(historyDialog, startedExecutionIds);

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Verify the dialog is closed
    await expect(historyDialog).not.toBeVisible();
  });

  test('should persist execution history across page reloads', async ({
    page,
  }) => {
    // Find the Hello world Digital Twin card
    let helloWorldCard = page
      .locator('.MuiPaper-root')
      .filter({ has: page.getByText('Hello world', { exact: true }) })
      .first();
    await expect(helloWorldCard).toBeVisible({ timeout: 30000 });

    // Get the Start button
    const startButton = helloWorldCard
      .getByRole('button', { name: 'Start' })
      .first();

    // Enforce debounce between requests to avoid overwhelming GitLab
    await page.waitForTimeout(DEBOUNCE_TIME); // NOSONAR
    await startButton.click();

    // The Start click returns before the async pipeline/IndexedDB write finishes.
    const preReloadHistoryButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    await expect(preReloadHistoryButton).toBeEnabled({ timeout: 30000 });
    await preReloadHistoryButton.click();

    const preReloadHistoryDialog = page.locator('div[role="dialog"]');
    await expect(preReloadHistoryDialog).toBeVisible();
    await expect(
      preReloadHistoryDialog.locator('.MuiAccordionSummary-root').first(),
    ).toBeVisible({ timeout: 30000 });
    await preReloadHistoryDialog.getByRole('button', { name: 'Close' }).click();
    await expect(preReloadHistoryDialog).not.toBeVisible();

    // Reload the page after execution has started
    await page.reload();

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Navigate to the Execute tab again
    await page.getByRole('tab', { name: 'Execute' }).click();

    // Wait for the Digital Twin card to be visible
    helloWorldCard = page
      .locator('.MuiPaper-root')
      .filter({ has: page.getByText('Hello world', { exact: true }) })
      .first();
    await expect(helloWorldCard).toBeVisible({ timeout: 30000 });

    // Click the History button
    const postReloadHistoryButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    await expect(postReloadHistoryButton).toBeEnabled({ timeout: 5000 });
    await postReloadHistoryButton.click();

    // Verify that the execution history dialog is displayed
    const postReloadHistoryDialog = page.locator('div[role="dialog"]');
    await expect(postReloadHistoryDialog).toBeVisible();

    // Wait for execution history to load
    await expect(
      postReloadHistoryDialog.getByText('Execution History', { exact: true }),
    ).toBeVisible();

    // Verify that there is at least 1 execution in the history
    const postReloadExecutionItems = postReloadHistoryDialog.locator(
      '.MuiAccordionSummary-root',
    );
    await expect(postReloadExecutionItems.first()).toBeVisible({
      timeout: 10000,
    });
    const postReloadCount = await postReloadExecutionItems.count();
    expect(postReloadCount).toBeGreaterThanOrEqual(1);

    // Wait for the execution to complete using dynamic waiting
    await expect(async () => {
      const completedExecutions = postReloadHistoryDialog
        .locator('.MuiAccordionSummary-root')
        .filter({ hasText: /Status: (Completed|Failed|Canceled)/ });
      const completedCount = await completedExecutions.count();
      expect(completedCount).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 300000 }); // Increased timeout for GitLab pipeline

    const completedSelector = postReloadHistoryDialog
      .locator('.MuiAccordionSummary-root')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .first();

    // Clean up by deleting the execution
    const deleteButton = completedSelector.locator('[aria-label="delete"]');
    await deleteButton.click();

    // Wait for confirmation dialog and confirm deletion
    const confirmDialog = page.locator('div[role="dialog"]').nth(1); // Second dialog (confirmation)
    await expect(confirmDialog).toBeVisible();
    await page.getByRole('button', { name: 'DELETE' }).click();
    await expect(confirmDialog).not.toBeVisible();

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();
  });
});
