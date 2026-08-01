import retryRequest from 'model/backend/util/requestRetry';

describe('retryRequest', () => {
  it('retries a failed request before returning its result', async () => {
    const request = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue('loaded');

    await expect(
      retryRequest(request, { idempotent: true, attempts: 2, retryDelayMs: 0 }),
    ).resolves.toBe('loaded');

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('returns the final failure when every attempt fails', async () => {
    const error = new Error('Unavailable');
    const request = jest.fn<Promise<void>, []>().mockRejectedValue(error);

    await expect(
      retryRequest(request, { idempotent: true, attempts: 2, retryDelayMs: 0 }),
    ).rejects.toThrow(error);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('rejects retries that are not explicitly idempotent', () => {
    const request = jest.fn<Promise<void>, []>();
    const options = { idempotent: false } as unknown as {
      idempotent: true;
    };

    expect(() => retryRequest(request, options)).toThrow(
      'Only idempotent requests can be retried.',
    );
    expect(request).not.toHaveBeenCalled();
  });
});
