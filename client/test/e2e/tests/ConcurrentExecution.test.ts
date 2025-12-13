import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

// Increase the test timeout to 5 minutes
test.setTimeout(300000);

test.describe('Concurrent Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page and authenticate
    await page.goto('./');
    await page
      .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
      .click();
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible();

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
    await expect(startButton).toBeVisible();

    // Start the first execution
    await startButton.click();

    // Wait for debounce period (250ms) plus a bit for execution to start
    await page.waitForTimeout(500);

    // Start a second execution
    await startButton.click();

    // Wait for debounce period plus a bit for second execution to start
    await page.waitForTimeout(500);

    // Click the History button
    const historyButton = helloWorldCard
      .getByRole('button', { name: 'History' })
      .first();
    await expect(historyButton).toBeEnabled({ timeout: 5000 });
    await historyButton.click();

    // Verify that the execution history dialog is displayed
    const historyDialog = page.locator('div[role="dialog"]');
    await expect(historyDialog).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Hello world Execution History/ }),
    ).toBeVisible();

    // Wait for execution history to load
    await expect(
      historyDialog.getByText('Execution History', { exact: true }),
    ).toBeVisible();

    const executionAccordions = historyDialog.locator(
      '.MuiAccordionSummary-root',
    );
    await expect(async () => {
      const count = await executionAccordions.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    // Wait for at least one execution to complete
    // This may take some time as it depends on the GitLab pipeline
    // Use dynamic waiting instead of fixed timeout
    await expect(async () => {
      const completedExecutions = historyDialog
        .locator('.MuiAccordionSummary-root')
        .filter({ hasText: /Status: (Completed|Failed|Canceled)/ });
      const completedCount = await completedExecutions.count();
      expect(completedCount).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 60000 }); // Increased timeout for GitLab pipeline

    // For the first completed execution, expand the accordion to view the logs
    const firstCompletedExecution = historyDialog
      .locator('.MuiAccordionSummary-root')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .first();

    await firstCompletedExecution.click();

    // Wait for accordion to expand and logs to be visible
    const logsContent = historyDialog
      .locator('[role="region"][aria-labelledby*="execution-"]')
      .filter({ hasText: /Running with gitlab-runner|No logs available/ });
    await expect(logsContent).toBeVisible({ timeout: 10000 });

    // Wait a bit to ensure both executions have time to complete
    await page.waitForTimeout(1500);

    // Check another execution's logs if available
    const secondExecution = historyDialog
      .locator('.MuiAccordionSummary-root')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
      .nth(1);

    if ((await secondExecution.count()) > 0) {
      await secondExecution.click();

      // Verify logs for second execution (wait for them to be visible)
      const secondLogsContent = historyDialog
        .locator('[role="region"][aria-labelledby*="execution-"]')
        .filter({ hasText: /Running with gitlab-runner|No logs available/ });
      await expect(secondLogsContent).toBeVisible({ timeout: 10000 });
    }

    // Get all completed executions
    const completedExecutions = historyDialog
      .locator('.MuiAccordionSummary-root')
      .filter({ hasText: /Status: (Completed|Failed|Canceled)/ });

    const completedCount = await completedExecutions.count();

    // Delete each completed execution
    // Instead of a loop, use a recursive function to avoid linting issues
    const deleteCompletedExecutions = async (
      remainingCount: number,
    ): Promise<void> => {
      if (remainingCount <= 0) return;

      // Always delete the first one since the list gets rerendered after each deletion
      const execution = historyDialog
        .locator('.MuiAccordionSummary-root')
        .filter({ hasText: /Status: (Completed|Failed|Canceled)/ })
        .first();

      // Find the delete button within the accordion summary
      await execution.locator('[aria-label="delete"]').click();

      // Wait for confirmation dialog to appear
      const confirmDialog = page.locator('div[role="dialog"]').nth(1); // Second dialog (confirmation)
      await expect(confirmDialog).toBeVisible();

      // First click "Cancel" to test the cancel functionality
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirmDialog).not.toBeVisible();

      // Click delete button again
      await execution.locator('[aria-label="delete"]').click();
      await expect(confirmDialog).toBeVisible();

      // Now click "DELETE" to confirm
      await page.getByRole('button', { name: 'DELETE' }).click();
      await expect(confirmDialog).not.toBeVisible();

      await page.waitForTimeout(500); // Wait a bit for the UI to update

      // Recursive call with decremented count
      await deleteCompletedExecutions(remainingCount - 1);
    };

    // Start the recursive deletion
    await deleteCompletedExecutions(completedCount);

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
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

    // Get the Start button
    const startButton = helloWorldCard
      .getByRole('button', { name: 'Start' })
      .first();

    // Start an execution
    await startButton.click();

    // Wait for debounce period plus a bit for execution to start
    await page.waitForTimeout(2000);

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
    await expect(helloWorldCard).toBeVisible({ timeout: 10000 });

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
    }).toPass({ timeout: 60000 }); // Increased timeout for GitLab pipeline

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
