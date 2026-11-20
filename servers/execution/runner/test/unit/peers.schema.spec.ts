import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import { configSchema } from 'src/config/config.schema';
import { newCaller } from 'test/sign.util';

const KEY = newCaller('hospital-3').publicKey;

const hospital2 = {
  id: 'hospital-2',
  topic: 'dtaas/hospital-2',
  url: 'http://localhost:5200',
  attributes: { distance: 12.4 },
};

const valid = {
  id: 'hospital-1',
  port: 5000,
  location: 'scripts',
  commands: ['create'],
  mqtt: { url: 'mqtt://127.0.0.1:18830', topic: 'dtaas/hospital-1' },
  peers: [hospital2],
};

const withPeers = (...peers: unknown[]) => ({ ...valid, peers });

// The message that names every problem of an invalid configuration
function problems(config: unknown): string {
  const result = configSchema.safeParse(config);
  return result.success ? '' : z.prettifyError(result.error);
}

describe('Peers in the runner configuration', () => {
  it('Should accept the example and default enabled', () => {
    expect(configSchema.parse(valid).peers).toEqual([
      { ...hospital2, enabled: true },
    ]);
  });

  it('Should default the peers to none', () => {
    expect(configSchema.parse({ ...valid, peers: undefined }).peers).toEqual(
      [],
    );
  });

  it('Should accept a peer with only a url, a key and no attributes', () => {
    const peer = { id: 'hospital-3', url: 'https://h3', publicKey: KEY };

    expect(configSchema.parse(withPeers(peer)).peers).toEqual([
      { ...peer, attributes: {}, enabled: true },
    ]);
  });

  it.each([
    ['a peer without topic and url', { id: 'h-3' }, /topic or a url/],
    [
      'an invalid topic',
      { id: 'h-3', topic: 'dtaas/#' },
      /wildcards[\s\S]*at peers\[0\].topic/,
    ],
    ['an invalid url', { id: 'h-3', url: 'mqtt://h3' }, /at peers\[0\].url/],
    [
      'a nested attribute',
      { ...hospital2, attributes: { ward: { beds: 1 } } },
      /at peers\[0\].attributes.ward/,
    ],
    [
      'an unknown key',
      { ...hospital2, distance: 12 },
      /Unrecognized key[\s\S]*distance/,
    ],
    ['an invalid id', { ...hospital2, id: '../h' }, /at peers\[0\].id/],
    [
      'an invalid key',
      { ...hospital2, publicKey: 'key' },
      /at peers\[0\].publicKey/,
    ],
  ])('Should refuse %s', (_, peer, message) => {
    expect(problems(withPeers(peer))).toMatch(message);
  });

  it('Should refuse a duplicate id and a duplicate topic', () => {
    const message = problems(
      withPeers(
        hospital2,
        { ...hospital2, topic: 'dtaas/h3' },
        {
          id: 'hospital-4',
          topic: 'dtaas/hospital-2',
        },
      ),
    );

    expect(message).toMatch(/duplicate peer hospital-2[\s\S]*at peers\[1\].id/);
    expect(message).toMatch(
      /duplicate peer topic dtaas\/hospital-2[\s\S]*at peers\[2\].topic/,
    );
  });

  it('Should refuse the runner itself by id or topic', () => {
    const message = problems(
      withPeers(
        { id: 'hospital-1', url: 'http://localhost:5100' },
        { id: 'hospital-3', topic: 'dtaas/hospital-1' },
      ),
    );

    expect(message).toMatch(/the runner itself[\s\S]*at peers\[0\].id/);
    expect(message).toMatch(/the runner itself[\s\S]*at peers\[1\].topic/);
  });

  it('Should take a peer topic without an mqtt section', () => {
    const config = { ...valid, mqtt: undefined };

    expect(configSchema.safeParse(config).success).toBe(true);
  });
});
