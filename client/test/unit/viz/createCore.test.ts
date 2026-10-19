import {
  clearAccessToken,
  setAccessToken,
} from '@into-cps-association/dt-automation';
import createCore, { historyFrom, transportsFrom } from 'viz/createCore';

const contents = {
  exists: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  list: jest.fn(),
};

const noHost = () => {
  throw new Error('no host');
};

const GATEWAY = { REACT_APP_VIZ_SIGNALS_URL: 'https://signals.example' };

describe('the core of a deployment', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ samples: [] }),
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    clearAccessToken();
    jest.useRealTimers();
  });

  it('has no live transport and no history when env.js names no gateway', () => {
    expect(transportsFrom({})).toEqual([]);
    expect(transportsFrom({ REACT_APP_VIZ_SIGNALS_URL: '  ' })).toEqual([]);
    expect(historyFrom({})).toBeUndefined();
  });

  it('reads the gateway env.js names, with the session token', async () => {
    jest.useFakeTimers();
    setAccessToken('session-token');
    const transports = transportsFrom(GATEWAY);

    expect(transports).toHaveLength(1);
    transports[0].subscribe(['room/temp'], jest.fn());
    await jest.advanceTimersByTimeAsync(100);
    transports[0].close();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://signals.example/stream',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer session-token',
        }),
      }),
    );
  });

  it('opens no connection until a page subscribes to a signal', async () => {
    jest.useFakeTimers();
    const core = createCore(GATEWAY, contents, [], noHost);

    await jest.advanceTimersByTimeAsync(1000);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    core.signals.subscribe(['room/temp'], 'measured', jest.fn());
    await jest.advanceTimersByTimeAsync(100);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('reads ranges through the gateway history', async () => {
    const core = createCore(GATEWAY, contents, [], noHost);

    await core.signals.range(['a'], 'measured', 0, 10);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://signals.example/range',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('builds signals and visualisations together', () => {
    const core = createCore({}, contents, [], noHost);

    expect(core.signals.connection.get(['a'])).toBe('down');
    expect(core.viz.substrates.list()).toEqual(['image', 'embed']);
  });
});
