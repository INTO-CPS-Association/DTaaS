import lazyClient, { type BrokerClient, type Connect } from 'viz/brokerClient';

jest.mock('mqtt', () => ({
  __esModule: true,
  default: { connect: jest.fn() },
}));

function fakeClient() {
  return {
    on: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    end: jest.fn(),
  };
}

const flush = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('the broker client loaded on first use', () => {
  it('replays in order the calls made before the library arrived', async () => {
    const real = fakeClient();
    const connect: Connect = jest.fn((): BrokerClient => real);
    const client = lazyClient(
      'wss://b/ws',
      { username: 'r' },
      async () => connect,
    );

    client.subscribe('a');
    client.on('connect', jest.fn());
    await flush();

    expect(connect).toHaveBeenCalledWith('wss://b/ws', { username: 'r' });
    expect(real.subscribe).toHaveBeenCalledWith('a');
    expect(real.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(real.subscribe.mock.invocationCallOrder[0]).toBeLessThan(
      real.on.mock.invocationCallOrder[0],
    );
  });

  it('forwards calls straight away once loaded', async () => {
    const real = fakeClient();
    const client = lazyClient('u', {}, async () => (): BrokerClient => real);
    await flush();

    client.unsubscribe('a');
    client.end();

    expect(real.unsubscribe).toHaveBeenCalledWith('a');
    expect(real.end).toHaveBeenCalled();
  });

  it('stays quiet when the library cannot be loaded', async () => {
    const client = lazyClient('u', {}, async () => {
      throw new Error('offline');
    });

    client.subscribe('a');
    await flush();

    expect(client).toBeDefined();
  });
});
