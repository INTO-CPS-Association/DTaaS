import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  answer,
  FAILURE,
  networkError,
  notification,
  setup,
  webhook,
} from './webhook.fixture';

describe('Webhook client', () => {
  let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // Lets the waits up to the time pass, and counts the posts
  const posts = async (milliseconds: number) => {
    await jest.advanceTimersByTimeAsync(milliseconds);
    return fetchMock.mock.calls.length;
  };

  it('Should post nothing without a webhook', async () => {
    const { client } = setup(null);

    await client.post(notification);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Should post the notification with the bearer token', async () => {
    const { client, error } = setup();
    fetchMock.mockResolvedValue(answer(204));

    await client.post(notification);

    expect(fetchMock).toHaveBeenCalledWith(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret',
      },
      body: JSON.stringify(notification),
      signal: expect.any(AbortSignal),
    });
    expect(error).not.toHaveBeenCalled();
  });

  it('Should post without a token', async () => {
    const { client } = setup({ url: 'http://localhost:8080' });
    fetchMock.mockResolvedValue(answer(200));

    await client.post(notification);

    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('Should retry after 1, 2 and 4 s, and then give up', async () => {
    const { client, error } = setup();
    fetchMock.mockRejectedValue(networkError());
    const delivery = client.post(notification);

    expect(await posts(0)).toBe(1);
    expect(await posts(999)).toBe(1);
    expect(await posts(1)).toBe(2);
    expect(await posts(2000)).toBe(3);
    expect(await posts(3999)).toBe(3);
    expect(await posts(1)).toBe(4);
    expect(await posts(60000)).toBe(4);
    await expect(delivery).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(FAILURE);
  });

  it('Should retry a 5xx response and a timeout', async () => {
    const { client } = setup();
    fetchMock
      .mockResolvedValueOnce(answer(503))
      .mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
      .mockResolvedValueOnce(answer(204));
    void client.post(notification);

    expect(await posts(3000)).toBe(3);
    expect(await posts(60000)).toBe(3);
  });

  it('Should not retry a 4xx response', async () => {
    const { client, error } = setup();
    fetchMock.mockResolvedValue(answer(401));

    await client.post(notification);

    expect(await posts(60000)).toBe(1);
    expect(error).toHaveBeenCalledWith(
      'Webhook notification to manager.example.org failed: HTTP status 401',
    );
  });

  it('Should log a failure again once a delivery succeeded', async () => {
    const { client, error } = setup();
    fetchMock
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(answer(204))
      .mockRejectedValueOnce(networkError());
    void client.post(notification);
    void client.post(notification);
    await posts(0);
    expect(error).toHaveBeenCalledTimes(1);

    await posts(1000);
    void client.post(notification);
    await posts(0);
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('Should drop the retries at shutdown', async () => {
    const { client, error } = setup();
    fetchMock.mockRejectedValue(networkError());
    const delivery = client.post(notification);
    await posts(0);

    client.beforeApplicationShutdown();

    await expect(delivery).resolves.toBeUndefined();
    expect(await posts(60000)).toBe(1);
    await client.post(notification);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('Should abort a post in progress at shutdown', async () => {
    const { client, error } = setup();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const delivery = client.post(notification);
    await posts(0);

    client.beforeApplicationShutdown();

    await expect(delivery).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });
});
