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
  return parseExecutionCount(
    await button.evaluate((element) => element.dataset.loggerContext),
  );
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

function parseExecutionId(context: string | null): string | null {
  if (!context) return null;
  try {
    const parsed = JSON.parse(context) as { dt?: { executionId?: string } };
    return parsed.dt?.executionId ?? null;
  } catch {
    return null;
  }
}

export async function getExecutionIds(container: Locator): Promise<string[]> {
  const summaries = container.locator('.MuiAccordionSummary-root');
  const contexts = await summaries.evaluateAll((elements) =>
    elements.map((element) => element.dataset.loggerContext),
  );
  return contexts
    .map(parseExecutionId)
    .filter((id): id is string => id != null);
}

export async function waitForNewExecutionIds(
  container: Locator,
  knownIds: string[],
  expectedCount: number,
): Promise<string[]> {
  const known = new Set(knownIds);
  let newIds: string[] = [];
  await expect
    .poll(
      async () => {
        newIds = (await getExecutionIds(container)).filter(
          (id) => !known.has(id),
        );
        return newIds.length;
      },
      { timeout: EXECUTION_START_TIMEOUT },
    )
    .toBe(expectedCount);
  return newIds;
}
