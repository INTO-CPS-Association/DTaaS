import { expect, type Locator } from '@playwright/test';

export const EXECUTION_START_TIMEOUT = 120_000;

function getExecutionCount(context: string | null): number {
  if (!context) return 0;

  try {
    const parsed = JSON.parse(context) as {
      dt?: { executionCount?: number };
    };
    return parsed.dt?.executionCount ?? 0;
  } catch {
    return 0;
  }
}

export async function waitForExecutionCount(
  button: Locator,
  expectedCount: number,
) {
  await expect
    .poll(
      async () =>
        getExecutionCount(await button.getAttribute('data-logger-context')),
      { timeout: EXECUTION_START_TIMEOUT },
    )
    .toBeGreaterThanOrEqual(expectedCount);
}
