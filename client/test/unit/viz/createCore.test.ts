import mqtt from 'mqtt';
import createCore, { transportsFrom } from 'viz/createCore';

jest.mock('mqtt', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(() => ({ on: jest.fn(), subscribe: jest.fn() })),
  },
}));

describe('the core of a deployment', () => {
  it('has no live transport when env.js names no broker', () => {
    expect(transportsFrom({})).toEqual([]);
    expect(transportsFrom({ REACT_APP_VIZ_MQTT_URL: '  ' })).toEqual([]);
  });

  it('connects to the broker env.js names, with its login', async () => {
    const transports = transportsFrom({
      REACT_APP_VIZ_MQTT_URL: 'wss://dtaas.example/ws',
      REACT_APP_VIZ_MQTT_USERNAME: 'reader',
    });

    expect(transports).toHaveLength(1);
    // The library is loaded on first use, so the connection follows a tick.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(mqtt.connect).toHaveBeenCalledWith(
      'wss://dtaas.example/ws',
      expect.objectContaining({ username: 'reader', password: undefined }),
    );
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
