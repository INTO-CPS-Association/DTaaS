import { GitbeakerRequestError } from '@gitbeaker/rest';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;
const MAX_DELAY_MS = 4_000;

function getResponse(error: unknown): Response | undefined {
  if (!(error instanceof GitbeakerRequestError)) return undefined;
  return error.cause?.response;
}

export function getGitlabStatus(error: unknown): number | undefined {
  return getResponse(error)?.status;
}

function parseRetryAfter(value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const retryDate = Date.parse(value);
  return Number.isNaN(retryDate)
    ? undefined
    : Math.max(0, retryDate - Date.now());
}

export function getRetryAfterMs(error: unknown): number | undefined {
  return parseRetryAfter(
    getResponse(error)?.headers.get('retry-after') ?? undefined,
  );
}

export function isRetryableGitlabReadError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const status = getGitlabStatus(error);
  return status === 408 || status === 429 || (status != null && status >= 500);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDelayMs(error: unknown, attempt: number): number {
  const retryAfter = getRetryAfterMs(error);
  if (retryAfter != null) return retryAfter;
  const exponential = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  const randomValue = new Uint32Array(1);
  globalThis.crypto.getRandomValues(randomValue);
  return exponential + Math.floor((randomValue[0] / 2 ** 32) * BASE_DELAY_MS);
}

function canRetry(error: unknown, attempt: number, attempts: number): boolean {
  return isRetryableGitlabReadError(error) && attempt < attempts - 1;
}

async function retryFailedRead<T>(
  request: () => Promise<T>,
  attempts: number,
  attempt: number,
  error: unknown,
): Promise<T> {
  if (!canRetry(error, attempt, attempts)) throw error;
  await wait(getDelayMs(error, attempt));
  return retryReadAttempt(request, attempts, attempt + 1);
}

async function retryReadAttempt<T>(
  request: () => Promise<T>,
  attempts: number,
  attempt: number,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    return retryFailedRead(request, attempts, attempt, error);
  }
}

export function retryGitlabRead<T>(
  request: () => Promise<T>,
  attempts: number = MAX_ATTEMPTS,
): Promise<T> {
  return retryReadAttempt(request, attempts, 0);
}
