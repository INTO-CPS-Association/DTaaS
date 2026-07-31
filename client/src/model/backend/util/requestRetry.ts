const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

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
  attempts: number = RETRY_ATTEMPTS,
  retryDelayMs: number = RETRY_DELAY_MS,
): Promise<T> {
  return retryRequest(request, attempts, retryDelayMs);
}
