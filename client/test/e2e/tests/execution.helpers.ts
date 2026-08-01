import { expect, type Locator } from '@playwright/test';

export const EXECUTION_START_TIMEOUT = 120_000;

function parseExecutionCount(context: string | null): number {
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

export async function getCurrentExecutionCount(
  button: Locator,
): Promise<number> {
  return parseExecutionCount(await button.getAttribute('data-logger-context'));
}

export async function waitForExecutionCount(
  button: Locator,
  expectedCount: number,
) {
  await expect
    .poll(async () => getCurrentExecutionCount(button), {
      timeout: EXECUTION_START_TIMEOUT,
    })
    .toBeGreaterThanOrEqual(expectedCount);
}
