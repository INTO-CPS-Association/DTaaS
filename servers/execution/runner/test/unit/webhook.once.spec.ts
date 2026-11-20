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

describe('Webhook client, single post', () => {
  let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('Should post once with a timeout of 2 s', async () => {
    const { client, error } = setup();
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(answer(204));

    await client.sendOnce(notification);

    expect(fetchMock).toHaveBeenCalledWith(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret',
      },
      body: JSON.stringify(notification),
      signal: expect.any(AbortSignal),
    });
    expect(timeout).toHaveBeenCalledWith(2000);
    expect(error).not.toHaveBeenCalled();
  });

  it('Should not retry a failure', async () => {
    const { client, error } = setup();
    fetchMock.mockRejectedValue(networkError());

    await client.sendOnce(notification);
    await jest.advanceTimersByTimeAsync(60000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(FAILURE);
  });

  it('Should post and log a failure after shutdown', async () => {
    const { client, error } = setup();
    fetchMock.mockRejectedValue(networkError());
    client.beforeApplicationShutdown();

    await client.sendOnce(notification);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(FAILURE);
  });

  it('Should post nothing without a webhook', async () => {
    const { client } = setup(null);

    await client.sendOnce(notification);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
