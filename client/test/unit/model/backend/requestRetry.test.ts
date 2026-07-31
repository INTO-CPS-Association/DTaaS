import retryRequest from 'model/backend/util/requestRetry';

describe('retryRequest', () => {
  it('retries a failed request before returning its result', async () => {
    const request = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue('loaded');

    await expect(retryRequest(request, 2, 0)).resolves.toBe('loaded');

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('returns the final failure when every attempt fails', async () => {
    const error = new Error('Unavailable');
    const request = jest.fn<Promise<void>, []>().mockRejectedValue(error);

    await expect(retryRequest(request, 2, 0)).rejects.toThrow(error);

    expect(request).toHaveBeenCalledTimes(2);
  });
});
