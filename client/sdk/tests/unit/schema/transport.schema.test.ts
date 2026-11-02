// These tests feed script URLs to the schema to check that it refuses them.
/* eslint-disable no-script-url */
import { transportSchema } from 'src/schema/transport.schema';

describe('transportSchema', () => {
  it.each([
    { adapter: 'mqtt', url: 'wss://broker/ws', topics: ['a/+/b'] },
    { adapter: 'stomp', url: 'wss://broker/stomp', destinations: ['/topic/a'] },
    { adapter: 'thingsboard', url: 'wss://tb/ws', entityIds: ['e1'] },
    { adapter: 'influx', org: 'dtaas', bucket: 'b1', role: 'history' },
    { adapter: 'http', url: 'https://logger/api', intervalMs: 1000 },
    { adapter: 'file', url: 'lib://data/run.csv', channel: 'simulated' },
  ])('accepts a $adapter transport', (transport) => {
    expect(transportSchema.safeParse(transport).success).toBe(true);
  });

  it('rejects an unknown adapter', () => {
    const transport = { adapter: 'kafka', url: 'x' };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });

  it('requires at least one MQTT topic', () => {
    const transport = { adapter: 'mqtt', url: 'wss://broker/ws', topics: [] };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });

  it('rejects an unknown channel', () => {
    const transport = { adapter: 'file', url: 'x', channel: 'guessed' };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });

  const transportFor = (adapter: string, url: string) => {
    const required: Record<string, object> = {
      mqtt: { topics: ['a'] },
      stomp: { destinations: ['/topic/a'] },
      thingsboard: { entityIds: ['e1'] },
      influx: { org: 'dtaas', bucket: 'b1' },
      http: {},
      file: {},
    };
    return { adapter, url, ...required[adapter] };
  };

  it.each([
    ['mqtt', ['ws://b/ws', 'wss://b/ws', 'mqtt://b:1883', 'mqtts://b:8883']],
    ['stomp', ['ws://b/stomp', 'wss://b/stomp', 'mqtt://b', 'mqtts://b']],
    ['thingsboard', ['http://tb', 'https://tb', 'ws://tb/ws', 'wss://tb/ws']],
    ['influx', ['http://influx:8086', 'https://influx']],
    ['http', ['http://logger/api', 'https://logger/api']],
    ['file', ['https://f/run.csv', 'lib://data/run.csv', 'data/run.csv']],
  ])('accepts each allowed %s URL', (adapter, urls) => {
    urls.forEach((url) => {
      const result = transportSchema.safeParse(transportFor(adapter, url));
      expect(result.success).toBe(true);
    });
  });

  it.each([
    ['mqtt', ['https://b', 'tcp://b:1883', 'b:1883/ws', 'broker/ws']],
    ['stomp', ['https://b', 'stomp://b', 'broker/stomp']],
    ['thingsboard', ['mqtt://tb', 'tb/api']],
    ['influx', ['ws://influx', 'influx:8086']],
    ['http', ['ws://logger', 'ftp://logger', 'logger/api']],
    ['file', ['file:///tmp/run.csv', 'ftp://f/run.csv', '//evil/run.csv']],
  ])('refuses a %s URL with another scheme or no host', (adapter, urls) => {
    urls.forEach((url) => {
      const result = transportSchema.safeParse(transportFor(adapter, url));
      expect(result.success).toBe(false);
    });
  });

  it.each(['mqtt', 'stomp', 'thingsboard', 'influx', 'http', 'file'])(
    'refuses script and data URLs on a %s transport',
    (adapter) => {
      ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x'].forEach(
        (url) => {
          const result = transportSchema.safeParse(transportFor(adapter, url));
          expect(result.success).toBe(false);
        },
      );
    },
  );

  it('keeps the MQTT url required', () => {
    const transport = { adapter: 'mqtt', topics: ['a'] };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });

  it('refuses more than 1000 topics', () => {
    const topics = Array.from({ length: 1001 }, (_, i) => `t/${i}`);
    const transport = { adapter: 'mqtt', url: 'wss://b/ws', topics };
    expect(transportSchema.safeParse(transport).success).toBe(false);
  });
});
