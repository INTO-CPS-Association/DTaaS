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
  it('loads nothing and connects nowhere before the first subscription', async () => {
    const load = jest.fn(async () => jest.fn());
    const client = lazyClient('u', {}, load);

    client.on('connect', jest.fn());
    client.unsubscribe('a');
    await flush();

    expect(load).not.toHaveBeenCalled();
  });

  it('replays in order the calls made before the library arrived', async () => {
    const real = fakeClient();
    const connect: Connect = jest.fn((): BrokerClient => real);
    const load = jest.fn(async () => connect);
    const client = lazyClient('wss://b/ws', { username: 'r' }, load);

    client.on('connect', jest.fn());
    client.subscribe('a');
    client.subscribe('b');
    await flush();

    expect(load).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith('wss://b/ws', { username: 'r' });
    expect(real.subscribe).toHaveBeenCalledWith('a');
    expect(real.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(real.on.mock.invocationCallOrder[0]).toBeLessThan(
      real.subscribe.mock.invocationCallOrder[0],
    );
  });

  it('forwards calls straight away once loaded', async () => {
    const real = fakeClient();
    const client = lazyClient('u', {}, async () => (): BrokerClient => real);
    client.subscribe('a');
    await flush();

    client.unsubscribe('a');
    client.end();

    expect(real.unsubscribe).toHaveBeenCalledWith('a');
    expect(real.end).toHaveBeenCalled();
  });

  it('reports the connection closed when the library cannot be loaded', async () => {
    const closed = jest.fn();
    const connected = jest.fn();
    const client = lazyClient('u', {}, async () => {
      throw new Error('offline');
    });
    client.on('close', closed);
    client.on('connect', connected);

    client.subscribe('a');
    await flush();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(connected).not.toHaveBeenCalled();
  });
});
