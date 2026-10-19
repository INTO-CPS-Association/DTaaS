import mqtt from 'mqtt';
import createCore, { transportsFrom } from 'viz/createCore';

jest.mock('mqtt', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(() => ({ on: jest.fn(), subscribe: jest.fn() })),
  },
}));

const tick = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('the core of a deployment', () => {
  it('has no live transport when env.js names no broker', () => {
    expect(transportsFrom({})).toEqual([]);
    expect(transportsFrom({ REACT_APP_VIZ_MQTT_URL: '  ' })).toEqual([]);
  });

  it('connects to the broker env.js names on the first subscription', async () => {
    const transports = transportsFrom({
      REACT_APP_VIZ_MQTT_URL: 'wss://dtaas.example/ws',
      REACT_APP_VIZ_MQTT_USERNAME: 'reader',
    });

    expect(transports).toHaveLength(1);
    transports[0].subscribe(['room/temp'], jest.fn());
    // The library is loaded on first use, so the connection follows a tick.
    await tick();
    expect(mqtt.connect).toHaveBeenCalledWith(
      'wss://dtaas.example/ws',
      expect.objectContaining({ username: 'reader', password: undefined }),
    );
  });

  it('opens no connection until a page subscribes to a signal', async () => {
    jest.mocked(mqtt.connect).mockClear();
    const contents = {
      exists: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      list: jest.fn(),
    };
    const core = createCore(
      { REACT_APP_VIZ_MQTT_URL: 'wss://dtaas.example/ws' },
      contents,
      [],
      () => {
        throw new Error('no host');
      },
    );

    await tick();
    expect(mqtt.connect).not.toHaveBeenCalled();
    core.signals.subscribe(['room/temp'], 'measured', jest.fn());
    await tick();
    expect(mqtt.connect).toHaveBeenCalledTimes(1);
  });

  it('builds signals and visualisations together', () => {
    const contents = {
      exists: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      list: jest.fn(),
    };

    const core = createCore({}, contents, [], () => {
      throw new Error('no host');
    });

    expect(core.signals.connection.get(['a'])).toBe('down');
    expect(core.viz.substrates.list()).toEqual(['image', 'embed']);
  });
});
