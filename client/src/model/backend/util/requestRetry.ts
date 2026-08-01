const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

/**
 * Retried operations must be safe to run more than once.
 * Do not use this for starting a pipeline.
 */
export interface RetryOptions {
  readonly idempotent: true;
  readonly attempts?: number;
  readonly retryDelayMs?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function retryRequest<T>(
  request: () => Promise<T>,
  attempts: number,
  retryDelayMs: number,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    await wait(retryDelayMs);
    return retryRequest(request, attempts - 1, retryDelayMs);
  }
}

export default function retryRequestWithDefaults<T>(
  request: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  if (!options.idempotent) {
    throw new Error('Only idempotent requests can be retried.');
  }

  return retryRequest(
    request,
    options.attempts ?? RETRY_ATTEMPTS,
    options.retryDelayMs ?? RETRY_DELAY_MS,
  );
}
