import { GitbeakerRequestError } from '@gitbeaker/rest';
import {
  getRetryAfterMs,
  isRetryableGitlabReadError,
  retryGitlabRead,
} from 'src/gitlab/gitlabReadRetry';

function createGitlabError(status: number, retryAfter?: string): Error {
  const error = Object.create(GitbeakerRequestError.prototype) as Error;
  Object.defineProperty(error, 'cause', {
    value: {
      response: {
        status,
        headers: { get: () => retryAfter ?? null },
      },
    },
  });
  return error;
}

describe('retryGitlabRead', () => {
  afterEach(() => jest.useRealTimers());

  it('retries a transient network failure before returning its result', async () => {
    jest.useFakeTimers();
    const request = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue('loaded');

    const result = retryGitlabRead(request, 2);
    await jest.runAllTimersAsync();

    await expect(result).resolves.toBe('loaded');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 422])('fails fast for HTTP %s', async (status) => {
    const request = jest
      .fn<Promise<void>, []>()
      .mockRejectedValue(createGitlabError(status));

    await expect(retryGitlabRead(request)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('honours Retry-After before retrying a rate-limited read', async () => {
    jest.useFakeTimers();
    const request = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(createGitlabError(429, '3'))
      .mockResolvedValue('loaded');

    const result = retryGitlabRead(request, 2);
    await jest.advanceTimersByTimeAsync(2_999);
    expect(request).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe('loaded');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('parses an HTTP-date Retry-After value', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const retryAfter = 'Thu, 01 Jan 2026 00:00:03 GMT';

    expect(getRetryAfterMs(createGitlabError(429, retryAfter))).toBe(3_000);
  });

  it('recognizes retryable GitLab responses and Retry-After', () => {
    const rateLimited = createGitlabError(429, '3');

    expect(isRetryableGitlabReadError(rateLimited)).toBe(true);
    expect(getRetryAfterMs(rateLimited)).toBe(3_000);
    expect(isRetryableGitlabReadError(createGitlabError(500))).toBe(true);
    expect(isRetryableGitlabReadError(createGitlabError(403))).toBe(false);
  });
});
